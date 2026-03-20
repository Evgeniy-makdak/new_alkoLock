import { type ReactElement, type ReactNode, isValidElement } from 'react';

const OBJECT_STRING_KEYS = [
  'fullName',
  'name',
  'email',
  'naming',
  'title',
  'text',
  'label',
  'firstName',
  'surname',
  'middleName',
  'manufacturer',
  'model',
  'registrationNumber',
  'vin',
] as const;

function labelFromPlainObject(o: Record<string, unknown>): string {
  for (const k of OBJECT_STRING_KEYS) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number') return String(v);
  }
  const sn = o.surname;
  const fn = o.firstName;
  const mn = o.middleName;
  const parts = [sn, fn, mn].filter((x) => typeof x === 'string' && x.trim());
  if (parts.length) return parts.join(' ');
  return '';
}

/**
 * Строка для интерполяции i18n ({{name}}): ReactNode, JSX, массив детей или plain-object (IUser, ICar, …).
 * Иначе в шаблон попадает объект и отображается "[object Object]".
 */
export function entityLabelForI18n(value: unknown): string {
  if (value == null || typeof value === 'boolean') {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(entityLabelForI18n).join('');
  }
  if (isValidElement(value)) {
    const props = (value as ReactElement<{ children?: ReactNode }>).props;
    return entityLabelForI18n(props?.children);
  }
  if (typeof value === 'object') {
    return labelFromPlainObject(value as Record<string, unknown>);
  }
  return '';
}

/** @deprecated Используйте entityLabelForI18n; оставлено для совместимости импортов */
export const reactNodeToPlainText = entityLabelForI18n;
