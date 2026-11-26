import i18n from 'i18next';

import type { Values } from '@shared/ui/search_multiple_select';

import {
  buildDuplicateColumnKey,
  stripDuplicateColumnSuffix,
} from './reportColumnDuplicate';

import {
  isReportTableFieldLabelAutoQualified,
  QUALIFIED_LABEL_SEPARATOR,
  ROOT_ENTITY_LABEL_SEPARATOR,
} from './buildReportTableFieldOptions';
import type {
  ReportFieldDefinition,
  ReportSelectedFieldPayload,
} from '../types/reportApiTypes';

/**
 * UI → API alias: подпись поля как в «Текущем составе», без правок.
 * Пробелы и «->» сохраняем; `_` только если он уже есть в подписи
 * (клон «…Дата_1», rename с подчёркиванием) — ничего не дописываем.
 * Пример: «Отчет о событиях -> Дата_1» → тот же текст.
 */
export function encodeReportFieldAliasForApi(displayAlias: string): string {
  return displayAlias.trim();
}

/**
 * Alias = подпись как есть (префикс дефолта + хвост rename), без замены пробелов на `_`.
 */
export function encodeReportFieldAliasPreservingDefault(
  displayAlias: string,
  defaultFieldLabel: string,
): string {
  const label = displayAlias.trim();
  const defaultLabel = defaultFieldLabel.trim();
  if (!label) return '';
  if (!defaultLabel || !label.startsWith(defaultLabel)) {
    return encodeReportFieldAliasForApi(label);
  }
  return label;
}

/**
 * API → UI: `_` → пробелы (грид, модалка, карандаш).
 * Пример: «Время_события» → «Время события».
 */
export function decodeReportFieldAliasForUi(apiAlias: string): string {
  const trimmed = apiAlias.trim();
  // Системный постфикс клона «_N» сохраняем подчёркиванием («…Время события_1»),
  // остальные `_` → пробелы.
  const suffixMatch = trimmed.match(/^(.*)_(\d+)$/);
  if (!suffixMatch) return trimmed.replace(/_/g, ' ');
  return `${suffixMatch[1].replace(/_/g, ' ')}_${suffixMatch[2]}`;
}

/** Лист подписи «Сущность -> Поле» / «Сущность · Поле». */
export function extractReportTableFieldLabelLeaf(label: string): string {
  const trimmed = label.trim();
  const sep = trimmed.includes(ROOT_ENTITY_LABEL_SEPARATOR)
    ? ROOT_ENTITY_LABEL_SEPARATOR
    : trimmed.includes(QUALIFIED_LABEL_SEPARATOR)
      ? QUALIFIED_LABEL_SEPARATOR
      : null;
  if (!sep) return trimmed;
  return trimmed.slice(trimmed.lastIndexOf(sep) + sep.length).trim();
}

/**
 * Дефолтный лист подписи как в «Составе колонок» (не сырой fieldDef.label).
 * Для lat/lon UI = «Координаты (широта/долгота)», иначе ложный alias в POST.
 */
export function resolveReportFieldDefaultLabelForAlias(
  emitPath: string,
  fieldDef: ReportFieldDefinition | null | undefined,
): string {
  const leaf = emitPath.includes('.')
    ? emitPath.slice(emitPath.lastIndexOf('.') + 1)
    : emitPath;
  if (leaf === 'latitude') {
    return String(i18n.t('reports.composite.coordinateLatitude'));
  }
  if (leaf === 'longitude') {
    return String(i18n.t('reports.composite.coordinateLongitude'));
  }
  return (fieldDef?.label ?? '').trim() || emitPath;
}

/**
 * Alias в POST = подпись поля из «Текущего состава» после клонирования или
 * переименования (карандаш) — буквально как в UI.
 * Не урезаем до листа, не ставим `_` вместо пробелов/«->».
 * «_1» у клона уже в подписи из UI — отдельно не добавляем.
 *
 * Дефолтная авто-подпись «Сущность -> Поле» без изменений — alias не эмитим.
 */
export function resolveReportFieldAliasForApi(
  displayLabel: string,
  emitPath: string,
  fieldName: string,
  defaultFieldLabel: string,
): string | undefined {
  const label = displayLabel.trim();
  const defaultLabel = defaultFieldLabel.trim();
  if (!label || label === emitPath || label === fieldName) return undefined;

  if (isReportTableFieldLabelAutoQualified(label)) {
    const leaf = extractReportTableFieldLabelLeaf(label);
    if (!leaf) return undefined;
    // Без известного дефолта авто-подпись считаем неизменённой.
    if (!defaultLabel) return undefined;
    // Лист совпадает с дефолтом metadata → это не rename/клон, alias не нужен.
    if (leaf === defaultLabel) return undefined;
    // Дефолт свалился на technical path (fieldDef не найден) — «Сущность -> Поле» не alias.
    if (
      defaultLabel === emitPath ||
      defaultLabel === fieldName ||
      defaultLabel.includes('.')
    ) {
      return undefined;
    }
  }

  // Ровно подпись поля (см. encodeReportFieldAliasForApi).
  const apiAlias = encodeReportFieldAliasForApi(label);
  if (!apiAlias || apiAlias === emitPath || apiAlias === fieldName) return undefined;
  // Bare leaf (== defaultLabel) тоже alias: снятие «Сущность ->», не дефолт UI.
  return apiAlias;
}

