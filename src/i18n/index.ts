import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en';
import ru from './ru';

const savedLang =
  typeof window !== 'undefined'
    ? localStorage.getItem('boris_ui_lang') || localStorage.getItem('i18nextLng') || 'ru'
    : 'ru';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ru: { translation: ru } },
    fallbackLng: 'ru',
    lng: savedLang.startsWith('en') ? 'en' : 'ru',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'boris_ui_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
