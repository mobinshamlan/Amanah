import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertIcon,
  ArrowEndIcon,
  ArrowStartIcon,
  ChevronDownIcon,
  CompareIcon,
  ListIcon,
  PulseIcon,
  SearchIcon,
  ShieldIcon,
} from "@/components/icons";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Wordmark } from "@/components/site-header";
import {
  focusRingClassName,
  focusRingOnDarkClassName,
  primaryOnDarkButtonClassName,
} from "@/components/ui";
import type { AdminMessages } from "@/i18n/messages/admin";

// The staff workspace frame. A shallow pine band carries the wordmark, the
// section's title and its status line (like the tracking page), plus what
// needs staff now on first load. Below it, the paper workspace: a sidebar on
// desktop and one card work sheet per section. On phones the sidebar becomes
// one labelled section picker inside the band. Navigation keeps the same
// /admin?section=… links as before.

export type AdminSectionKey = "matches" | "candidates" | "claims" | "reports" | "monitoring";

export type AdminNavItem = {
  key: AdminSectionKey;
  label: string;
  // A count only on a queue that needs action, with its noun for screen readers.
  count?: { value: number; label: string } | null;
  // A short problem notice, e.g. "Last check failed".
  alert?: string | null;
};

// One line of the "Needs you now" summary. `tone="info"` is work that waits
// on someone else; it is listed so staff know, but it is not a staff task.
export type NeedsYouItem = {
  href: string;
  label: string;
  tone?: "task" | "alert" | "info";
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

function Badge({ item, onDark = false }: { item: AdminNavItem; onDark?: boolean }) {
  if (item.alert) {
    return (
      <span className="ms-auto flex items-center gap-1.5 ps-1">
        <span aria-hidden className={`size-2.5 rounded-full ${onDark ? "bg-bad-soft" : "bg-destructive"}`} />
        <span className="sr-only">{item.alert}</span>
      </span>
    );
  }
  if (item.count && item.count.value > 0) {
    return (
      <span
        className={`ms-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-caption font-semibold tabular-nums ${
          onDark ? "bg-paper text-pine-deep" : "bg-primary text-primary-foreground"
        }`}
      >
        {item.count.value}
        <span className="sr-only"> {item.count.label}</span>
      </span>
    );
  }
  return null;
}

function Brand({ t }: { t: AdminMessages }) {
  return (
    <Link
      href="/admin"
      className={`flex w-fit min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl py-1 pe-2 ${focusRingOnDarkClassName}`}
    >
      <Wordmark tone="pine" />
      <span className="text-caption font-medium text-paper/75">{t.workspace}</span>
    </Link>
  );
}

function SideNav({ nav, active }: { nav: AdminNavItem[]; active: AdminSectionKey | null }) {
  return (
    <ul className="flex flex-col gap-1">
      {nav.map((item) => {
        const Icon = ICONS[item.key];
        const current = item.key === active;
        return (
          <li key={item.key} className="min-w-0">
            <Link
              href={sectionHref(item.key)}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full px-3.5 py-1.5 text-small leading-tight transition-colors duration-150 ${focusRingClassName} ${
                current
                  ? "bg-secondary font-semibold text-foreground"
                  : "text-foreground/75 hover:bg-secondary/70 hover:text-foreground"
              }`}
            >
              <Icon className={`size-[1.125rem] shrink-0 ${current ? "text-forest" : ""}`} />
              <span className="min-w-0">{item.label}</span>
              <Badge item={item} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Phones and tablets: one labelled picker showing the current section; the list opens under it. */
function SectionPicker({
  nav,
  active,
  t,
}: {
  nav: AdminNavItem[];
  active: AdminSectionKey | null;
  t: AdminMessages;
}) {
  const current = nav.find((item) => item.key === active);
  const CurrentIcon = current ? ICONS[current.key] : null;
  return (
    <details className="group rounded-[1.25rem] bg-paper/10 lg:hidden">
      <summary
        className={`flex min-h-12 cursor-pointer list-none items-center gap-2.5 rounded-[1.25rem] px-4 text-small text-paper [&::-webkit-details-marker]:hidden ${focusRingOnDarkClassName}`}
      >
        <span className="text-paper/75">{t.sectionPicker}:</span>
        {CurrentIcon ? <CurrentIcon className="size-[1.125rem] shrink-0 text-brass-light" /> : null}
        <span className="min-w-0 truncate font-semibold">{current?.label ?? t.workspace}</span>
        {current ? <Badge item={current} onDark /> : <span className="ms-auto" />}
        <ChevronDownIcon className="size-4 shrink-0 transition-transform duration-150 group-open:rotate-180" />
      </summary>
      <nav aria-label={t.navLabel} className="px-2 pb-3">
        <ul className="flex flex-col gap-0.5 border-t border-paper/15 pt-2">
          {nav.map((item) => {
            const Icon = ICONS[item.key];
            const selected = item.key === active;
            return (
              <li key={item.key}>
                <Link
                  href={sectionHref(item.key)}
                  aria-current={selected ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2.5 rounded-full px-3 text-small transition-colors duration-150 ${focusRingOnDarkClassName} ${
                    selected ? "bg-paper/15 font-semibold text-paper" : "text-paper/85 hover:bg-paper/10"
                  }`}
                >
                  <Icon className="size-[1.125rem] shrink-0" />
                  <span className="min-w-0">{item.label}</span>
                  <Badge item={item} onDark />
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 px-3 text-caption text-paper/70">{t.localNote}</p>
      </nav>
    </details>
  );
}

/** What needs staff now, each line a link to its queue. */
function NeedsYou({ items, t }: { items: NeedsYouItem[]; t: AdminMessages }) {
  return (
    <section aria-labelledby="needs-you-title" className="flex min-w-0 flex-col gap-2">
      <h2 id="needs-you-title" className="text-small font-semibold text-paper/80">
        {t.needsYou.title}
      </h2>
      {items.length === 0 ? (
        <p className="text-small text-paper">{t.needsYou.nothing}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.label} className="min-w-0">
              <Link
                href={item.href}
                className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-full px-4 py-1.5 text-small transition-colors duration-150 ${focusRingOnDarkClassName} ${
                  item.tone === "info"
                    ? "border border-paper/25 text-paper/85 hover:border-paper/50"
                    : "bg-paper/12 font-semibold text-paper hover:bg-paper/20"
                }`}
              >
                {item.tone === "alert" ? <AlertIcon className="size-4 shrink-0 text-bad-soft" /> : null}
                <span className="min-w-0">{item.label}</span>
                <ArrowEndIcon className="size-4 shrink-0 opacity-80" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminShell({
  active,
  nav,
  title,
  subline,
  actions,
  next,
  needsYou,
  t,
  children,
}: {
  active: AdminSectionKey | null;
  nav: AdminNavItem[];
  title: string;
  subline?: ReactNode;
  // Controls for the work sheet itself (filters); shown on paper above the content.
  actions?: ReactNode;
  // The one next step for this section, shown in the band.
  next?: { href: string; label: string } | null;
  // Shown on first load only.
  needsYou?: NeedsYouItem[] | null;
  t: AdminMessages;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      <a
        href="#main"
        className="sr-only rounded-full bg-paper px-4 text-small font-semibold text-pine-deep focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-20 focus:inline-flex focus:min-h-11 focus:items-center"
      >
        {t.skipToContent}
      </a>

      <header className="bg-pine-deep text-paper">
        <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-6 lg:pt-4">
          <Brand t={t} />
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/"
              className={`hidden min-h-11 items-center gap-1.5 rounded-full px-3 text-small font-medium text-paper/85 transition-colors hover:text-paper sm:inline-flex ${focusRingOnDarkClassName}`}
            >
              <ArrowStartIcon className="size-4" />
              {t.backHome}
            </Link>
            <LanguageSwitch tone="pine" />
          </div>
        </div>

        <div className="flex flex-col gap-4 px-4 pb-5 pt-3 sm:px-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-x-0 lg:pb-6 lg:pe-6 lg:ps-0 lg:pt-4">
          <SectionPicker nav={nav} active={active} t={t} />
          <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:ps-7">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <h1 className="text-heading text-paper">{title}</h1>
                {subline ? (
                  <p className="mt-1.5 max-w-[68ch] text-body text-paper/80">{subline}</p>
                ) : null}
              </div>
              {next ? (
                <Link href={next.href} className={`${primaryOnDarkButtonClassName} w-full shrink-0 sm:w-auto`}>
                  {next.label}
                  <ArrowEndIcon className="size-4" />
                </Link>
              ) : null}
            </div>
            {needsYou ? <NeedsYou items={needsYou} t={t} /> : null}
          </div>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:max-h-dvh lg:flex-col lg:gap-8 lg:self-start lg:overflow-y-auto lg:px-4 lg:py-5">
          <nav aria-label={t.navLabel}>
            <SideNav nav={nav} active={active} />
          </nav>
          <div className="flex flex-col gap-3 px-1">
            <p className="max-w-[32ch] text-caption text-muted-foreground">{t.staffDecide}</p>
            <p className="flex max-w-[32ch] items-start gap-2 text-caption text-muted-foreground">
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-forest" />
              <span>{t.localNote}</span>
            </p>
          </div>
        </aside>

        <main id="main" className="min-w-0 flex-1 bg-card lg:my-3 lg:me-3 lg:rounded-[1.75rem]">
          {actions ? <div className="px-4 pt-5 sm:px-7 sm:pt-6">{actions}</div> : null}
          <div className="px-4 pb-12 pt-5 sm:px-7 sm:pt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
