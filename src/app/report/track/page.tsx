import type { Metadata } from "next";
import TrackReport from "@/app/report/track/TrackReport";
import { getMessages } from "@/i18n/server";
import { track } from "@/i18n/messages/track";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(track);
  return {
    title: t.metaTitle,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default function TrackReportPage() {
  return <TrackReport />;
}
