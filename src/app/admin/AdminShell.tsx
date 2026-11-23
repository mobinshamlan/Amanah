import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowStartIcon,
  CompareIcon,
  ListIcon,
  PulseIcon,
  SearchIcon,
  ShieldIcon,
} from "@/components/icons";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Wordmark } from "@/components/site-header";
import { focusRingClassName } from "@/components/ui";
import type { AdminMessages } from "@/i18n/messages/admin";

// The staff workspace frame: the wordmark and a labelled sidebar on the paper
// ground, one card work sheet per section. Under lg the sidebar folds into a
// top bar with the section links wrapped below it, so every section stays one
// tap away. Navigation keeps the same /admin?section=… links as before.

export type AdminSectionKey = "matches" | "candidates" | "claims" | "reports" | "monitoring";

export type AdminNavItem = {
  key: AdminSectionKey;
  label: string;
  // A count only on a queue that needs action, with its noun for screen readers.
  count?: { value: number; label: string } | null;
  // A short problem notice, e.g. "Last check failed".
  alert?: string | null;
};

const ICONS: Record<AdminSectionKey, (props: { className?: string }) => ReactNode> = {
  matches: CompareIcon,
  candidates: SearchIcon,
  claims: ShieldIcon,
  reports: ListIcon,
  monitoring: PulseIcon,
};

function sectionHref(key: AdminSectionKey) {
  return `/admin?section=${key}`;
}

function Badge({ item }: { item: AdminNavItem }) {
  if (item.alert) {
    return (
      <span className="ms-auto flex items-center gap-1.5 ps-1">
        <span aria-hidden className="size-2.5 rounded-full bg-destructive" />
        <span className="sr-only">{item.alert}</span>
      </span>
    );
  }
  if (item.count && item.count.value > 0) {
    return (
      <span className="ms-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-caption font-semibold tabular-nums text-primary-foreground">
        {item.count.value}
        <span className="sr-only"> {item.count.label}</span>
      </span>
    );
  }
  return null;
}

function Brand({ t }: { t: AdminMessages }) {
  return (
    <Link href="/admin" className={`flex w-fit flex-col gap-1 rounded-xl py-1 pe-2 ${focusRingClassName}`}>
      <Wordmark tone="paper" />
      <span className="text-caption font-medium text-muted-foreground">{t.workspace}</span>
    </Link>
  );
}

function NavLinks({
  nav,
  active,
  layout,
}: {
  nav: AdminNavItem[];
  active: AdminSectionKey | null;
  layout: "side" | "top";
}) {
  return (
    <ul className={layout === "side" ? "flex flex-col gap-1" : "flex flex-wrap gap-1.5"}>
      {nav.map((item) => {
        const Icon = ICONS[item.key];
        const current = item.key === active;
        return (
          <li key={item.key} className="min-w-0">
            <Link
              href={sectionHref(item.key)}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full py-1.5 text-small leading-tight transition-colors duration-150 ${
                layout === "side" ? "px-3.5" : "px-3"
              } ${focusRingClassName} ${
                current
                  ? "bg-secondary font-semibold text-foreground"
                  : "text-foreground/75 hover:bg-secondary/70 hover:text-foreground"
              }`}
            >
              <Icon className={`size-[1.125rem] shrink-0 ${current ? "text-forest" : ""} ${layout === "top" ? "hidden sm:block" : ""}`} />
              <span className="min-w-0">{item.label}</span>
              <Badge item={item} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function LocalNote({ t, short = false }: { t: AdminMessages; short?: boolean }) {
  return (
    <p className={`flex items-start gap-2 text-caption text-muted-foreground ${short ? "" : "max-w-[32ch]"}`}>
      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brass" />
      <span>{t.localNote}</span>
    </p>
  );
}

export function AdminShell({
  active,
  nav,
  title,
  subline,
  actions,
  t,
  children,
}: {
  active: AdminSectionKey | null;
  nav: AdminNavItem[];
  title: string;
  subline?: ReactNode;
  actions?: ReactNode;
  t: AdminMessages;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only rounded-full bg-primary px-4 text-small font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-20 focus:inline-flex focus:min-h-11 focus:items-center"
      >
        {t.skipToContent}
      </a>

      {/* Sidebar (desktop). */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-8 lg:overflow-y-auto lg:px-4 lg:py-6">
        <Brand t={t} />
        <nav aria-label={t.navLabel}>
          <NavLinks nav={nav} active={active} layout="side" />
        </nav>
        <div className="mt-auto flex flex-col gap-4 px-1">
          <p className="max-w-[32ch] text-caption text-muted-foreground">{t.staffDecide}</p>
          <LocalNote t={t} />
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitch tone="paper" />
            <Link
              href="/"
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-small font-medium text-foreground underline-offset-4 transition-colors hover:text-forest hover:underline ${focusRingClassName}`}
            >
              <ArrowStartIcon className="size-4" />
              {t.backHome}
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar and section links (tablet and phone). */}
        <header className="flex flex-col gap-3 px-3 pb-3 pt-3 sm:px-5 lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <Brand t={t} />
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className={`hidden min-h-11 items-center gap-1.5 rounded-full px-3 text-small font-medium text-foreground hover:text-forest sm:inline-flex ${focusRingClassName}`}
              >
                <ArrowStartIcon className="size-4" />
                {t.backHome}
              </Link>
              <LanguageSwitch tone="paper" />
            </div>
          </div>
          <nav aria-label={t.navLabel}>
            <NavLinks nav={nav} active={active} layout="top" />
          </nav>
          <LocalNote t={t} short />
        </header>

        <main
          id="main"
          className="min-w-0 flex-1 rounded-t-[1.75rem] bg-card lg:my-3 lg:me-3 lg:rounded-[1.75rem]"
        >
          <div className="flex flex-col gap-4 px-4 pb-5 pt-6 sm:px-7 sm:pt-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-heading text-foreground">{title}</h1>
              {subline ? <p className="mt-2 max-w-[70ch] text-small text-foreground/85">{subline}</p> : null}
            </div>
            {actions ? <div className="min-w-0 shrink-0">{actions}</div> : null}
          </div>
          <div className="px-4 pb-12 sm:px-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
