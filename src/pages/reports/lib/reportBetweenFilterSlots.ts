import type { Value, Values } from '@shared/ui/search_multiple_select';

/** Запись одного слота between (начало=0 / конец=1) без сдвига второго. */
export function commitReportBetweenFilterSlot(
  current: Values,
  index: 0 | 1,
  slotValues: Values,
): Values {
  const entry: Value | undefined = slotValues[0];
  const slot0 = index === 0 ? entry : current[0];
  const slot1 = index === 1 ? entry : current[1];
  const next: Values = [];
  if (slot0) next[0] = slot0;
  if (slot1) next[1] = slot1;
  return next;
}

export function reportBetweenSlotValues(values: Values, index: 0 | 1): Values {
  const entry = values[index];
  return entry ? [entry] : [];
}
