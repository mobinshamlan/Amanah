import type { Metadata } from "next";
import {
  Amiri,
  Cormorant_Garamond,
  IBM_Plex_Sans,
  IBM_Plex_Sans_Arabic,
} from "next/font/google";
import { directionOf } from "@/i18n/config";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { common } from "@/i18n/messages/common";
import { getLocale } from "@/i18n/server";
import { SITE_URL, pageMetadata } from "@/app/social-metadata";
import "./globals.css";

// Interface type: IBM Plex Sans Arabic for Arabic, IBM Plex Sans for English.
// The two share one skeleton, so a page reads as one voice in either language.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// The wordmark only: AMANAH in Cormorant, أمانة in Amiri.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["600"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = common[locale];
  return {
    metadataBase: new URL(SITE_URL),
    ...pageMetadata({ title: t.metaTitle, description: t.metaDescription, path: "/", locale }),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={`${plexArabic.variable} ${plex.variable} ${cormorant.variable} ${amiri.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
