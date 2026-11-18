/**
 * Клиентская генерация PDF-таблицы отчёта (canvas → JPEG-страницы в PDF).
 * Заголовки/ячейки как в UI: перенос по словам и « -> », без наложений и mid-word break.
 */

export type BuildReportTablePdfInput = {
  headers: string[];
  rows: string[][];
  title?: string;
};

/** A4 landscape в PDF points. */
const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 28;
const SCALE = 2; // retina для чёткости
const HEADER_FONT = 10;
const BODY_FONT = 9;
const TITLE_FONT = 12;
const CELL_PAD_X = 6;
const CELL_PAD_Y = 4;
const LINE_GAP = 2;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const raw = (text ?? '').trim() || '—';
  if (maxWidth <= 8) return [raw];

  // Сначала режем по « -> », чтобы стрелка оставалась разделителем.
  const arrowParts = raw.split(/(\s*->\s*)/);
  const tokens: string[] = [];
  for (const part of arrowParts) {
    if (!part) continue;
    if (/^\s*->\s*$/.test(part)) {
      tokens.push('->');
      continue;
    }
    for (const word of part.split(/\s+/)) {
      if (word) tokens.push(word);
    }
  }

  const lines: string[] = [];
  let current = '';
  const push = () => {
    if (current) lines.push(current);
    current = '';
  };

  for (const token of tokens) {
    const candidate = current ? `${current} ${token}` : token;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) push();
    if (ctx.measureText(token).width <= maxWidth) {
      current = token;
      continue;
    }
    // Слишком длинное слово без пробелов — режем по символам (крайний случай).
    let chunk = '';
    for (const ch of token) {
      const next = chunk + ch;
      if (ctx.measureText(next).width <= maxWidth) {
        chunk = next;
      } else {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    current = chunk;
  }
  push();
  return lines.length ? lines : ['—'];
}

function measureRowHeight(
  ctx: CanvasRenderingContext2D,
  cells: string[],
  colWidths: number[],
  fontPx: number,
  bold: boolean,
): number {
  // `bold`/`normal` — надёжнее, чем 600/400: иначе заголовки в JPEG выглядят как regular.
  ctx.font = `${bold ? 'bold' : 'normal'} ${fontPx}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
  let maxLines = 1;
  for (let i = 0; i < cells.length; i += 1) {
    const lines = wrapText(ctx, cells[i] ?? '', colWidths[i]! - CELL_PAD_X * 2);
    maxLines = Math.max(maxLines, lines.length);
  }
  return CELL_PAD_Y * 2 + maxLines * fontPx + (maxLines - 1) * LINE_GAP;
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  cells: string[],
  colWidths: number[],
  x0: number,
  y0: number,
  rowH: number,
  fontPx: number,
  bold: boolean,
  fill: string | null,
): void {
  let x = x0;
  ctx.font = `${bold ? 'bold' : 'normal'} ${fontPx}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'top';

  for (let i = 0; i < cells.length; i += 1) {
    const w = colWidths[i]!;
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y0, w, rowH);
    }
    ctx.strokeStyle = '#9e9e9e';
    ctx.lineWidth = 0.75;
    ctx.strokeRect(x, y0, w, rowH);

    const lines = wrapText(ctx, cells[i] ?? '', w - CELL_PAD_X * 2);
    ctx.fillStyle = '#212121';
    let ty = y0 + CELL_PAD_Y;
    // Клип по ячейке — текст не залезает в соседнюю.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 1, y0 + 1, w - 2, rowH - 2);
    ctx.clip();
    for (const line of lines) {
      ctx.fillText(line, x + CELL_PAD_X, ty);
      // Синтетический bold на случай, если bold-начертание шрифта недоступно в canvas.
      if (bold) {
        ctx.fillText(line, x + CELL_PAD_X + 0.35, ty);
      }
      ty += fontPx + LINE_GAP;
    }
    ctx.restore();
    x += w;
  }
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas toBlob failed'))),
      'image/jpeg',
      0.92,
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

