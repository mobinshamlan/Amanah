// Amanah speaks Arabic first and English second. The visitor's choice lives in
// one cookie, so every route keeps its address and private links stay the same.

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export type Direction = "rtl" | "ltr";

export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_COOKIE = "amanah-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "ar" || value === "en";
}

export function directionOf(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * A message catalogue: the English entries define the shape and the Arabic
 * entries must match it. Entries may be strings or small formatting functions.
 */
export type Catalogue<T> = Record<Locale, T>;

export function pick<T>(catalogue: Catalogue<T>, locale: Locale): T {
  return catalogue[locale];
}
