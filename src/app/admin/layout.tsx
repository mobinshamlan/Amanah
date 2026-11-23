import type { Metadata } from "next";
import { admin } from "@/i18n/messages/admin";
import { getMessages } from "@/i18n/server";

// The staff workspace shares the public site's palette and type; the frame is
// drawn by AdminShell.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(admin);
  return { title: t.metaTitle, robots: { index: false, follow: false } };
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
}
