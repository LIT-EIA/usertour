import type { Locale } from 'date-fns';
import { enUS, frCA } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

// Maps i18next language codes to their date-fns locale
const dateFnsLocales: Record<string, Locale> = {
  en: enUS,
  'en-US': enUS,
  fr: frCA,
  'fr-CA': frCA,
};

// Resolves the date-fns locale for the currently selected app language
export const useDateFnsLocale = (): Locale => {
  const { i18n } = useTranslation();
  return dateFnsLocales[i18n.language] ?? enUS;
};
