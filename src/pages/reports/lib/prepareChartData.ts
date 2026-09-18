import type { ReportChartEncoding, ReportChartSpec } from '../types/chartSpec';
import { createDefaultChartSpec } from '../types/chartSpec';

export type ChartDatasetPoint = {
  category: string;
  series: string;
  value: number;
};

export type ChartPreparedData = {
  categories: string[];
  seriesNames: string[];
  /** category -> series -> value */
  matrix: Record<string, Record<string, number>>;
  total: number;
  points: ChartDatasetPoint[];
};

function cellToLabel(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.label === 'string' && obj.label.trim()) return obj.label;
    if (typeof obj.name === 'string' && obj.name.trim()) return obj.name;
    if (typeof obj.value === 'string' || typeof obj.value === 'number') {
      return String(obj.value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function cellToNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Не считаем «чистым» числом длинные id/коды без смысла как меры.
    if (/^\d{10,}$/.test(trimmed)) return null;
    const n = Number(trimmed.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('value' in obj) return cellToNumber(obj.value);
  }
  return null;
}

function isIdLikeField(field: string): boolean {
  const key = field.trim();
  if (!key) return true;
  if (/^id$/i.test(key)) return true;
  if (/\.id$/i.test(key)) return true;
  if (/Id$/.test(key) || /_id$/i.test(key)) return true;
  return false;
}

function looksLikeDateField(field: string): boolean {
  return /date|time|created|updated|timestamp|day|period/i.test(field);
}

function pickDefaultCategoryField(
  rows: Array<Record<string, unknown>>,
  groupBy?: string[],
): string | null {
  if (groupBy?.length) {
    const first = groupBy.find((field) => field && rows.some((row) => field in row));
    if (first) return first;
  }
  if (!rows.length) return null;
  const keys = Object.keys(rows[0] ?? {});
  const dateKey = keys.find((key) => looksLikeDateField(key) && !isIdLikeField(key));
  if (dateKey) return dateKey;

  // Предпочитаем поле с меньшей кардинальностью (не «каждая строка = своя категория»).
  let best: { key: string; unique: number } | null = null;
  for (const key of keys) {
    if (isIdLikeField(key)) continue;
    const unique = new Set(rows.map((row) => cellToLabel(row[key]))).size;
    if (unique <= 1) continue;
    if (!best || unique < best.unique) best = { key, unique };
  }
  if (best) return best.key;

  return keys.find((key) => !isIdLikeField(key)) ?? keys[0] ?? null;
}

function pickDefaultValueField(
  rows: Array<Record<string, unknown>>,
  categoryField: string | null,
): string | null {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0] ?? {}).filter(
    (key) => key !== categoryField && !isIdLikeField(key),
  );
  for (const key of keys) {
    if (looksLikeDateField(key)) continue;
    let numericCount = 0;
    for (const row of rows.slice(0, 40)) {
      if (cellToNumber(row[key]) != null) numericCount += 1;
    }
    // Мера должна быть числовой у заметной доли строк.
    if (numericCount >= Math.min(3, rows.length)) return key;
  }
  // Нет подходящей меры → COUNT строк (valueField = null).
  return null;
}

/** Дополняет ChartSpec дефолтами полей из текущих строк / groupBy. */
export function resolveChartEncoding(
  spec: ReportChartSpec,
  rows: Array<Record<string, unknown>>,
  groupBy?: string[],
): ReportChartEncoding {
  const categoryField =
    spec.encoding.categoryField && rows.some((r) => spec.encoding.categoryField! in r)
      ? spec.encoding.categoryField
      : pickDefaultCategoryField(rows, groupBy);

  const hasExplicitValue =
    spec.encoding.valueField !== undefined &&
    // null = явное «COUNT строк» из панели настроек / дефолта ChartSpec
    (spec.encoding.valueField === null ||
      rows.some((r) => spec.encoding.valueField! in r));

  let valueField = hasExplicitValue
    ? spec.encoding.valueField
    : pickDefaultValueField(rows, categoryField);

  // Сумма id бессмысленна → COUNT.
  if (valueField && isIdLikeField(valueField)) {
    valueField = null;
  }

  const seriesField =
    spec.encoding.seriesField &&
    spec.encoding.seriesField !== categoryField &&
    rows.some((r) => spec.encoding.seriesField! in r)
      ? spec.encoding.seriesField
      : null;

  return { categoryField, valueField, seriesField };
}

