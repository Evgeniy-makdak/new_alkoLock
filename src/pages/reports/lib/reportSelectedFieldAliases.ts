import i18n from 'i18next';

import type { Values } from '@shared/ui/search_multiple_select';

import { buildDuplicateColumnKey } from './reportColumnDuplicate';

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
 * UI → API: пробелы между словами → `_` (бэк принимает одно непрерывное слово).
 * Пример: «Время события» → «Время_события».
 * Только для POST alias; в гриде и модалке показываем с пробелами.
 */
export function encodeReportFieldAliasForApi(displayAlias: string): string {
  return displayAlias.trim().replace(/\s+/g, '_');
}

/**
 * Пробелы → `_` только в добавленной/изменённой части.
 * Дефолт «Координаты (долгота)» + « рпе» → «Координаты (долгота)_рпе»
 * (не «Координаты_(долгота)_рпе»).
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
  const suffix = label.slice(defaultLabel.length);
  if (!suffix.trim()) {
    return defaultLabel;
  }
  // Ведущие пробелы хвоста → один `_`, остальные пробелы хвоста → `_`.
  const encodedSuffix = suffix.replace(/^\s+/, '_').replace(/\s+/g, '_');
  return `${defaultLabel}${encodedSuffix}`;
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
 * Текст для alias в POST: только изменённая часть, с `_` вместо пробелов.
 * Дефолтный префикс «Сущность ->» не кодируем.
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
  if (defaultLabel && label === defaultLabel) return undefined;

  let aliasSource = label;
  if (isReportTableFieldLabelAutoQualified(label)) {
    const leaf = extractReportTableFieldLabelLeaf(label);
    if (!leaf) return undefined;
    // Без известного дефолта авто-подпись считаем неизменённой.
    if (!defaultLabel) return undefined;
    if (leaf === defaultLabel) return undefined;
    // Дефолт свалился на technical path (fieldDef не найден) — «Сущность -> Поле» не alias.
    if (
      defaultLabel === emitPath ||
      defaultLabel === fieldName ||
      defaultLabel.includes('.')
    ) {
      return undefined;
    }
    // В alias только изменённый лист, не вся строка с префиксом.
    aliasSource = leaf;
  }

  // При изменении названия строки ВСЕ отдельные слова алиаса разделяются нижними
  // подчёркиваниями (SQL видит одно непрерывное слово) — для каждой переименованной
  // строки, а не только для клонов. Декодирование в гриде («_» → пробелы) не меняется.
  const apiAlias = encodeReportFieldAliasForApi(aliasSource);
  if (!apiAlias || apiAlias === emitPath || apiAlias === fieldName) return undefined;
  if (defaultLabel && apiAlias === defaultLabel) return undefined;
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
 */
export function buildReportColumnAliasMap(
  selectedFields: ReportSelectedFieldPayload[] | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const field of selectedFields ?? []) {
    const alias = field.alias?.trim();
    if (!alias) continue;
    const uiLabel = decodeReportFieldAliasForUi(alias);
    map.set(field.fieldName, uiLabel);
    map.set(alias, uiLabel);
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
  // Алиас из selectedFields привязываем к подписи ДУБЛЯ по UI-ключу («field#N»),
  // а не по базовому path — иначе заголовок клона в гриде совпадает с оригиналом.
  const occurrenceByPath = new Map<string, number>();
  for (const field of selectedFields ?? []) {
    const path = (field.fieldName ?? '').trim();
    if (!path) continue;
    const occurrence = (occurrenceByPath.get(path) ?? 0) + 1;
    occurrenceByPath.set(path, occurrence);
    const alias = (field.alias ?? '').trim();
    if (!alias) continue;
    const uiKey = occurrence === 1 ? path : buildDuplicateColumnKey(path, occurrence);
    const uiLabel = labels[uiKey] ?? labels[path] ?? decodeReportFieldAliasForUi(alias);
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
