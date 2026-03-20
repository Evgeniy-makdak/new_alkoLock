/** Языки приложения (код i18n → метка, название в модалке). PNG флагов — `widgets/nav_bar/ui/flags` (см. languageFlagAssets). */
export const APP_LANGUAGES = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
  { code: 'kk', label: 'KZ' },
  { code: 'ky', label: 'KG' },
  { code: 'be', label: 'BY' },
  { code: 'uz', label: 'UZ' },
] as const;

export type AppLanguageCode = (typeof APP_LANGUAGES)[number]['code'];
export type AppLanguageDef = (typeof APP_LANGUAGES)[number];

export function getAppLanguageByCode(code: string): AppLanguageDef {
  const base = (code || 'ru').split('-')[0].toLowerCase();
  const found = APP_LANGUAGES.find((l) => l.code === base);
  return found ?? APP_LANGUAGES[0];
}
