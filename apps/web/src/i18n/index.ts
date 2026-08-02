import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import tw from './locales/tw.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tw: { translation: tw },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Keep <html lang> in sync with the active language so assistive tech announces content
// correctly after a switch (see Profile.tsx's language toggle).
if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
  });
}

export default i18n;
