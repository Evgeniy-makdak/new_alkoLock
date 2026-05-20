import type { Value, Values } from '@shared/ui/search_multiple_select';

/** SearchMultipleSelect с multiple={false} отдаёт один объект, не массив. */
export function toValuesFromSingleSelect(
  next: string | Values | Value | (string | Values | Value)[],
): Values {
  if (Array.isArray(next)) {
    return next as Values;
  }
  if (next != null && typeof next === 'object' && 'value' in next) {
    return [next as Value];
  }
  return [];
}
