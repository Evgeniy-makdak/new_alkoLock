/**
 * Постобработка PDF выгрузки — только безопасные правки:
 * - `__` → « -> », `_` между кириллицей → пробел (латинскую «B» в Identity не трогаем)
 * - кегль заголовков/тела, F3 (Bold) → F1
 * - ISO-даты (split / single Tj) → формат как в гриде
 *
 * НЕ перекодируем и не подменяем текст ячеек (это давало кракозябры и наложения).
 * Сортировку PDF даёт клиентский reorder строк без перекодирования (опционально).
 */

import {
  formatReportExportDateCell,
  type ReportExportDateColumn,
} from './buildReportExportPlan';
import type { ReportDateTimePrecision } from './formatReportTableDateTime';
import {
  compareReportExportCellValues,
  type ReportExportSortSpec,
} from './reportExportSortSpec';

/** Alias `_` в Identity-H у бэка часто как U+0042; пробел — U+0003. */
const PDF_SPACE = new Uint8Array([0x00, 0x03]);
const PDF_ARROW = new Uint8Array([0x00, 0x03, 0x00, 0x2d, 0x00, 0x3e, 0x00, 0x03]);
const PDF_DOUBLE_UNDERSCORE = new Uint8Array([0x00, 0x42, 0x00, 0x42]);

const PDF_SPLIT_ISO_DATE_RE =
  /\((\d{4}-\d{2}-)\)Tj\r?\n1 0 0 1 [\d.]+ [\d.]+ Tm\r?\n\(([^)]*)\)Tj\r?\n1 0 0 1 [\d.]+ [\d.]+ Tm\r?\n\(([^)]*)\)Tj/g;

const PDF_SINGLE_ISO_DATE_RE =
  /\((\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\)Tj/g;

export type PolishReportExportPdfOptions = {
  dateColumns?: ReportExportDateColumn[];
  sortSpec?: ReportExportSortSpec | null;
};

async function inflateZlib(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream is not available');
  }
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  if (!needle.length || needle.length > haystack.length) return -1;
  outer: for (let i = from; i <= haystack.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function replaceBytes(src: Uint8Array, from: Uint8Array, to: Uint8Array): Uint8Array {
  if (!from.length) return src;
  const parts: Uint8Array[] = [];
  let pos = 0;
  let found = indexOfBytes(src, from, pos);
  if (found < 0) return src;
  while (found >= 0) {
    parts.push(src.subarray(pos, found));
    parts.push(to);
    pos = found + from.length;
    found = indexOfBytes(src, from, pos);
  }
  parts.push(src.subarray(pos));
  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * `_` → пробел только рядом с кириллической парой `\x03xx`
 * (иначе ломается латинская «B» = `\x00\x42` в Identity-H).
 */
function replaceAliasUnderscoresSafe(src: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < src.length; i += 1) {
    if (i + 1 < src.length && src[i] === 0x00 && src[i + 1] === 0x42) {
      const prevIsCyr = i >= 2 && src[i - 2] === 0x03;
      const nextIsCyr = i + 3 < src.length && src[i + 2] === 0x03;
      if (prevIsCyr || nextIsCyr) {
        out.push(PDF_SPACE[0]!, PDF_SPACE[1]!);
        i += 1;
        continue;
      }
    }
    out.push(src[i]!);
  }
  return new Uint8Array(out);
}

function decodeAscii(bytes: Uint8Array, start = 0, end = bytes.length): string {
  let s = '';
  for (let i = start; i < end; i += 1) s += String.fromCharCode(bytes[i] ?? 0);
  return s;
}

function encodeAscii(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    out[i] = text.charCodeAt(i) & 0xff;
  }
  return out;
}

function escapePdfLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pickPdfDatePrecision(
  dateColumns: ReportExportDateColumn[] | undefined,
): ReportDateTimePrecision {
  if (!dateColumns?.length) return 'minute';
  if (dateColumns.some((col) => col.precision === 'second')) return 'second';
  if (dateColumns.every((col) => col.precision === 'day')) return 'day';
  return 'minute';
}

function polishPdfContentBytes(
  raw: Uint8Array,
  datePrecision: ReportDateTimePrecision,
): Uint8Array {
  // 1) стрелка и пробелы в alias (без порчи латинской B)
  let out = replaceBytes(raw, PDF_DOUBLE_UNDERSCORE, PDF_ARROW);
  out = replaceAliasUnderscoresSafe(out);

  // 2) кегль / bold / даты — только ASCII-операторы и ISO
  let text = decodeAscii(out);
  text = text.replace(/\/F2 16 Tf/g, '/F2 6 Tf');
  text = text.replace(/\/F2 9 Tf/g, '/F2 6 Tf');
  text = text.replace(/\/F3 [\d.]+ Tf/g, '/F1 6 Tf');
  // На случай уже уменьшенного кегля прошлой polish
  text = text.replace(/\/F2 7 Tf/g, '/F2 6 Tf');
  text = text.replace(/\/F1 7 Tf/g, '/F1 6 Tf');

  text = text.replace(PDF_SPLIT_ISO_DATE_RE, (_full, p1: string, p2: string, p3: string) => {
    const iso = `${p1}${p2}${p3}`;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(iso)) return _full;
    return `(${escapePdfLiteral(formatReportExportDateCell(iso, datePrecision))})Tj`;
  });

  text = text.replace(PDF_SINGLE_ISO_DATE_RE, (_full, iso: string) => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(iso)) return _full;
    return `(${escapePdfLiteral(formatReportExportDateCell(iso, datePrecision))})Tj`;
  });

  return encodeAscii(text);
}

