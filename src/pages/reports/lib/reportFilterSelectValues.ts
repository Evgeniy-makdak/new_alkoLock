import type { Value, Values } from '@shared/ui/search_multiple_select';

/**
 * Нормализация выбора значения фильтра (в т.ч. freeSolo-строка из Autocomplete).
 * Произвольный ввод → `{ value, label }`, чтобы попал в filters[].values.
 * Только для value-контролов отчётов (не трогает shared SearchMultipleSelect).
 */
export function normalizeReportFilterSelectValues(
  next: string | Values | Value | (string | Values | Value)[],
): Values {
  const asArray: unknown[] = Array.isArray(next)
    ? next
    : next == null || next === ''
      ? []
      : [next];

  const result: Values = [];
  for (const item of asArray) {
    if (item == null || item === '') continue;
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (!trimmed) continue;
      result.push({ value: trimmed, label: trimmed });
      continue;
    }
    if (typeof item === 'object' && item !== null && 'value' in item) {
      result.push(item as Value);
    }
  }
  return result;
}
