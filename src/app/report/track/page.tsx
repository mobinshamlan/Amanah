import type { Metadata } from "next";
import TrackReport from "@/app/report/track/TrackReport";

export const metadata: Metadata = {
  title: "Track your report — AMANAH",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function TrackReportPage() {
  return <TrackReport />;
}