/** Декод Tj inner для ключа сортировки (без записи обратно). */
function decodePdfTjInnerForSort(inner: string): string {
  const bytes = encodeAscii(inner);
  let hasIdentity = false;
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0x00 || bytes[i] === 0x03) {
      hasIdentity = true;
      break;
    }
  }
  if (!hasIdentity) return inner;
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const cp = ((bytes[i] ?? 0) << 8) | (bytes[i + 1] ?? 0);
    if (cp === 0x03) out += ' ';
    else if (cp < 0x80) out += String.fromCharCode(cp);
    else if (cp >= 0x300 && cp <= 0x4ff) out += String.fromCharCode(cp + 0x4f);
  }
  return out;
}

/**
 * Сортировка строк PDF без перекодирования: двигаем готовые фрагменты операторов
 * между Y-слотами (текст/кодировка бэка сохраняются).
 */
function sortPdfContentByMovingRows(text: string, sortSpec: ReportExportSortSpec): string {
  const blockRe =
    /1 0 0 1 ([\d.]+) ([\d.]+) Tm\r?\n(?:\/F\d+ [\d.]+ Tf\r?\n)?\((?:\\.|[^\\)])*\)Tj/g;
  type Hit = { y: number; x: number; index: number; text: string };
  const hits: Hit[] = [];
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(text))) {
    const lit = m[0].match(/\((?:\\.|[^\\)])*\)Tj/)?.[0] ?? '';
    const inner = lit.slice(1, lit.lastIndexOf(')Tj'));
    hits.push({
      y: Number(m[2]),
      x: Number(m[1]),
      index: m.index,
      text: decodePdfTjInnerForSort(inner),
    });
  }
  if (hits.length < 4) return text;

  const ys = [...new Set(hits.map((h) => h.y))].sort((a, b) => b - a);
  if (ys.length < 3) return text;
  const headerYs = new Set(ys.slice(0, Math.min(2, ys.length - 1)));
  const dataYs = ys.filter((y) => !headerYs.has(y));
  if (dataYs.length < 2) return text;

  // Границы фрагментов строки: от первого вхождения Y до следующего data Y
  const yStart = new Map<number, number>();
  for (const h of hits) {
    if (headerYs.has(h.y)) continue;
    const prev = yStart.get(h.y);
    if (prev == null || h.index < prev) yStart.set(h.y, h.index);
  }
  // Также учитываем rect на той же Y
  const reRe = /[\d.]+ ([\d.]+) [\d.]+ [\d.]+ re/g;
  while ((m = reRe.exec(text))) {
    const y = Number(m[1]);
    if (!yStart.has(y)) continue;
    const prev = yStart.get(y)!;
    if (m.index < prev) yStart.set(y, m.index);
  }

  const orderedYs = [...yStart.entries()].sort((a, b) => b[0] - a[0]);
  if (orderedYs.length < 2) return text;

  const firstStart = orderedYs[0]![1];
  const prefix = text.slice(0, firstStart);
  const fragments: { y: number; key: string; body: string }[] = [];
  for (let i = 0; i < orderedYs.length; i += 1) {
    const [y, start] = orderedYs[i]!;
    const end = i + 1 < orderedYs.length ? orderedYs[i + 1]![1] : text.length;
    const body = text.slice(start, end);
    const rowHits = hits.filter((h) => h.y === y).sort((a, b) => a.x - b.x);
    const key = rowHits[sortSpec.columnIndex]?.text ?? rowHits[0]?.text ?? '';
    fragments.push({ y, key, body });
  }

  const sign = sortSpec.direction === 'ASC' ? 1 : -1;
  const sorted = fragments
    .slice()
    .sort((a, b) => sign * compareReportExportCellValues(a.key, b.key));

  const slotYs = fragments.map((f) => f.y);
  const remapped = sorted.map((frag, i) => remapPdfFragmentY(frag.body, frag.y, slotYs[i]!));
  return prefix + remapped.join('');
}

