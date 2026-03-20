import type { TFunction } from 'i18next';

/** Название бренда: ru — из ru-локали; be — русский вариант; остальные — EN (Laser Systems). */
export function brandNameLabel(t: TFunction, language: string): string {
  const code = language.split('-')[0]?.toLowerCase() ?? '';
  if (code === 'ru') {
    return t('nav.brandName');
  }
  if (code === 'be') {
    return t('nav.brandName', { lng: 'ru' });
  }
  return t('nav.brandName', { lng: 'en' });
}
