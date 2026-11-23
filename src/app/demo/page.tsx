import type { Metadata } from "next";
import { GuidedDemo } from "@/app/demo/GuidedDemo";
import "@/app/demo/demo.css";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { demo } from "@/i18n/messages/demo";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(demo);
  return { title: t.metaTitle, description: t.metaDescription };
}

// The guided demo continues the homepage's pine stage: a conversation at the
// lost-property desk, entirely in the visitor's browser. See GuidedDemo.tsx.
export default function DemoPage() {
  return (
    <>
      <SiteHeader tone="pine" />
      <main id="main" className="flex-1 bg-pine-deep text-paper">
        <GuidedDemo />
      </main>
      <SiteFooter />
    </>
  );
}
