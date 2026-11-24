"use client";

import { Wordmark } from "@/components/site-header";
import {
  primaryButtonLargeClassName,
  secondaryButtonClassName,
} from "@/components/ui";
import { errors } from "@/i18n/messages/errors";
import "./globals.css";

// The last resort when the root layout itself fails. It renders its own
// document, so the visitor's language may be unknown: both languages are
// shown, Arabic first. Links are plain anchors for a full, fresh load.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const ar = errors.ar.global;
  const en = errors.en.global;

  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <title>{`${ar.title} | ${en.title}`}</title>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-12 sm:px-8 sm:py-20">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load after the root failed */}
          <a href="/" aria-label="أمانة، الصفحة الرئيسية" className="w-fit rounded-lg">
            <Wordmark />
          </a>
          <div role="alert" className="flex flex-col gap-8">
            <section className="flex flex-col gap-3">
              <h1 className="text-title text-foreground">{ar.title}</h1>
              <p className="max-w-[58ch] text-lead text-foreground/85">{ar.body}</p>
            </section>
            <span aria-hidden className="perforation block text-border" />
            <section lang="en" dir="ltr" className="flex flex-col gap-3">
              <h2 className="text-heading text-foreground">{en.title}</h2>
              <p className="max-w-[58ch] text-body text-foreground/85">{en.body}</p>
            </section>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <button type="button" onClick={() => retry()} className={primaryButtonLargeClassName}>
              {ar.retry}
              <span aria-hidden className="text-primary-foreground/60">|</span>
              <span lang="en">{en.retry}</span>
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full load after the root failed */}
            <a href="/" className={secondaryButtonClassName}>
              {ar.home}
              <span aria-hidden className="text-muted-foreground">|</span>
              <span lang="en">{en.home}</span>
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
