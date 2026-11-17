import type { Values } from '@shared/ui/search_multiple_select';

export function appendNewlyDiscoveredReportTableDefaults(
  current: Values,
  newlyDiscoveredDefaults: Values,
  mode: 'create' | 'edit',
  entityChangedDuringEdit: boolean,
): Values {
  if (mode !== 'create' && !entityChangedDuringEdit) return current;

  const present = new Set(current.map((item) => String(item.value)));
  const additions = newlyDiscoveredDefaults.filter((item) => {
    const key = String(item.value);
    if (present.has(key)) return false;
    present.add(key);
    return true;
  });

  return additions.length ? [...current, ...additions] : current;
}