/**
 * @deprecated Используйте resolveReportFieldAliasForApi.
 */
export function shouldEmitReportFieldAlias(
  displayLabel: string,
  emitPath: string,
  fieldName: string,
  defaultFieldLabel: string,
): boolean {
  return Boolean(
    resolveReportFieldAliasForApi(displayLabel, emitPath, fieldName, defaultFieldLabel),
  );
}

/**
 * Подписи колонок для грида по alias из POST.
 * Значения — всегда UI-форма с пробелами; ключи — fieldName и сырой alias ответа.
 *
 * При клонах несколько selectedFields делят один fieldName — НЕ пишем alias на
 * fieldName: иначе оригинал получает подпись клона («Результат_1»).
 */
export function buildReportColumnAliasMap(
  selectedFields: ReportSelectedFieldPayload[] | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  const pathCounts = new Map<string, number>();
  for (const field of selectedFields ?? []) {
    const path = (field.fieldName ?? '').trim();
    if (!path) continue;
    pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
  }
  for (const field of selectedFields ?? []) {
    const alias = field.alias?.trim();
    if (!alias) continue;
    const path = (field.fieldName ?? '').trim();
    const uiLabel = decodeReportFieldAliasForUi(alias);
    map.set(alias, uiLabel);
    if (path && (pathCounts.get(path) ?? 0) <= 1) {
      map.set(path, uiLabel);
    }
  }
  return map;
}

/**
 * Подписи «Текущего состава» → columnHeaderLabels для грида (как в UI, с пробелами).
 * Дополнительно индексируем по сырому alias ответа, чтобы заголовок не срывался на `_`.
 */
export function buildReportColumnHeaderLabelsFromComposeFields(
  tableFields: Values,
  selectedFields?: ReportSelectedFieldPayload[],
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const item of tableFields) {
    const path = String(item.value ?? '').trim();
    const label = String(item.label ?? '').trim();
    if (!path || !label) continue;
    labels[path] = label;
  }
  // selectedFields создаются в порядке состава; «#N» — ключ клона, не его позиция.
  const remainingUi = tableFields
    .map((item) => ({
      key: String(item.value ?? '').trim(),
      label: String(item.label ?? '').trim(),
      base: stripDuplicateColumnSuffix(String(item.value ?? '').trim()),
    }))
    .filter((row) => row.key);

  const occurrenceByPath = new Map<string, number>();
  for (const field of selectedFields ?? []) {
    const path = (field.fieldName ?? '').trim();
    if (!path) continue;
    const alias = (field.alias ?? '').trim();
    const occurrence = (occurrenceByPath.get(path) ?? 0) + 1;
    occurrenceByPath.set(path, occurrence);

    const wantKey = occurrence > 1 ? buildDuplicateColumnKey(path, occurrence) : path;
    let uiIdx = remainingUi.findIndex((row) => row.base === path);
    if (uiIdx < 0) {
      uiIdx = remainingUi.findIndex((row) => row.key === wantKey);
    }
    if (uiIdx < 0) {
      uiIdx = remainingUi.findIndex(
        (row) =>
          row.base === path ||
          row.key === path ||
          row.base === stripDuplicateColumnSuffix(path),
      );
    }
    const uiRow = uiIdx >= 0 ? remainingUi.splice(uiIdx, 1)[0] : undefined;
    if (!alias) continue;
    const uiLabel =
      (uiRow?.label || '').trim() ||
      (uiRow?.key ? (labels[uiRow.key] ?? '').trim() : '') ||
      (labels[wantKey] ?? '').trim() ||
      (labels[path] ?? '').trim() ||
      Object.entries(labels).find(([key]) => key.includes('__composite'))?.[1] ||
      decodeReportFieldAliasForUi(alias);
    labels[alias] = uiLabel;
  }
  return labels;
}

export function resolveReportColumnHeaderLabel(
  columnKey: string,
  columnAliases: Map<string, string>,
  fallbackLabel: string,
): string {
  return columnAliases.get(columnKey) ?? fallbackLabel;
}

/**
 * Ключ колонки в content может быть fieldName или сырым alias ответа.
 * Для локализации type/color и metadata нужен исходный fieldName.
 */
export function resolveReportContentFieldName(
  columnKey: string,
  selectedFields: ReportSelectedFieldPayload[] | undefined,
): string {
  const key = columnKey.trim();
  if (!key || !selectedFields?.length) return key;
  for (const field of selectedFields) {
    const fieldName = (field.fieldName ?? '').trim();
    const alias = (field.alias ?? '').trim();
    if (!fieldName) continue;
    if (fieldName === key || alias === key) return fieldName;
  }
  return key;
}
