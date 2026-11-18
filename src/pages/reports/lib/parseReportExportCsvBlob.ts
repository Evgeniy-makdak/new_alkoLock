/**
 * Разбор UTF-16LE TAB-CSV после polishReportExportBlob(CSV).
 */

export async function parseReportExportCsvBlob(
  blob: Blob,
): Promise<{ headers: string[]; rows: string[][] }> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let offset = 0;
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    offset = 2;
  }
  const decoded = new TextDecoder('utf-16le').decode(buffer.subarray(offset));
  const lines = decoded.split(/\r?\n/).filter((line) => line.length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const parsed = lines.map(parseTabCsvLine);
  const headers = parsed[0] ?? [];
  const rows = parsed.slice(1);
  return { headers, rows };
}

function parseTabCsvLine(line: string): string[] {
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
    if (ch === '\t' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}
