import type { Metadata } from "next";
import Link from "next/link";
import { ArrowEndIcon } from "@/components/icons";
import {
  Notice,
  PageHeading,
  PageShell,
  primaryButtonLargeClassName,
  textLinkClassName,
} from "@/components/ui";
import { errors } from "@/i18n/messages/errors";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getMessages(errors)).notFound;
  return { title: t.metaTitle };
}

// A missing address. It says only that the page isn't here: never whether a
// report, a link or a match exists.
export default async function NotFound() {
  const t = (await getMessages(errors)).notFound;
  return (
    <PageShell hideBack>
      <PageHeading context={t.context} title={t.title} intro={t.intro} />
      <Notice className="mt-8 max-w-[58ch]">{t.privateLink}</Notice>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
        <Link href="/" className={primaryButtonLargeClassName}>
          {t.home}
        </Link>
        <Link href="/report/lost" className={textLinkClassName}>
          {t.reportLost}
          <ArrowEndIcon className="size-4" />
        </Link>
      </div>
    </PageShell>
  );
}
