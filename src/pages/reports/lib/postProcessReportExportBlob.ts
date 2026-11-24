import type { ReportExportFormat } from '../api/reportsApi';
import {
  formatReportExportDateCell,
  type ReportExportDateColumn,
} from './buildReportExportPlan';
import { polishReportExportPdf } from './polishReportExportPdf';
import {
  compareReportExportCellValues,
  sortReportExportRows,
  type ReportExportSortSpec,
} from './reportExportSortSpec';
import {
  readZipEntries,
  writeZipStore,
  zipEntryText,
  zipSetText,
} from './reportExportZip';

type PolishOptions = {
  displayHeaders: string[];
  dateColumns: ReportExportDateColumn[];
  /**
   * Устаревший fallback: localeCompare по колонке.
   * Предпочитать orderedRows (/query sort = UI).
   */
  sortSpec?: ReportExportSortSpec | null;
  /**
   * Строки уже в порядке UI (/query + pageable.sort).
   * XLS: перестановка row XML; CSV лучше собирать через buildReportExportCsvBlob.
   */
  orderedRows?: string[][] | null;
};

/** Дата-и-время с бэка. */
const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
/** Дата-без-времени (DATE) — только вместе с precision=day. */
const ISO_DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Excel (в т.ч. macOS) стабильно открывает UTF-16LE + BOM; UTF-8 часто читает как Mac Cyrillic. */
function csvTextToUtf16LeBlob(text: string): Blob {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const bom = new Uint8Array([0xff, 0xfe]);
  const body = new Uint16Array(clean.length);
  for (let i = 0; i < clean.length; i += 1) {
    body[i] = clean.charCodeAt(i);
  }
  return new Blob([bom, body], { type: 'text/csv;charset=utf-16le;' });
}

function precisionByIndex(
  dateColumns: ReportExportDateColumn[],
): Map<number, ReportExportDateColumn['precision']> {
  const map = new Map<number, ReportExportDateColumn['precision']>();
  for (const col of dateColumns) {
    map.set(col.index, col.precision);
  }
  return map;
}

/**
 * CSV: читаем `;`/`,` с бэка, правим заголовки/даты, отдаём TAB —
 * Excel при UTF-16LE иначе кладёт всю строку в один столбец.
 */
function polishCsv(text: string, options: PolishOptions): string {
  const lines = text.split(/\r?\n/);
  if (!lines.length) return text;

  let headerLine = lines[0] ?? '';
  if (headerLine.charCodeAt(0) === 0xfeff) {
    headerLine = headerLine.slice(1);
  }

  const sep = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ',';
  const headerCount = splitCsvLine(headerLine, sep).length;
  const headers =
    options.displayHeaders.length === headerCount
      ? options.displayHeaders
      : options.displayHeaders.slice(0, headerCount);

  const polishedRows: string[][] = [];

  if (headers.length) {
    polishedRows.push([...headers]);
  } else {
    polishedRows.push(splitCsvLine(headerLine, sep).map(unquoteCsvCell));
  }

  const precisionMap = precisionByIndex(options.dateColumns);
  const dataRows: string[][] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const cells = splitCsvLine(line, sep).map(unquoteCsvCell);
    for (const [index, precision] of precisionMap) {
      if (index < 0 || index >= cells.length) continue;
      const raw = cells[index] ?? '';
      const trimmed = raw.trim();
      const isDateOnly = precision === 'day' && ISO_DATE_ONLY_RE.test(trimmed);
      const isDateTime = ISO_DATE_TIME_RE.test(trimmed);
      if (!isDateOnly && !isDateTime) continue;
      cells[index] = formatReportExportDateCell(raw, precision);
    }
    dataRows.push(cells);
  }

  const sortedData = options.orderedRows?.length
    ? options.orderedRows.map((row) => row.slice())
    : sortReportExportRows(dataRows, options.sortSpec);
  const header = polishedRows[0] ?? [];
  const allRows = [header, ...sortedData];

  // TAB + UTF-16LE → Excel раскладывает по столбцам (`;` в UTF-16LE игнорирует).
  return allRows.map((cells) => cells.map(escapeCsvCellForTab).join('\t')).join('\n');
}

/** CSV как в UI: displayHeaders + строки из /query (без localeCompare). */
export function buildReportExportCsvBlob(
  displayHeaders: string[],
  rows: string[][],
): Blob {
  const allRows = [displayHeaders, ...rows];
  const text = allRows.map((cells) => cells.map(escapeCsvCellForTab).join('\t')).join('\n');
  return csvTextToUtf16LeBlob(text);
}

