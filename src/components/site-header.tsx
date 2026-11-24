"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  focusRingClassName,
  focusRingOnDarkClassName,
  frameClassName,
} from "@/components/frame";
import { ArrowStartIcon, KeyholeMark } from "@/components/icons";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useMessages } from "@/i18n/LocaleProvider";
import { common } from "@/i18n/messages/common";

/*
  Site chrome: wordmark, header, footer and the back link. This module is a
  client module so the same header can sit inside server pages and inside
  client screens (the report form, the tracking page) while reading the
  visitor's language from context.

  Two tones. "paper" is the light tone for every inner page; "pine" is the
  dark tone for the homepage stage.
*/

type Tone = "paper" | "pine";

function focusFor(tone: Tone) {
  return tone === "pine" ? focusRingOnDarkClassName : focusRingClassName;
}

/** AMANAH | أمانة beside the keyhole mark. Always Latin first, then Arabic. */
export function Wordmark({
  tone = "paper",
  size = "md",
}: {
  tone?: Tone;
  size?: "md" | "lg";
}) {
  const dark = tone === "pine";
  const large = size === "lg";
  return (
    <span dir="ltr" className={`inline-flex items-center ${large ? "gap-4" : "gap-2.5 sm:gap-3"}`}>
      <KeyholeMark
        tone={dark ? "paper" : "pine"}
        className={large ? "size-10 sm:size-14" : "size-8 sm:size-9"}
      />
      <span
        lang="en"
        className={`font-wordmark-latin font-semibold leading-none tracking-[0.16em] ${
          large ? "text-3xl sm:text-5xl" : "text-xl sm:text-2xl"
        } ${dark ? "text-paper" : "text-foreground"}`}
      >
        AMANAH
      </span>
      <span
        aria-hidden
        className={`${large ? "h-6 sm:h-8" : "h-4"} w-px ${dark ? "bg-brass-light/70" : "bg-brass/80"}`}
      />
      <span
        lang="ar"
        dir="rtl"
        className={`font-wordmark-arabic leading-none ${
          large ? "text-3xl sm:text-5xl" : "text-xl sm:text-2xl"
        } ${dark ? "text-brass-light" : "text-pine"}`}
      >
        أمانة
      </span>
    </span>
  );
}

function navLinkClassName(tone: Tone, quiet: boolean) {
  const shape =
    "inline-flex min-h-11 items-center rounded-full px-2.5 text-sm font-medium transition-colors sm:px-3.5 sm:text-small";
  if (tone === "pine") {
    return `${shape} ${
      quiet
        ? "text-paper/75 underline-offset-4 hover:text-paper hover:underline"
        : "text-paper/90 hover:bg-paper/10 hover:text-paper"
    }`;
  }
  return `${shape} ${
    quiet
      ? "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      : "text-foreground/85 hover:bg-secondary hover:text-foreground"
  }`;
}

/**
 * Header: wordmark, the two ways to report, a quieter "check my report", and
 * the language switch. On phones the wordmark and switch share the first row
 * and the links take a full row below, so nothing is hidden behind a menu.
 */
export function SiteHeader({ tone = "paper" }: { tone?: Tone }) {
  const t = useMessages(common);
  const dark = tone === "pine";
  const focus = focusFor(tone);

  const links = [
    { href: "/report/lost", label: t.reportLost, quiet: false },
    { href: "/report/found", label: t.reportFound, quiet: false },
    { href: "/report/track", label: t.checkReport, quiet: true },
  ];

  return (
    <header className={dark ? "bg-pine-deep text-paper" : "bg-background text-foreground"}>
      <a
        href="#main"
        className={`sr-only rounded-full bg-paper px-4 py-2 text-sm font-semibold text-pine-deep focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-20 ${focus}`}
      >
        {t.skipToContent}
      </a>
      <div
        className={`${frameClassName} flex flex-wrap items-center gap-x-3 gap-y-1 py-3 sm:min-h-20 sm:flex-nowrap sm:gap-x-6 sm:py-0`}
      >
        <Link href="/" aria-label={t.homeLabel} className={`rounded-lg ${focus}`}>
          <Wordmark tone={tone} />
        </Link>
        <LanguageSwitch tone={tone} className="ms-auto sm:order-last sm:ms-0" />
        <nav
          aria-label={t.navLabel}
          className="-ms-2.5 basis-full sm:ms-auto sm:basis-auto"
        >
          <ul className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
            {links.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${navLinkClassName(tone, item.quiet)} ${focus}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/** "Back" link with an arrow that points to the start of the line in both directions. */
export function BackLink({
  href = "/",
  label,
  className = "",
}: {
  href?: string;
  label?: ReactNode;
  className?: string;
}) {
  const t = useMessages(common);
  return (
    <Link
      href={href}
      className={`-ms-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground ${focusFor("paper")} ${className}`}
    >
      <ArrowStartIcon className="size-4" />
      {label ?? t.backHome}
    </Link>
  );
}

/**
 * The close of every public page: the name returns at full size with its
 * meaning, the three links, and the privacy promise. Always on deep pine.
 */
export function SiteFooter() {
  const t = useMessages(common);
  const focus = focusFor("pine");
  const links = [
    { href: "/report/lost", label: t.reportLost },
    { href: "/report/found", label: t.reportFound },
    { href: "/report/track", label: t.checkReport },
    { href: "/demo", label: t.tryDemo },
  ];

  return (
    <footer className="bg-pine-deep text-paper">
      <div className={`${frameClassName} flex flex-col gap-8 pb-8 pt-12 sm:gap-10 sm:pb-10 sm:pt-20`}>
        <div className="flex flex-col gap-6 sm:gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="flex max-w-2xl flex-col gap-4 sm:gap-6">
            <Link href="/" aria-label={t.homeLabel} className={`w-fit rounded-lg ${focus}`}>
              <Wordmark tone="pine" size="lg" />
            </Link>
            <div className="flex flex-col gap-2">
              <p className="text-title text-paper">{t.tagline}</p>
              <p className="max-w-[40ch] text-body text-paper/80 sm:text-lead">{t.taglineExplainer}</p>
            </div>
          </div>
          <nav aria-label={t.footerNavLabel} className="lg:shrink-0">
            <ul className="-ms-3 grid grid-cols-2 gap-x-2 sm:flex sm:flex-row sm:flex-wrap sm:gap-2 lg:flex-col lg:items-end lg:gap-1">
              {links.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`inline-flex min-h-11 items-center rounded-full px-3 text-body font-medium text-paper/85 underline-offset-4 transition-colors hover:text-paper hover:underline ${focus}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <span aria-hidden className="perforation block text-brass-light/40" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="max-w-[60ch] text-small text-paper/70">
            {t.footerPrivacy} {t.footerStaff}
          </p>
          <LanguageSwitch tone="pine" className="w-fit" />
        </div>
      </div>
    </footer>
  );
}
