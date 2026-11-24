import {
  buildDuplicateColumnKey,
  getDuplicateColumnIndex,
  isDuplicateColumnKey,
  stripDuplicateColumnSuffix,
} from './reportColumnDuplicate';

import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

/** UI-ключ строки состава для N-го вхождения fieldName (1 → path, 2+ → path#N). */
export function reportSelectedFieldUiKey(fieldName: string, occurrence: number): string {
  const path = fieldName.trim();
  if (!path) return '';
  return occurrence > 1 ? buildDuplicateColumnKey(path, occurrence) : path;
}

/**
 * Скрыт ли конкретный selectedField (исходник или клон) по hiddenColumnKeys.
 * Клон смотрит только на свой `field#N` / alias — не на path исходника.
 */
export function isReportSelectedFieldOccurrenceHidden(
  field: ReportSelectedFieldPayload,
  occurrence: number,
  hiddenColumnKeys: string[] | undefined,
): boolean {
  if (!hiddenColumnKeys?.length) return false;
  const hidden = new Set(
    hiddenColumnKeys.map((key) => String(key).trim()).filter(Boolean),
  );
  if (!hidden.size) return false;

  const path = (field.fieldName ?? '').trim();
  const alias = (field.alias ?? '').trim();
  const uiKey = reportSelectedFieldUiKey(path, occurrence);

  if (occurrence > 1) {
    if (uiKey && hidden.has(uiKey)) return true;
    if (alias && hidden.has(alias)) return true;
    return false;
  }

  // Исходник (или единственный оставшийся после удаления А): path / alias /
  // и UI-ключ клона field#N, если он остался единственным sibling.
  if (path && hidden.has(path)) return true;
  if (alias && hidden.has(alias)) return true;
  if (uiKey && hidden.has(uiKey)) return true;
  return false;
}

/**
 * Ключи скрытых колонок для queryContext / грида / export:
 * UI-ключ строки (`field` / `field#N`) + alias этой строки.
 * `fieldName` исходника кладём только если скрыт именно исходник —
 * иначе скрытие А протекало бы на все клоны А1/А2 через общий path.
 */
export function buildReportHiddenColumnKeys(
  hiddenByUiKey: Record<string, boolean> | undefined,
  selectedFields: ReportSelectedFieldPayload[] | undefined,
): string[] {
  const hiddenUi = hiddenByUiKey ?? {};
  const keys = new Set<string>();

  const siblingsByPath = new Map<string, ReportSelectedFieldPayload[]>();
  for (const field of selectedFields ?? []) {
    const fieldName = (field.fieldName ?? '').trim();
    if (!fieldName) continue;
    const list = siblingsByPath.get(fieldName) ?? [];
    list.push(field);
    siblingsByPath.set(fieldName, list);
  }

  for (const [uiKey, isHidden] of Object.entries(hiddenUi)) {
    if (!isHidden) continue;
    const trimmed = uiKey.trim();
    if (!trimmed) continue;
    keys.add(trimmed);

    const base = stripDuplicateColumnSuffix(trimmed);
    const dupIndex = getDuplicateColumnIndex(trimmed);
    const siblings = siblingsByPath.get(base) ?? [];
    // UI «field#2» после удаления исходника: в selectedFields один sibling —
    // всё равно берём его alias (глаз клона не теряется).
    const matched =
      siblings[dupIndex - 1] ??
      (isDuplicateColumnKey(trimmed) && siblings.length === 1 ? siblings[0] : undefined);

    if (matched) {
      const alias = (matched.alias ?? '').trim();
      if (alias) keys.add(alias);
    }

    // Path исходника — только для базового UI-ключа, не для field#N.
    if (!isDuplicateColumnKey(trimmed)) {
      keys.add(base);
    }
  }

  return Array.from(keys);
}

/**
 * Content-ключи ответа, которые нельзя показывать в гриде.
 * Не резолвим alias→fieldName «для всех» — иначе скрытый исходник прячет клон.
 */
export function collectHiddenReportContentKeys(
  allContentKeys: string[],
  selectedFields: ReportSelectedFieldPayload[] | undefined,
  hiddenColumnKeys: string[] | undefined,
): Set<string> {
  const hiddenContent = new Set<string>();
  if (!hiddenColumnKeys?.length) return hiddenContent;

  const hidden = new Set(
    hiddenColumnKeys.map((key) => String(key).trim()).filter(Boolean),
  );
  for (const key of allContentKeys) {
    if (hidden.has(key)) hiddenContent.add(key);
  }

  const occurrenceByPath = new Map<string, number>();
  for (const field of selectedFields ?? []) {
    const fieldName = (field.fieldName ?? '').trim();
    if (!fieldName) continue;
    const occurrence = (occurrenceByPath.get(fieldName) ?? 0) + 1;
    occurrenceByPath.set(fieldName, occurrence);
    if (!isReportSelectedFieldOccurrenceHidden(field, occurrence, hiddenColumnKeys)) {
      continue;
    }
    const alias = (field.alias ?? '').trim();
    if (alias) hiddenContent.add(alias);
    // Content-ключ = fieldName только у исходника (клоны обычно под alias).
    if (occurrence === 1) {
      hiddenContent.add(fieldName);
    }
  }

  return hiddenContent;
}

/** Скрыт ли sort apiField с учётом исходник/клон (не путать alias клона с path). */
export function isReportSortApiFieldHidden(
  apiField: string,
  hiddenColumnKeys: string[] | undefined,
  selectedFields?: ReportSelectedFieldPayload[],
): boolean {
  const field = apiField.trim();
  if (!field || !hiddenColumnKeys?.length) return false;
  const hidden = new Set(
    hiddenColumnKeys.map((key) => String(key).trim()).filter(Boolean),
  );
  if (hidden.has(field)) return true;

  const occurrenceByPath = new Map<string, number>();
  for (const selected of selectedFields ?? []) {
    const fieldName = (selected.fieldName ?? '').trim();
    if (!fieldName) continue;
    const occurrence = (occurrenceByPath.get(fieldName) ?? 0) + 1;
    occurrenceByPath.set(fieldName, occurrence);
    const alias = (selected.alias ?? '').trim();
    if (alias !== field && fieldName !== field) continue;
    // Match по alias — только эта строка; по fieldName — только исходник (occurrence 1),
    // иначе sort по path скрывал бы и клон.
    if (alias === field) {
      return isReportSelectedFieldOccurrenceHidden(selected, occurrence, hiddenColumnKeys);
    }
    if (fieldName === field && occurrence === 1) {
      return isReportSelectedFieldOccurrenceHidden(selected, occurrence, hiddenColumnKeys);
    }
  }
  return false;
}

export function isReportDuplicateUiVisibilityKey(key: string): boolean {
  return isDuplicateColumnKey(key);
}
