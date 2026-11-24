import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";

/*
  What a shared link shows on LinkedIn, WhatsApp and X. The preview images are
  the `opengraph-image.jpg` files beside each page; this adds the title,
  description and address around them. Metadata merges shallowly, so every
  page that sets its own title passes it through here.
*/
export const SITE_URL = "https://amanah-iota.vercel.app";

export function pageMetadata({
  title,
  description,
  path,
  locale,
}: {
  title: string;
  description: string;
  path: string;
  locale: Locale;
}): Metadata {
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "AMANAH | أمانة",
      title,
      description,
      url: path,
      locale: locale === "ar" ? "ar_SA" : "en_GB",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
