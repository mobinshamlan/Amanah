"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshIcon } from "@/components/icons";
import {
  PageHeading,
  PageShell,
  primaryButtonLargeClassName,
  textLinkClassName,
} from "@/components/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { errors } from "@/i18n/messages/errors";

// A screen that broke while rendering. Calm words, a retry and a way home.
// Only the digest is shown: it matches the server log without exposing details.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useMessages(errors).error;
  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : null;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell hideBack>
      <div role="alert">
        <PageHeading context={t.context} title={t.title} intro={t.intro} />
        <p className="mt-3 max-w-[58ch] text-body text-foreground/85">{t.next}</p>
      </div>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
        <button type="button" onClick={() => retry()} className={primaryButtonLargeClassName}>
          <RefreshIcon className="size-4" />
          {t.retry}
        </button>
        <Link href="/" className={textLinkClassName}>
          {t.home}
        </Link>
      </div>
      {digest ? (
        <p className="mt-8 text-small text-muted-foreground">
          {t.reference}: <span dir="ltr" lang="en" data-numeric>{digest}</span>
        </p>
      ) : null}
    </PageShell>
  );
}