/** Для TAB-CSV: кавычки только если есть TAB/кавычка/перевод строки. */
function escapeCsvCellForTab(value: string): string {
  if (/[\t"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function unquoteCsvCell(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return value;
}

function splitCsvLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === sep && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

async function polishXlsx(blob: Blob, options: PolishOptions): Promise<Blob> {
  const entries = await readZipEntries(await blob.arrayBuffer());
  const sharedName = 'xl/sharedStrings.xml';
  const sheetName = 'xl/worksheets/sheet1.xml';
  const stylesName = 'xl/styles.xml';

  const sharedXml = zipEntryText(entries.find((e) => e.name === sharedName));
  const sheetXml = zipEntryText(entries.find((e) => e.name === sheetName));
  if (!sharedXml || !sheetXml) {
    return blob;
  }

  let nextSheetXml = sheetXml;
  let nextSharedXml = sharedXml;

  if (options.orderedRows != null && options.displayHeaders.length) {
    // Порядок и значения как в UI (/query) — не localeCompare и не fingerprint /export.
    const rebuilt = rebuildXlsxSheetFromOrderedRows(
      sheetXml,
      options.displayHeaders,
      options.orderedRows,
    );
    nextSharedXml = buildSharedStringsXml(rebuilt.strings);
    nextSheetXml = rebuilt.sheetXml;
  } else {
    const strings = parseSharedStrings(sharedXml);
    const headerRefs = parseHeaderSharedStringIndexes(sheetXml, options.displayHeaders.length);

    for (let i = 0; i < headerRefs.length; i += 1) {
      const label = options.displayHeaders[i];
      const ref = headerRefs[i];
      if (label == null || ref == null || ref < 0 || ref >= strings.length) continue;
      strings[ref] = label;
    }

    const precisionMap = precisionByIndex(options.dateColumns);
    const colToStringIndexes = parseColumnSharedStringIndexes(sheetXml);
    for (const [colIndex, precision] of precisionMap) {
      const indexes = colToStringIndexes.get(colIndex) ?? [];
      for (const idx of indexes) {
        if (headerRefs.includes(idx)) continue;
        const raw = strings[idx] ?? '';
        const trimmed = raw.trim();
        const isDateOnly = precision === 'day' && ISO_DATE_ONLY_RE.test(trimmed);
        const isDateTime = ISO_DATE_TIME_RE.test(trimmed);
        if (!isDateOnly && !isDateTime) continue;
        strings[idx] = formatReportExportDateCell(raw, precision);
      }
    }

    nextSharedXml = buildSharedStringsXml(strings);
    if (options.sortSpec) {
      nextSheetXml = sortXlsxDataRowsWithStrings(
        sheetXml,
        strings,
        options.sortSpec.columnIndex,
        options.sortSpec.direction,
      );
    }
  }

  zipSetText(entries, sharedName, nextSharedXml);

  const stylesXml = zipEntryText(entries.find((e) => e.name === stylesName));
  if (stylesXml) {
    zipSetText(
      entries,
      stylesName,
      ensureHeaderCellStyleIsBold(ensureDataFontNotBold(stylesXml)),
    );
  }
  zipSetText(entries, sheetName, ensureHeaderRowBoldOnly(nextSheetXml));

  return writeZipStore(entries);
}

/**
 * sheetData = только актуальные заголовки + строки /query.
 * Сбрасываем dimension/mergeCells от прежнего /export — иначе Excel
 * показывает «хвосты» прошлого отчёта вместе с новым составом.
 */
function rebuildXlsxSheetFromOrderedRows(
  sheetXml: string,
  displayHeaders: string[],
  orderedRows: string[][],
): { sheetXml: string; strings: string[] } {
  const strings: string[] = [];
  const headerCells = displayHeaders
    .map((label, colIndex) => {
      const idx = strings.length;
      strings.push(label);
      return `<c r="${columnIndexToLetters(colIndex)}1" t="s" s="1"><v>${idx}</v></c>`;
    })
    .join('');
  const rowXmls = [`<row r="1">${headerCells}</row>`];

  for (let r = 0; r < orderedRows.length; r += 1) {
    const rowNum = r + 2;
    const row = orderedRows[r] ?? [];
    const cells = displayHeaders
      .map((_, colIndex) => {
        const idx = strings.length;
        strings.push(row[colIndex] ?? '');
        return `<c r="${columnIndexToLetters(colIndex)}${rowNum}" t="s" s="0"><v>${idx}</v></c>`;
      })
      .join('');
    rowXmls.push(`<row r="${rowNum}">${cells}</row>`);
  }

  const nextSheetData = `<sheetData>${rowXmls.join('')}</sheetData>`;
  let nextSheetXml = sheetXml;
  if (/<sheetData[\s\S]*?<\/sheetData>/.test(nextSheetXml)) {
    nextSheetXml = nextSheetXml.replace(/<sheetData[^>]*>[\s\S]*?<\/sheetData>/, nextSheetData);
  } else if (/<sheetData\b[^>]*\/>/.test(nextSheetXml)) {
    nextSheetXml = nextSheetXml.replace(/<sheetData\b[^>]*\/>/, nextSheetData);
  } else if (/<\/worksheet>/.test(nextSheetXml)) {
    nextSheetXml = nextSheetXml.replace(/<\/worksheet>/, `${nextSheetData}</worksheet>`);
  } else {
    nextSheetXml = nextSheetData;
  }

  const lastCol = columnIndexToLetters(Math.max(displayHeaders.length - 1, 0));
  const lastRow = Math.max(orderedRows.length + 1, 1);
  const dimension = `<dimension ref="A1:${lastCol}${lastRow}"/>`;
  if (/<dimension\b[^>]*\/>/.test(nextSheetXml)) {
    nextSheetXml = nextSheetXml.replace(/<dimension\b[^>]*\/>/, dimension);
  } else if (/<dimension\b[\s\S]*?<\/dimension>/.test(nextSheetXml)) {
    nextSheetXml = nextSheetXml.replace(/<dimension\b[\s\S]*?<\/dimension>/, dimension);
  } else if (/<sheetData\b/.test(nextSheetXml)) {
    nextSheetXml = nextSheetXml.replace(/<sheetData\b/, `${dimension}<sheetData`);
  }

  // Merge/autoFilter от старого листа — источник «остатков» прошлой выгрузки.
  nextSheetXml = nextSheetXml.replace(/<mergeCells\b[\s\S]*?<\/mergeCells>/g, '');
  nextSheetXml = nextSheetXml.replace(/<mergeCells\b[^>]*\/>/g, '');
  nextSheetXml = nextSheetXml.replace(/<autoFilter\b[\s\S]*?<\/autoFilter>/g, '');
  nextSheetXml = nextSheetXml.replace(/<autoFilter\b[^>]*\/>/g, '');

  return { sheetXml: nextSheetXml, strings };
}

function rewriteSheetRows(
  sheetXml: string,
  header: { rowNum: number; xml: string },
  data: { rowNum: number; xml: string }[],
): string {
  const renumbered = [
    header.xml,
    ...data.map((row, index) => {
      const newNum = index + 2;
      return row.xml
        .replace(/<row r="\d+"/, `<row r="${newNum}"`)
        .replace(/\br="([A-Z]+)\d+"/g, (_m, col) => `r="${col}${newNum}"`);
    }),
  ];

  let replaced = 0;
  return sheetXml.replace(/<row r="\d+"[^>]*>[\s\S]*?<\/row>/g, () => {
    const next = renumbered[replaced] ?? '';
    replaced += 1;
    return next;
  });
}

/** Сортировка строк sheet по тексту ячейки (sharedStrings / inline). */
function sortXlsxDataRowsWithStrings(
  sheetXml: string,
  strings: string[],
  columnIndex: number,
  direction: 'ASC' | 'DESC',
): string {
  const rowRe = /<row r="(\d+)"[^>]*>[\s\S]*?<\/row>/g;
  const rows: { rowNum: number; xml: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = rowRe.exec(sheetXml))) {
    rows.push({ rowNum: Number(match[1]), xml: match[0] });
  }
  if (rows.length < 2) return sheetXml;

  const header = rows.find((r) => r.rowNum === 1);
  const data = rows.filter((r) => r.rowNum > 1);
  if (!header || !data.length) return sheetXml;

  const colLetters = columnIndexToLetters(columnIndex);
  const sign = direction === 'ASC' ? 1 : -1;

  const valueOf = (rowXml: string): string => {
    const cellRe = new RegExp(`<c r="${colLetters}\\d+"([^>]*)>([\\s\\S]*?)</c>`);
    const cell = rowXml.match(cellRe);
    if (!cell) return '';
    const attrs = cell[1] ?? '';
    const inner = cell[2] ?? '';
    if (/\bt="s"/.test(attrs)) {
      const v = inner.match(/<v>(\d+)<\/v>/);
      const idx = Number(v?.[1]);
      return Number.isFinite(idx) ? (strings[idx] ?? '') : '';
    }
    if (/\bt="inlineStr"/.test(attrs)) {
      const t = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
      return decodeXml(t?.[1] ?? '');
    }
    const v = inner.match(/<v>([\s\S]*?)<\/v>/);
    return decodeXml(v?.[1] ?? '');
  };

  data.sort((a, b) => sign * compareReportExportCellValues(valueOf(a.xml), valueOf(b.xml)));
  return rewriteSheetRows(sheetXml, header, data);
}

function parseSharedStrings(xml: string): string[] {
  const result: string[] = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;
  while ((match = siRe.exec(xml))) {
    const block = match[1] ?? '';
    const parts = [...block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) =>
      decodeXml(m[1] ?? ''),
    );
    result.push(parts.join(''));
  }
  return result;
}

