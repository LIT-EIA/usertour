import { isUndefined } from '@usertour/helpers';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, formatDistanceStrict, type Locale } from 'date-fns';
import { enUS, frCA } from 'date-fns/locale';
import i18next from 'i18next';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Maps i18next language codes to their date-fns locale
const dateFnsLocales: Record<string, Locale> = {
  en: enUS,
  'en-US': enUS,
  fr: frCA,
  'fr-CA': frCA,
};

// Resolves the date-fns locale for the currently selected app language
export const getDateFnsLocale = (): Locale => {
  return dateFnsLocales[i18next.language] ?? enUS;
};

// Locale-aware wrapper around date-fns' format()
export const formatDate = (date: Date | number, formatStr: string): string => {
  return format(date, formatStr, { locale: getDateFnsLocale() });
};

// Locale-aware wrapper around date-fns' formatDistanceToNow()
export const formatRelativeTime = (
  date: Date | number,
  options?: { addSuffix?: boolean },
): string => {
  return formatDistanceToNow(date, { ...options, locale: getDateFnsLocale() });
};

// Locale-aware wrapper around date-fns' formatDistanceStrict()
export const formatDistanceStrictLocalized = (
  date: Date | number,
  baseDate: Date | number,
): string => {
  return formatDistanceStrict(date, baseDate, { locale: getDateFnsLocale() });
};

// Utility function to format different data types for display
export const formatAttributeValue = (value: any): string => {
  if (isUndefined(value)) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'object' && Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return formatDate(new Date(value), 'PPpp');
  }

  return `${value}`;
};