function remapPdfFragmentY(fragment: string, fromY: number, toY: number): string {
  if (fromY === toY) return fragment;
  const from = String(fromY);
  const to = String(toY);
  const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let out = fragment.replace(new RegExp(`(1 0 0 1 [\\d.]+) ${esc} Tm`, 'g'), `$1 ${to} Tm`);
  out = out.replace(new RegExp(`([\\d.]+) ${esc} ([\\d.]+ [\\d.]+ re)`, 'g'), `$1 ${to} $2`);
  return out;
}

function isPdfFontOrBinaryStream(dec: Uint8Array): boolean {
  if (dec.length >= 4) {
    if (dec[0] === 0x00 && dec[1] === 0x01 && dec[2] === 0x00 && dec[3] === 0x00) {
      return true;
    }
    const head = String.fromCharCode(dec[0], dec[1], dec[2], dec[3]);
    if (head === 'OTTO' || head === 'true' || head === 'ttcf') return true;
  }
  return false;
}

function isPdfTextContentStream(dec: Uint8Array): boolean {
  if (isPdfFontOrBinaryStream(dec)) return false;
  const sampleLen = Math.min(dec.length, 8000);
  for (let i = 0; i < sampleLen - 1; i += 1) {
    if (dec[i] === 0x54 && (dec[i + 1] === 0x6a || dec[i + 1] === 0x4a)) return true;
  }
  return false;
}

type PdfObjectSlice = { objNum: number; start: number; end: number };

function listPdfObjects(bytes: Uint8Array): PdfObjectSlice[] {
  const objects: PdfObjectSlice[] = [];
  const re = /(\d+) 0 obj/g;
  const asText = decodeAscii(bytes);
  let match: RegExpExecArray | null;
  const starts: { objNum: number; start: number }[] = [];
  while ((match = re.exec(asText))) {
    starts.push({ objNum: Number(match[1]), start: match.index });
  }
  for (let i = 0; i < starts.length; i += 1) {
    const cur = starts[i]!;
    const nextStart = starts[i + 1]?.start ?? asText.length;
    const endObj = asText.indexOf('endobj', cur.start);
    const end = endObj >= 0 && endObj < nextStart ? endObj + 'endobj'.length : nextStart;
    objects.push({ objNum: cur.objNum, start: cur.start, end });
  }
  return objects;
}

