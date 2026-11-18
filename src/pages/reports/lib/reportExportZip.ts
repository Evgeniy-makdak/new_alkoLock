/**
 * Минимальный ZIP read/write для постобработки XLSX выгрузки.
 * Без внешних зависимостей: inflate через DecompressionStream, запись STORE.
 */

export type ZipEntry = {
  name: string;
  data: Uint8Array;
};

function u16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream is not available');
  }
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const stream = new Blob([copy])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  // EOCD: 22+ bytes at end; comment max 65535.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const min = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= min; i -= 1) {
    if (u32(view, i) === 0x06054b50) return i;
  }
  throw new Error('ZIP EOCD not found');
}

/** Читает ZIP через Central Directory (корректно при data descriptor / flag 0x08). */
export async function readZipEntries(buffer: ArrayBuffer): Promise<ZipEntry[]> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const eocd = findEndOfCentralDirectory(bytes);
  const entryCount = u16(view, eocd + 10);
  let cdOffset = u32(view, eocd + 16);

  const entries: ZipEntry[] = [];
  for (let i = 0; i < entryCount; i += 1) {
    if (u32(view, cdOffset) !== 0x02014b50) {
      throw new Error('Invalid ZIP central directory');
    }
    const compression = u16(view, cdOffset + 10);
    const compSize = u32(view, cdOffset + 20);
    const nameLen = u16(view, cdOffset + 28);
    const extraLen = u16(view, cdOffset + 30);
    const commentLen = u16(view, cdOffset + 32);
    const localHeaderOffset = u32(view, cdOffset + 42);
    const nameStart = cdOffset + 46;
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLen));

    const localNameLen = u16(view, localHeaderOffset + 26);
    const localExtraLen = u16(view, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compData = bytes.subarray(dataStart, dataStart + compSize);

    let data: Uint8Array;
    if (compression === 0) {
      data = compData.slice();
    } else if (compression === 8) {
      data = await inflateRaw(compData);
    } else {
      throw new Error(`Unsupported ZIP compression: ${compression}`);
    }

    entries.push({ name, data });
    cdOffset += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Собирает ZIP с методом STORE (без сжатия). */
export function writeZipStore(entries: ZipEntry[]): Blob {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const encoder = new TextEncoder();

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, entry.data.length, true);
    lv.setUint32(22, entry.data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    parts.push(local, entry.data);

    const centralEntry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralEntry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, entry.data.length, true);
    cv.setUint32(24, entry.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralEntry.set(nameBytes, 46);
    central.push(centralEntry);

    offset += local.length + entry.data.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const blobs: BlobPart[] = [...parts, ...central, end].map((part) => {
    const copy = new Uint8Array(part.byteLength);
    copy.set(part);
    return copy;
  });
  return new Blob(blobs, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function zipEntryText(entry: ZipEntry | undefined): string | null {
  if (!entry) return null;
  return new TextDecoder('utf-8').decode(entry.data);
}

export function zipSetText(entries: ZipEntry[], name: string, text: string): void {
  const data = new TextEncoder().encode(text);
  const index = entries.findIndex((entry) => entry.name === name);
  if (index >= 0) {
    entries[index] = { name, data };
  } else {
    entries.push({ name, data });
  }
}