function buildSharedStringsXml(strings: string[]): string {
  const body = strings
    .map((value) => {
      const needsPreserve = /^\s|\s$/.test(value) || value.includes('\n');
      const attr = needsPreserve ? ' xml:space="preserve"' : '';
      return `<si><t${attr}>${encodeXml(value)}</t></si>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sst count="${strings.length}" uniqueCount="${strings.length}" xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${body}</sst>`;
}

function parseHeaderSharedStringIndexes(sheetXml: string, expectedCount: number): number[] {
  const rowMatch = sheetXml.match(/<row r="1"[^>]*>([\s\S]*?)<\/row>/);
  if (!rowMatch) return [];
  const cells = [
    ...rowMatch[1].matchAll(/<c r="([A-Z]+)1"[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/g),
  ];
  const byCol = new Map<string, number>();
  for (const cell of cells) {
    byCol.set(cell[1], Number(cell[2]));
  }
  const indexes: number[] = [];
  for (let i = 0; i < expectedCount; i += 1) {
    const col = columnIndexToLetters(i);
    const ref = byCol.get(col);
    if (ref != null) indexes.push(ref);
  }
  return indexes;
}

function parseColumnSharedStringIndexes(sheetXml: string): Map<number, number[]> {
  const map = new Map<number, number[]>();
  const cellRe = /<c r="([A-Z]+)(\d+)"[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/g;
  let match: RegExpExecArray | null;
  while ((match = cellRe.exec(sheetXml))) {
    const colLetters = match[1] ?? '';
    const colIndex = lettersToColumnIndex(colLetters);
    const strIndex = Number(match[3]);
    if (!Number.isFinite(colIndex) || !Number.isFinite(strIndex)) continue;
    const list = map.get(colIndex) ?? [];
    list.push(strIndex);
    map.set(colIndex, list);
  }
  return map;
}

function columnIndexToLetters(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function lettersToColumnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

function encodeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

/** Первый font (data) — без bold; bold только у второго (заголовки). */
function ensureDataFontNotBold(stylesXml: string): string {
  return stylesXml.replace(
    /(<fonts[^>]*>)(<font>)([\s\S]*?)(<\/font>)/,
    (_full, fontsOpen, fontOpen, inner, fontClose) => {
      const cleaned = String(inner)
        .replace(/<b\b[^>]*?\/>/g, '')
        .replace(/<b\b[^>]*>\s*<\/b>/g, '');
      return `${fontsOpen}${fontOpen}${cleaned}${fontClose}`;
    },
  );
}

/**
 * Гарантирует: font[1] с <b/>, cellXfs[1] → fontId=1 (ячейки s="1" = заголовок).
 * Точечно для выгрузки; data-стиль s="0" не трогаем по смыслу.
 */
function ensureHeaderCellStyleIsBold(stylesXml: string): string {
  let xml = stylesXml;

  const fontsBlock = xml.match(/<fonts([^>]*)>([\s\S]*?)<\/fonts>/);
  if (fontsBlock) {
    const fontsInner = fontsBlock[2] ?? '';
    const fontTags = [...fontsInner.matchAll(/<font>[\s\S]*?<\/font>/g)].map((m) => m[0]);
    if (fontTags.length === 0) {
      fontTags.push('<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>');
    }
    // data font уже почищен ensureDataFontNotBold
    if (fontTags.length === 1) {
      const boldClone = fontTags[0]!.replace(/<font>/, '<font><b/>');
      fontTags.push(boldClone);
    } else if (!/<b\b/.test(fontTags[1] ?? '')) {
      fontTags[1] = (fontTags[1] ?? '<font></font>').replace(/<font>/, '<font><b/>');
    }
    const count = fontTags.length;
    xml = xml.replace(
      /<fonts[^>]*>[\s\S]*?<\/fonts>/,
      `<fonts count="${count}">${fontTags.join('')}</fonts>`,
    );
  }

  const xfsBlock = xml.match(/<cellXfs([^>]*)>([\s\S]*?)<\/cellXfs>/);
  if (xfsBlock) {
    const xfsInner = xfsBlock[2] ?? '';
    const xfTags = [...xfsInner.matchAll(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g)].map(
      (m) => m[0],
    );
    if (xfTags.length === 0) {
      xfTags.push('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>');
    }
    if (xfTags.length === 1) {
      xfTags.push(
        '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
      );
    } else {
      let headerXf = xfTags[1]!;
      if (/\bfontId="\d+"/.test(headerXf)) {
        headerXf = headerXf.replace(/\bfontId="\d+"/, 'fontId="1"');
      } else {
        headerXf = headerXf.replace(/<xf\b/, '<xf fontId="1"');
      }
      if (/\bapplyFont=/.test(headerXf)) {
        headerXf = headerXf.replace(/\bapplyFont="\d+"/, 'applyFont="1"');
      } else {
        headerXf = headerXf.replace(/<xf\b/, '<xf applyFont="1"');
      }
      xfTags[1] = headerXf;
    }
    xml = xml.replace(
      /<cellXfs[^>]*>[\s\S]*?<\/cellXfs>/,
      `<cellXfs count="${xfTags.length}">${xfTags.join('')}</cellXfs>`,
    );
  }

  return xml;
}

/** Строка 1 → s="1" (header bold), остальные → s="0". */
function ensureHeaderRowBoldOnly(sheetXml: string): string {
  let out = sheetXml.replace(
    /<row r="1"([^>]*)>([\s\S]*?)<\/row>/,
    (_full, attrs, cells) => {
      const nextCells = String(cells).replace(
        /<c r="([A-Z]+1)"([^>]*)>/g,
        (_c, ref, rest) => {
          let cellAttrs = String(rest);
          if (/\bs="/.test(cellAttrs)) {
            cellAttrs = cellAttrs.replace(/\bs="\d+"/, 's="1"');
          } else {
            cellAttrs = `${cellAttrs} s="1"`;
          }
          return `<c r="${ref}"${cellAttrs}>`;
        },
      );
      return `<row r="1"${attrs}>${nextCells}</row>`;
    },
  );

  out = out.replace(/<row r="([2-9]\d*|\d{2,})"[^>]*>([\s\S]*?)<\/row>/g, (full) =>
    full.replace(/<c r="([A-Z]+\d+)"([^>]*)>/g, (_c, ref, rest) => {
      let cellAttrs = String(rest);
      if (/\bs="/.test(cellAttrs)) {
        cellAttrs = cellAttrs.replace(/\bs="\d+"/, 's="0"');
      } else if (/\bt="s"/.test(cellAttrs)) {
        cellAttrs = `${cellAttrs} s="0"`;
      }
      return `<c r="${ref}"${cellAttrs}>`;
    }),
  );

  return out;
}

/**
 * Постобработка blob выгрузки: заголовки/даты/жирность как в таблице на экране.
 * CSV — UTF-16LE (Excel); XLS — sharedStrings/styles; PDF — маркеры alias в content-stream.
 */
export async function polishReportExportBlob(
  blob: Blob,
  format: ReportExportFormat,
  options: PolishOptions,
): Promise<Blob> {
  if (format === 'CSV') {
    if (!options.displayHeaders.length) {
      const text = await blob.text();
      return csvTextToUtf16LeBlob(text);
    }
    const text = await blob.text();
    const polished = polishCsv(text, options);
    return csvTextToUtf16LeBlob(polished);
  }

  if (format === 'XLS') {
    if (!options.displayHeaders.length) return blob;
    try {
      return await polishXlsx(blob, options);
    } catch {
      return blob;
    }
  }

  if (format === 'PDF') {
    // Безопасно: alias/кегль/даты; сортировка — перестановкой фрагментов без перекодирования.
    return polishReportExportPdf(blob, {
      dateColumns: options.dateColumns,
      sortSpec: options.sortSpec,
    });
  }

  return blob;
}
