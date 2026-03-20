/** Языки приложения (код i18n → короткая метка в UI). */
export const APP_LANGUAGES = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
  { code: 'kk', label: 'KZ' },
  { code: 'ky', label: 'KG' },
  { code: 'be', label: 'BY' },
  { code: 'uz', label: 'UZ' },
] as const;

export type AppLanguageCode = (typeof APP_LANGUAGES)[number]['code'];
