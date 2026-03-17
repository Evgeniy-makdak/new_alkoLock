import { initReactI18next } from 'react-i18next';

import i18n from 'i18next';

import en from './locales/en.json';
import kk from './locales/kk.json';
import ky from './locales/ky.json';
import ru from './locales/ru.json';

const LANGUAGE_KEY = 'app_language';

export const getStoredLanguage = (): string => {
  try {
    return localStorage.getItem(LANGUAGE_KEY) || 'ru';
  } catch {
    return 'ru';
  }
};

export const setStoredLanguage = (lang: string): void => {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // ignore
  }
};

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
    kk: { translation: kk },
    ky: { translation: ky },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
