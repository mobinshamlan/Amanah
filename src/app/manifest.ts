import type { MetadataRoute } from "next";
import { common } from "@/i18n/messages/common";

// Install details for browsers. Arabic first, like the site; colours are the
// pine-deep stage and the paper ground from the design tokens.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AMANAH | أمانة",
    short_name: "Amanah",
    description: common.ar.metaDescription,
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#163A33",
    background_color: "#F5F0E6",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
