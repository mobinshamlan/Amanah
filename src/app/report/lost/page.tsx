import type { Metadata } from "next";
import ReportForm from "@/app/report/ReportForm";
import { report } from "@/i18n/messages/report";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(report);
  return {
    title: t.kinds.lost.metaTitle,
    description: t.kinds.lost.metaDescription,
  };
}

export default function ReportLostPage() {
  return <ReportForm reportType="lost" />;
}
