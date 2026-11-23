import type { Locale } from "@/i18n/config";

// Saudi Arabic with Latin digits and the Gregorian calendar: ar-SA alone
// defaults to the Umm al-Qura calendar, which staff records do not use.
const INTL_LOCALE: Record<Locale, string> = {
  ar: "ar-SA-u-nu-latn-ca-gregory",
  en: "en-GB",
};

export function intlLocale(locale: Locale) {
  return INTL_LOCALE[locale];
}

export function formatDateTime(value: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDate(value: string | Date, locale: Locale) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], options).format(value);
}
