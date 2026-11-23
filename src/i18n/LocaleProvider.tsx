"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  directionOf,
  pick,
  type Catalogue,
  type Direction,
  type Locale,
} from "@/i18n/config";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): { locale: Locale; dir: Direction } {
  const locale = useContext(LocaleContext);
  return { locale, dir: directionOf(locale) };
}

/** Messages for the visitor's language, for client components. */
export function useMessages<T>(catalogue: Catalogue<T>): T {
  return pick(catalogue, useContext(LocaleContext));
}