function rebuildPdfWithXref(
  bodyWithoutXref: Uint8Array,
  trailerDict: string,
  objectStarts: Map<number, number>,
): Uint8Array {
  const maxObj = Math.max(0, ...objectStarts.keys());
  const size = maxObj + 1;
  const lines = ['xref', `0 ${size}`, '0000000000 65535 f '];
  for (let i = 1; i < size; i += 1) {
    const offset = objectStarts.get(i);
    lines.push(
      offset == null
        ? '0000000000 65535 f '
        : `${String(offset).padStart(10, '0')} 00000 n `,
    );
  }
  const xref = new TextEncoder().encode(`${lines.join('\n')}\n`);
  let trailer = trailerDict.replace(/\/Size\s+\d+/, `/Size ${size}`);
  if (!/\/Size\s+\d+/.test(trailer)) {
    trailer = trailer.replace(/<<\s*/, `<< /Size ${size} `);
  }
  const startxref = bodyWithoutXref.length;
  const tail = new TextEncoder().encode(
    `trailer\n${trailer}\nstartxref\n${startxref}\n%%EOF\n`,
  );
  const out = new Uint8Array(bodyWithoutXref.length + xref.length + tail.length);
  out.set(bodyWithoutXref, 0);
  out.set(xref, bodyWithoutXref.length);
  out.set(tail, bodyWithoutXref.length + xref.length);
  return out;
}

function rebuildUnfilteredStreamObject(
  objText: string,
  objBytes: Uint8Array,
  streamIdx: number,
  endStreamIdx: number,
  polished: Uint8Array,
): Uint8Array {
  let header = objText.slice(0, streamIdx);
  header = header.replace(/\/Filter\s*\/FlateDecode\s*/g, '');
  header = header.replace(/\/Filter\s*\[\s*\/FlateDecode\s*\]\s*/g, '');
  header = header.replace(/\/Length\s+\d+/, `/Length ${polished.length}`);
  if (!/\/Length\s+\d+/.test(header)) {
    header = header.replace(/<<\s*/, `<< /Length ${polished.length} `);
  }

  const headBytes = encodeAscii(header);
  const mid = encodeAscii('stream\n');
  const end = encodeAscii('\nendstream\n');
  const endobjIdx = objText.indexOf('endobj', endStreamIdx);
  const afterEnd =
    endobjIdx >= 0 ? objBytes.subarray(endobjIdx) : encodeAscii('endobj');

  const rebuilt = new Uint8Array(
    headBytes.length + mid.length + polished.length + end.length + afterEnd.length,
  );
  let o = 0;
  rebuilt.set(headBytes, o);
  o += headBytes.length;
  rebuilt.set(mid, o);
  o += mid.length;
  rebuilt.set(polished, o);
  o += polished.length;
  rebuilt.set(end, o);
  o += end.length;
  rebuilt.set(afterEnd, o);
  return rebuilt;
}

/**
 * Безопасная постобработка PDF. При ошибке — исходный blob.
 */
