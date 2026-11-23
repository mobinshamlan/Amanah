import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  pick,
  type Catalogue,
  type Locale,
} from "@/i18n/config";

/** The visitor's language, read from the cookie. Server components and actions only. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Messages for the visitor's language, for server components and server actions. */
export async function getMessages<T>(catalogue: Catalogue<T>): Promise<T> {
  return pick(catalogue, await getLocale());
}