function parseSortableDate(label: string): number | null {
  const t = Date.parse(label);
  return Number.isFinite(t) ? t : null;
}

/**
 * Агрегирует строки отчёта по ChartSpec.encoding.
 * valueField=null → COUNT; иначе SUM числового поля.
 */
export function prepareChartData(
  rows: Array<Record<string, unknown>>,
  spec: ReportChartSpec,
  groupBy?: string[],
): ChartPreparedData {
  const encoding = resolveChartEncoding(spec, rows, groupBy);
  const empty: ChartPreparedData = {
    categories: [],
    seriesNames: [],
    matrix: {},
    total: 0,
    points: [],
  };
  if (!rows.length || !encoding.categoryField) return empty;

  const categoryField = encoding.categoryField;
  const valueField = encoding.valueField;
  const seriesField = encoding.seriesField;
  const matrix: Record<string, Record<string, number>> = {};
  const categoryOrder: string[] = [];
  const seriesOrder: string[] = [];
  const DEFAULT_SERIES = 'value';

  for (const row of rows) {
    const category = cellToLabel(row[categoryField]);
    const series = seriesField ? cellToLabel(row[seriesField]) : DEFAULT_SERIES;
    const raw = valueField != null ? cellToNumber(row[valueField]) : 1;
    const add = raw == null ? (valueField != null ? 0 : 1) : raw;

    if (!(category in matrix)) {
      matrix[category] = {};
      categoryOrder.push(category);
    }
    if (!(series in matrix[category]!)) {
      matrix[category]![series] = 0;
      if (!seriesOrder.includes(series)) seriesOrder.push(series);
    }
    matrix[category]![series] = (matrix[category]![series] ?? 0) + add;
  }

  const categoryTotals = categoryOrder.map((cat) => ({
    cat,
    total: Object.values(matrix[cat] ?? {}).reduce((s, v) => s + v, 0),
  }));

  const isTrend = spec.type === 'line' || spec.type === 'area';
  if (isTrend) {
    // Для линий/площадей сохраняем порядок появления / хронологию, не «топ по сумме».
    categoryTotals.sort((a, b) => {
      const da = parseSortableDate(a.cat);
      const db = parseSortableDate(b.cat);
      if (da != null && db != null) return da - db;
      const ia = categoryOrder.indexOf(a.cat);
      const ib = categoryOrder.indexOf(b.cat);
      return ia - ib;
    });
  } else {
    categoryTotals.sort((a, b) => b.total - a.total);
  }

  const limitedCats =
    spec.topN > 0
      ? isTrend
        ? categoryTotals.slice(-spec.topN)
        : categoryTotals.slice(0, spec.topN)
      : categoryTotals;
  const categories = limitedCats.map((item) => item.cat);
  const seriesNames =
    seriesField != null ? seriesOrder : seriesOrder.length ? seriesOrder : [DEFAULT_SERIES];

  const points: ChartDatasetPoint[] = [];
  let total = 0;
  for (const cat of categories) {
    for (const series of seriesNames) {
      const value = matrix[cat]?.[series] ?? 0;
      points.push({ category: cat, series, value });
      total += value;
    }
  }

  return { categories, seriesNames, matrix, total, points };
}

export function inferInitialChartSpec(
  rows: Array<Record<string, unknown>>,
  groupBy?: string[],
): ReportChartSpec {
  const encoding = resolveChartEncoding(createDefaultChartSpec(), rows, groupBy);
  return createDefaultChartSpec({ encoding });
}
