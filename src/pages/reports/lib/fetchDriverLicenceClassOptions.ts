import { UsersApi } from '@shared/api/baseQuerys';
import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

/** Поле «Категории ВУ» (driver.licenseClass / licenceClass). */
export function isReportDriverLicenceClassAttribute(attribute: string | undefined): boolean {
  const raw = (attribute ?? '').trim();
  if (!raw) return false;
  const leaf = raw.includes('.') ? raw.slice(raw.lastIndexOf('.') + 1) : raw;
  const n = leaf.toLowerCase();
  return n === 'licenseclass' || n === 'licenceclass';
}

function unwrapLicenceClassList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { content?: unknown }).content)) {
    return (raw as { content: unknown[] }).content;
  }
  return [];
}

function buildDriverLicenceClassValues(raw: unknown, searchQuery: string): Values {
  const list = unwrapLicenceClassList(raw);
  if (!list.length) return [];

  const seen = new Set<string>();
  const values: Values = [];
  for (const item of list) {
    if (item == null) continue;
    if (typeof item === 'string' || typeof item === 'number') {
      const value = String(item).trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      values.push({ value, label: value });
      continue;
    }
    if (typeof item !== 'object') continue;
    const option = item as { value?: unknown; label?: unknown; key?: unknown };
    const rawValue = option.value ?? option.key ?? option.label;
    if (rawValue == null || rawValue === '') continue;
    const value = String(rawValue).trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    values.push({
      value,
      label: String(option.label ?? option.value ?? option.key ?? value),
    });
  }

  const match = Formatters.removeExtraSpaces(searchQuery ?? '').toLowerCase();
  const filtered = match
    ? values.filter((option) => String(option.label).toLowerCase().includes(match))
    : values;

  return filtered.sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru', {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}

/** GET api/v1/front-data/driver-licence-class — категории ВУ для фильтра «Водитель → Категории ВУ». */
export async function fetchDriverLicenceClassFilterValueOptions(
  searchQuery: string,
): Promise<Values> {
  const res = await UsersApi.getDriverLicenceClasses();
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'report driver-licence-class failed');
  }
  return buildDriverLicenceClassValues(res.data, searchQuery);
}
