import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

export type ReportExportSortSpec = {
  /** Индекс колонки в выгрузке (visible selectedFields). */
  columnIndex: number;
  direction: 'ASC' | 'DESC';
  /** fieldName из pageable.sort — для отладки/сопоставления. */
  fieldName: string;
};

/**
 * pageable.sort (`name,ASC`) → колонка в теле export.
 * Бэкенд /export sort игнорирует — сортируем файл на клиенте.
 */
export function resolveReportExportSortSpec(
  sortParams: string[] | undefined,
  selectedFields: ReportSelectedFieldPayload[] | undefined,
): ReportExportSortSpec | null {
  const param = (sortParams?.[0] ?? '').trim();
  if (!param || !selectedFields?.length) return null;

  const commaIndex = param.lastIndexOf(',');
  if (commaIndex <= 0) return null;

  const fieldName = param.slice(0, commaIndex).trim();
  const directionRaw = param.slice(commaIndex + 1).trim().toUpperCase();
  if (!fieldName || (directionRaw !== 'ASC' && directionRaw !== 'DESC')) return null;

  const columnIndex = selectedFields.findIndex((field) => {
    const path = (field.fieldName ?? '').trim();
    const alias = (field.alias ?? '').trim();
    return path === fieldName || alias === fieldName;
  });
  if (columnIndex < 0) return null;

  return {
    columnIndex,
    direction: directionRaw as 'ASC' | 'DESC',
    fieldName,
  };
}

/** Сравнение ячеек для сортировки выгрузки (как строки UI, locale ru). */
export function compareReportExportCellValues(a: string, b: string): number {
  const left = (a ?? '').trim();
  const right = (b ?? '').trim();
  // Пустые/тире — в конец при ASC (как обычно в таблицах).
  const leftEmpty = !left || left === '—' || left === '-';
  const rightEmpty = !right || right === '—' || right === '-';
  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;
  return left.localeCompare(right, 'ru', { numeric: true, sensitivity: 'base' });
}

export function sortReportExportRows(
  rows: string[][],
  spec: ReportExportSortSpec | null | undefined,
): string[][] {
  if (!spec || rows.length < 2) return rows;
  const { columnIndex, direction } = spec;
  if (columnIndex < 0) return rows;
  const sign = direction === 'ASC' ? 1 : -1;
  const copy = rows.slice();
  copy.sort(
    (a, b) =>
      sign *
      compareReportExportCellValues(a[columnIndex] ?? '', b[columnIndex] ?? ''),
  );
  return copy;
}