export async function polishReportExportPdf(
  blob: Blob,
  options: PolishReportExportPdfOptions = {},
): Promise<Blob> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const asText = decodeAscii(bytes);
    const xrefAt = asText.lastIndexOf('\nxref\n');
    const xrefPos = xrefAt >= 0 ? xrefAt + 1 : asText.lastIndexOf('xref\n');
    if (xrefPos < 0) return blob;

    const trailerMatch = asText.slice(xrefPos).match(/trailer\s*(<<[\s\S]*?>>)\s*startxref/);
    if (!trailerMatch) return blob;
    const trailerDict = trailerMatch[1] ?? '<<>>';
    const datePrecision = pickPdfDatePrecision(options.dateColumns);
    const sortSpec = options.sortSpec ?? null;

    // Сначала polish всех content-stream в строки (для глобальной сортировки между страницами).
    type ContentSlot = {
      obj: PdfObjectSlice;
      objText: string;
      objBytes: Uint8Array;
      streamIdx: number;
      endStreamIdx: number;
      hasFlate: boolean;
      text: string;
    };
    const contentSlots: ContentSlot[] = [];
    const objects = listPdfObjects(bytes.subarray(0, xrefPos));

    for (const obj of objects) {
      const objBytes = bytes.subarray(obj.start, obj.end);
      const objText = decodeAscii(objBytes);
      const hasFlate =
        /\/Filter\s*\/FlateDecode/.test(objText) || /\/Filter\s*\[\s*\/FlateDecode/.test(objText);
      const streamIdx = objText.search(/stream\r?\n/);
      const endStreamIdx = objText.lastIndexOf('endstream');
      if (streamIdx < 0 || endStreamIdx < 0) continue;

      const afterStreamKeyword =
        streamIdx + (objText.slice(streamIdx).startsWith('stream\r\n') ? 8 : 7);
      let raw = objBytes.subarray(afterStreamKeyword, endStreamIdx);
      if (raw.length && raw[raw.length - 1] === 0x0a) {
        raw = raw.subarray(
          0,
          raw.length - (raw.length > 1 && raw[raw.length - 2] === 0x0d ? 2 : 1),
        );
      }

      let decoded: Uint8Array;
      if (hasFlate) {
        try {
          decoded = await inflateZlib(raw);
        } catch {
          continue;
        }
      } else {
        decoded = raw;
      }
      if (!isPdfTextContentStream(decoded)) continue;

      const polished = polishPdfContentBytes(decoded, datePrecision);
      contentSlots.push({
        obj,
        objText,
        objBytes,
        streamIdx,
        endStreamIdx,
        hasFlate,
        text: decodeAscii(polished),
      });
    }

    // Сортировка внутри каждой страницы без перекодирования текста.
    // (Глобальный перенос строк между страницами бэка ломает рамки — не делаем.)
    if (sortSpec) {
      for (const slot of contentSlots) {
        slot.text = sortPdfContentByMovingRows(slot.text, sortSpec);
      }
    }

    const polishedByObjStart = new Map<number, ContentSlot>();
    for (const slot of contentSlots) {
      polishedByObjStart.set(slot.obj.start, slot);
    }

    const parts: Uint8Array[] = [];
    let cursor = 0;
    let changed = false;

    for (const obj of objects) {
      if (obj.start > cursor) {
        parts.push(bytes.subarray(cursor, obj.start));
      }
      const slot = polishedByObjStart.get(obj.start);
      if (!slot) {
        parts.push(bytes.subarray(obj.start, obj.end));
        cursor = obj.end;
        continue;
      }

      const polishedBytes = encodeAscii(slot.text);
      // Исходный compressed без текстовых правок — можно оставить, если байты совпали
      // и не было sort; проще всегда писать unfiltered после наших правок.
      parts.push(
        rebuildUnfilteredStreamObject(
          slot.objText,
          slot.objBytes,
          slot.streamIdx,
          slot.endStreamIdx,
          polishedBytes,
        ),
      );
      changed = true;
      cursor = obj.end;
    }

    if (!changed) return blob;
    if (cursor < xrefPos) {
      parts.push(bytes.subarray(cursor, xrefPos));
    }

    let total = 0;
    for (const p of parts) total += p.length;
    let body = new Uint8Array(total);
    let off = 0;
    for (const p of parts) {
      body.set(p, off);
      off += p.length;
    }
    if (body.length === 0 || body[body.length - 1] !== 0x0a) {
      const withNl = new Uint8Array(body.length + 1);
      withNl.set(body);
      withNl[body.length] = 0x0a;
      body = withNl;
    }

    const objectStarts = new Map<number, number>();
    const bodyText = decodeAscii(body);
    const objRe = /(\d+) 0 obj/g;
    let om: RegExpExecArray | null;
    while ((om = objRe.exec(bodyText))) {
      objectStarts.set(Number(om[1]), om.index);
    }

    const out = rebuildPdfWithXref(body, trailerDict, objectStarts);
    const copy = new Uint8Array(out.byteLength);
    copy.set(out);
    return new Blob([copy], { type: 'application/pdf' });
  } catch {
    return blob;
  }
}
