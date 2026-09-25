import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importamos los archivos que acabas de crear
import es from './locales/es.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector) // Detecta el idioma del navegador
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en }
    },
    fallbackLng: 'en', // Si no detecta idioma, usa Inglés
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;