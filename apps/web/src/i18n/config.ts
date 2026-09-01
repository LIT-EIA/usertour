import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enUSUi from '@usertour-packages/i18n/en-US/ui';
import frCAUi from '@usertour-packages/i18n/fr-CA/ui';

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: process.env.NODE_ENV === 'development',
    defaultNS: 'ui',
    resources: {
      en: {
        ui: enUSUi,
      },
      'fr-CA': {
        ui: frCAUi,
      },
      fr: {
        ui: frCAUi,
      },
    },
    // if you see an error like: "Argument of type 'DefaultTFuncReturn' is not assignable to parameter of type xyz"
    // set returnNull to false (and also in the i18next.d.ts options)
    // returnNull: false,
  });
