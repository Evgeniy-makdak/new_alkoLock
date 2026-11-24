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

/**
 * Источник sort в UI: клон с агрегацией идёт по alias (`Максимум` / `timestamp_1`),
 * исходник — по своему alias или fieldName. Нельзя брать «первый с тем же fieldName».
 */
function pickSourceFieldForExportSort(
  sources: ReportSelectedFieldPayload[],
  sortField: string,
): ReportSelectedFieldPayload | undefined {
  if (!sortField) return undefined;

  const byAlias = sources.find((field) => (field.alias ?? '').trim() === sortField);
  if (byAlias) return byAlias;

  const key = normalizeReportSortFieldKey(sortField);
  const byAliasNorm = sources.find((field) => {
    const alias = (field.alias ?? '').trim();
    return Boolean(alias) && normalizeReportSortFieldKey(alias) === key;
  });
  if (byAliasNorm) return byAliasNorm;

  const byPath = sources.filter((field) => {
    const path = (field.fieldName ?? '').trim();
    return path === sortField || normalizeReportSortFieldKey(path) === key;
  });
  if (!byPath.length) return undefined;
  if (byPath.length === 1) return byPath[0];
  // Несколько колонок с одним path (исходник + клон): sort по fieldName → исходник.
  return byPath.find((field) => !(field.alias ?? '').trim()) ?? byPath[0];
}

/** Тот же ordinal среди полей с одинаковым fieldName (исходник/клон). */
function pickExportFieldForSource(
  sourceHit: ReportSelectedFieldPayload,
  sources: ReportSelectedFieldPayload[],
  exportFields: ReportSelectedFieldPayload[],
): ReportSelectedFieldPayload | undefined {
  const sourcePath = (sourceHit.fieldName ?? '').trim();
  if (!sourcePath) return undefined;

  const sourceSiblings = sources.filter((field) => (field.fieldName ?? '').trim() === sourcePath);
  const sourceIndex = Math.max(0, sourceSiblings.indexOf(sourceHit));
  const exportSiblings = exportFields.filter(
    (field) => (field.fieldName ?? '').trim() === sourcePath,
  );
  if (!exportSiblings.length) return undefined;

  if (exportSiblings[sourceIndex]) return exportSiblings[sourceIndex];

  const sourceAgg = (sourceHit.aggregation ?? '').trim();
  if (sourceAgg) {
    const byAgg = exportSiblings.filter(
      (field) => (field.aggregation ?? '').trim() === sourceAgg,
    );
    if (byAgg.length === 1) return byAgg[0];
    if (byAgg[sourceIndex]) return byAgg[sourceIndex];
    if (byAgg[0]) return byAgg[0];
  }

  return exportSiblings[0];
}

/**
 * pageable.sort UI (`user.fullName` / alias клона) → alias полей тела export.
 * При GROUP BY бэкенд принимает только alias’ы selectedFields;
 * buildReportExportPlan подставляет RU-alias.
 * Исходник и клон с разной агрегацией — разные alias: sort по клону не должен
 * уезжать на исходник (раньше брался exportHits[0] по общему fieldName).
 */
export function remapReportSortParamsForExportBody(
  sortParams: string[],
  sourceFields: ReportSelectedFieldPayload[] | undefined,
  exportFields: ReportSelectedFieldPayload[] | undefined,
): string[] {
  if (!sortParams.length || !exportFields?.length) return sortParams;
  const sources = sourceFields ?? [];

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

    const sourceHit = pickSourceFieldForExportSort(sources, sortField);
    if (!sourceHit) return param;

    const target = pickExportFieldForSource(sourceHit, sources, exportFields);
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

  // Как remap: сначала точный alias (клон), не первый fieldName (исходник).
  let columnIndex = selectedFields.findIndex(
    (field) => (field.alias ?? '').trim() === fieldName,
  );
  if (columnIndex < 0) {
    columnIndex = selectedFields.findIndex((field) => {
      const path = (field.fieldName ?? '').trim();
      return (
        path === fieldName ||
        normalizeReportSortFieldKey(path) === normalizeReportSortFieldKey(fieldName)
      );
    });
  }
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