function buildPdfFromJpegPagesSimple(
  pages: { width: number; height: number; jpeg: Uint8Array }[],
): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const objOffsets: number[] = [0];
  let offset = 0;

  const write = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    offset += bytes.length;
  };
  const beginObj = (num: number) => {
    objOffsets[num] = offset;
    write(`${num} 0 obj\n`);
  };
  const endObj = () => write('endobj\n');

  write('%PDF-1.4\n');

  const pageCount = pages.length;
  const pageObjs: number[] = [];
  // Layout: 1=catalog 2=pages; each page triplet starting at 3
  for (let i = 0; i < pageCount; i += 1) pageObjs.push(3 + i * 3);

  beginObj(1);
  write('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObj();

  beginObj(2);
  write(
    `<< /Type /Pages /Kids [${pageObjs.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageCount} >>\n`,
  );
  endObj();

  for (let i = 0; i < pageCount; i += 1) {
    const pageObj = pageObjs[i]!;
    const contentsObj = pageObj + 1;
    const imageObj = pageObj + 2;
    const jpeg = pages[i]!.jpeg;
    const content = enc.encode(
      `q\n${PAGE_W} 0 0 ${PAGE_H} 0 0 cm\n/Im${i} Do\nQ\n`,
    );

    beginObj(pageObj);
    write(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentsObj} 0 R /Resources << /XObject << /Im${i} ${imageObj} 0 R >> >> >>\n`,
    );
    endObj();

    beginObj(contentsObj);
    write(`<< /Length ${content.length} >>\nstream\n`);
    write(content);
    write('endstream\n');
    endObj();

    beginObj(imageObj);
    write(
      `<< /Type /XObject /Subtype /Image /Width ${pages[i]!.width} /Height ${pages[i]!.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    );
    write(jpeg);
    write('\nendstream\n');
    endObj();
  }

  const xrefPos = offset;
  const maxObj = 2 + pageCount * 3;
  write(`xref\n0 ${maxObj + 1}\n`);
  write('0000000000 65535 f \n');
  for (let i = 1; i <= maxObj; i += 1) {
    write(`${String(objOffsets[i] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  write(`trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  // Concat
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  const copy = new Uint8Array(out.byteLength);
  copy.set(out);
  return new Blob([copy], { type: 'application/pdf' });
}

/**
 * Строит читаемый PDF-отчёт: заголовки с « -> », даты/сортировка уже в rows.
 */
export async function buildReportTablePdfFromRows(
  input: BuildReportTablePdfInput,
): Promise<Blob> {
  const headers = input.headers.map((h) => (h ?? '').trim() || '—');
  const rows = input.rows;
  const colCount = Math.max(headers.length, 1);

  const tableW = PAGE_W - MARGIN * 2;
  const colW = tableW / colCount;
  const colWidths = Array.from({ length: colCount }, () => colW);

  // Offscreen canvas in CSS pixels (= PDF points * SCALE)
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PAGE_W * SCALE);
  canvas.height = Math.round(PAGE_H * SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true;

  const clearPage = (pageTitle: string) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.fillStyle = '#212121';
    ctx.font = `600 ${TITLE_FONT}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
    ctx.textBaseline = 'top';
    if (pageTitle) ctx.fillText(pageTitle, MARGIN, 14);
  };

  const title = (input.title ?? '').trim() || 'Отчёт';
  const pagesJpeg: { width: number; height: number; jpeg: Uint8Array }[] = [];

  let y = MARGIN + 22;
  const startPage = () => {
    clearPage(title);
    y = MARGIN + 22;
    const headerH = measureRowHeight(ctx, headers, colWidths, HEADER_FONT, true);
    drawRow(ctx, headers, colWidths, MARGIN, y, headerH, HEADER_FONT, true, '#e0e0e0');
    y += headerH;
  };

  startPage();

  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r] ?? [];
    const cells = headers.map((_, i) => row[i] ?? '—');
    const rowH = measureRowHeight(ctx, cells, colWidths, BODY_FONT, false);
    if (y + rowH > PAGE_H - MARGIN) {
      // flush page
      pagesJpeg.push({
        width: canvas.width,
        height: canvas.height,
        jpeg: await canvasToJpegBytes(canvas),
      });
      startPage();
    }
    const fill = r % 2 === 0 ? '#fafafa' : '#ffffff';
    drawRow(ctx, cells, colWidths, MARGIN, y, rowH, BODY_FONT, false, fill);
    y += rowH;
  }

  pagesJpeg.push({
    width: canvas.width,
    height: canvas.height,
    jpeg: await canvasToJpegBytes(canvas),
  });

  return buildPdfFromJpegPagesSimple(pagesJpeg);
}
