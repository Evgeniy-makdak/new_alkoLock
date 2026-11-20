import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

export type ReportExportSortSpec = {
  /** Индекс колонки в выгрузке (visible selectedFields). */
  columnIndex: number;
  direction: 'ASC' | 'DESC';
  /** fieldName из pageable.sort — для отладки/сопоставления. */
  fieldName: string;
};

/** Нормализация имени поля sort: `user.fullName` ↔ `user_fullname`. */
function normalizeReportSortFieldKey(value: string): string {
  return value.trim().replace(/\./g, '_');
}

function fieldMatchesSortKey(
  field: ReportSelectedFieldPayload,
  sortField: string,
): boolean {
  const path = (field.fieldName ?? '').trim();
  const alias = (field.alias ?? '').trim();
  if (!sortField) return false;
  if (path === sortField || alias === sortField) return true;
  const key = normalizeReportSortFieldKey(sortField);
  return (
    (path !== '' && normalizeReportSortFieldKey(path) === key) ||
    (alias !== '' && normalizeReportSortFieldKey(alias) === key)
  );
}

/**
 * pageable.sort UI (`user.fullName` / `user_fullname`) → alias полей тела export
 * (`пользователь___пользователь`). При GROUP BY бэкенд принимает только alias’ы
 * selectedFields; buildReportExportPlan как раз подставляет RU-alias.
 */
export function remapReportSortParamsForExportBody(
  sortParams: string[],
  sourceFields: ReportSelectedFieldPayload[] | undefined,
  exportFields: ReportSelectedFieldPayload[] | undefined,
): string[] {
  if (!sortParams.length || !exportFields?.length) return sortParams;

  return sortParams.map((param) => {
    const raw = (param ?? '').trim();
    if (!raw) return param;
    const commaIndex = raw.lastIndexOf(',');
    if (commaIndex <= 0) return param;

    const sortField = raw.slice(0, commaIndex).trim();
    const direction = raw.slice(commaIndex + 1).trim();
    if (!sortField || !direction) return param;

    // Уже alias из тела export — не трогаем.
    if (exportFields.some((field) => (field.alias ?? '').trim() === sortField)) {
      return param;
    }

    const sourceHits = (sourceFields ?? []).filter((field) =>
      fieldMatchesSortKey(field, sortField),
    );
    const exportHits = exportFields.filter((field) => {
      if (fieldMatchesSortKey(field, sortField)) return true;
      const exportPath = (field.fieldName ?? '').trim();
      return sourceHits.some((source) => (source.fieldName ?? '').trim() === exportPath);
    });

    const target = exportHits[0];
    const exportAlias = (target?.alias ?? '').trim();
    if (!exportAlias) return param;
    return `${exportAlias},${direction}`;
  });
}

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
