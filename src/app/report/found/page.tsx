import type { Metadata } from "next";
import ReportForm from "@/app/report/ReportForm";
import { report } from "@/i18n/messages/report";
import { getMessages } from "@/i18n/server";
import { isSandboxMode } from "@/utils/sandbox";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(report);
  return {
    title: t.kinds.found.metaTitle,
    description: t.kinds.found.metaDescription,
  };
}

export default function ReportFoundPage() {
  return <ReportForm reportType="found" sandbox={isSandboxMode()} />;
}
