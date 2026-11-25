import {
  buildDuplicateColumnKey,
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
 * Клон — только по своему alias; path исходника на клон не распространяется.
 * Не используем occurrence→path#N: при порядке [клон, оригинал] счётчик ≠ UI #N
 * и hide одного клона цеплял другой.
 */
export function isReportSelectedFieldOccurrenceHidden(
  field: ReportSelectedFieldPayload,
  _occurrence: number,
  hiddenColumnKeys: string[] | undefined,
): boolean {
  if (!hiddenColumnKeys?.length) return false;
  const hidden = new Set(
    hiddenColumnKeys.map((key) => String(key).trim()).filter(Boolean),
  );
  if (!hidden.size) return false;

  const path = (field.fieldName ?? '').trim();
  const alias = (field.alias ?? '').trim();

  // Свой alias — точная строка (клон или переименованный исходник).
  if (alias && hidden.has(alias)) return true;

  // Path скрыт → только исходник без alias. Клон всегда с alias; переименованный
  // исходник при hide получает и path, и свой alias в hiddenColumnKeys.
  if (path && hidden.has(path) && !alias) return true;

  return false;
}

/**
 * UI-ключ состава → selectedField: zip по порядку compose (1:1 с эмитом без composite).
 * Нельзя брать siblings[dupIndex-1] — selectedFields в порядке состава, не по #N.
 * Нужен и для restore агрегаций: occurrence→path#N ломал COUNT_DISTINCT у клона
 * после reorder (ключ #3 сверху получал aggregation третьего вхождения).
 */
export function buildUiKeyToSelectedFieldMap(
  composeFieldKeys: string[] | undefined,
  selectedFields: ReportSelectedFieldPayload[] | undefined,
): Map<string, ReportSelectedFieldPayload> {
  const map = new Map<string, ReportSelectedFieldPayload>();
  if (!composeFieldKeys?.length || !selectedFields?.length) return map;

  if (composeFieldKeys.length === selectedFields.length) {
    for (let i = 0; i < composeFieldKeys.length; i += 1) {
      const uiKey = String(composeFieldKeys[i] ?? '').trim();
      if (uiKey) map.set(uiKey, selectedFields[i]!);
    }
    return map;
  }

  const used = new Set<number>();
  for (const raw of composeFieldKeys) {
    const uiKey = String(raw ?? '').trim();
    if (!uiKey) continue;
    const base = stripDuplicateColumnSuffix(uiKey);
    const idx = selectedFields.findIndex((field, i) => {
      if (used.has(i)) return false;
      const name = (field.fieldName ?? '').trim();
      return Boolean(name) && (name === base || base.endsWith(name) || name.endsWith(base));
    });
    if (idx < 0) continue;
    used.add(idx);
    map.set(uiKey, selectedFields[idx]!);
  }
  return map;
}

/**
 * Ключи скрытых колонок для queryContext / грида / export:
 * UI-ключ строки (`field` / `field#N`) + alias этой строки.
 * `fieldName` исходника кладём только если скрыт именно исходник —
 * иначе скрытие А протекало бы на все клоны А1/А2 через общий path.
 *
 * @param composeFieldKeys ключи «Текущего состава» в UI-порядке — чтобы alias
 *   клона не привязать к hide исходника при порядке [клон, оригинал, …].
 */
export function buildReportHiddenColumnKeys(
  hiddenByUiKey: Record<string, boolean> | undefined,
  selectedFields: ReportSelectedFieldPayload[] | undefined,
  composeFieldKeys?: string[],
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

  const uiKeyToField = buildUiKeyToSelectedFieldMap(composeFieldKeys, selectedFields);

  for (const [uiKey, isHidden] of Object.entries(hiddenUi)) {
    if (!isHidden) continue;
    const trimmed = uiKey.trim();
    if (!trimmed) continue;
    keys.add(trimmed);

    const base = stripDuplicateColumnSuffix(trimmed);
    const siblings = siblingsByPath.get(base) ?? [];

    // Сначала точное сопоставление по compose; иначе — без siblings[dupIndex-1]
    // (при клоне выше оригинала индекс врал и hide path цеплял alias клона).
    let matched = uiKeyToField.get(trimmed);
    if (!matched) {
      if (!isDuplicateColumnKey(trimmed)) {
        matched = siblings.find((field) => !(field.alias ?? '').trim());
      } else if (siblings.length === 1) {
        matched = siblings[0];
      }
    }

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
    if (alias) {
      hiddenContent.add(alias);
    } else {
      // Исходник без alias: content-ключ = fieldName (и при occurrence>1, если
      // клон выше оригинала в selectedFields).
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
    // Match по alias — только эта строка; по fieldName — только исходник без alias
    // (не occurrence===1: при клоне сверху occ 1 = клон).
    if (alias === field) {
      return isReportSelectedFieldOccurrenceHidden(selected, occurrence, hiddenColumnKeys);
    }
    if (fieldName === field && !alias) {
      return isReportSelectedFieldOccurrenceHidden(selected, occurrence, hiddenColumnKeys);
    }
  }
  return false;
}

export function isReportDuplicateUiVisibilityKey(key: string): boolean {
  return isDuplicateColumnKey(key);
}
