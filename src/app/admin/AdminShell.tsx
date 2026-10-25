import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeftIcon,
  KeyholeMark,
  ListIcon,
  PairIcon,
  PulseIcon,
  ShieldIcon,
} from "@/components/icons";
import { focusRingClassName } from "@/components/ui";

// The staff workspace frame: a labelled sidebar on the cream ground and one
// work sheet per section. On tablets and phones the sidebar folds into a top
// bar with the section links below it. Navigation keeps the same
// /admin?section=… links as before.

export type AdminSectionKey = "matches" | "claims" | "reports" | "monitoring";

export type AdminNavItem = {
  key: AdminSectionKey;
  label: string;
  // A count only on a queue that needs action, with its noun for screen readers.
  count?: { value: number; label: string } | null;
  // A short problem notice, e.g. "Last check failed".
  alert?: string | null;
};

const ICONS: Record<AdminSectionKey, (props: { className?: string }) => ReactNode> = {
  matches: PairIcon,
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
      <span className="ml-auto flex items-center gap-1.5">
        <span aria-hidden className="size-2.5 rounded-full bg-destructive" />
        <span className="sr-only">{item.alert}</span>
      </span>
    );
  }
  if (item.count && item.count.value > 0) {
    return (
      <span className="ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-2 text-xs font-semibold tabular-nums text-cream">
        {item.count.value}
        <span className="sr-only"> {item.count.label}</span>
      </span>
    );
  }
  return null;
}

function Brand() {
  return (
    <Link
      href="/admin"
      className={`flex w-fit items-center gap-3 rounded-xl py-1 pr-2 ${focusRingClassName}`}
    >
      <KeyholeMark className="size-9" />
      <span className="flex min-w-0 flex-col gap-1 leading-none">
        <span className="font-serif text-xl font-semibold tracking-[0.16em] text-foreground">
          AMANAH
        </span>
        <span className="text-[0.8125rem] font-medium text-muted-foreground">Staff workspace</span>
      </span>
    </Link>
  );
}

function NavLinks({ nav, active, layout }: { nav: AdminNavItem[]; active: AdminSectionKey | null; layout: "side" | "top" }) {
  return (
    <ul
      className={
        layout === "side"
          ? "flex flex-col gap-1"
          : "grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap"
      }
    >
      {nav.map((item) => {
        const Icon = ICONS[item.key];
        const current = item.key === active;
        return (
          <li key={item.key} className="min-w-0">
            <Link
              href={sectionHref(item.key)}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-11 cursor-pointer items-center gap-2.5 px-3.5 py-1.5 text-[0.9375rem] leading-tight transition-colors duration-150 ${
                layout === "side" ? "rounded-full" : "rounded-2xl sm:rounded-full"
              } ${focusRingClassName} ${
                current
                  ? "bg-secondary font-semibold text-foreground"
                  : "text-foreground/70 hover:bg-secondary/70 hover:text-foreground"
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

function LocalAdminTag() {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
      Local admin
    </span>
  );
}

export function AdminShell({
  active,
  nav,
  title,
  subline,
  actions,
  children,
}: {
  active: AdminSectionKey | null;
  nav: AdminNavItem[];
  title: string;
  subline?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-20"
      >
        Skip to content
      </a>

      {/* Sidebar (desktop). */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-8 lg:px-4 lg:py-6">
        <Brand />
        <nav aria-label="Workspace sections">
          <NavLinks nav={nav} active={active} layout="side" />
        </nav>
        <div className="mt-auto flex flex-col gap-4 px-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
          <p>AI suggestions are never a decision. Staff decide every claim.</p>
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              className={`-ml-1.5 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1.5 font-semibold text-foreground transition-colors hover:text-forest ${focusRingClassName}`}
            >
              <ArrowLeftIcon className="size-4" />
              Back to home
            </Link>
            <LocalAdminTag />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar and section links (tablet and phone). */}
        <header className="flex flex-col gap-3 px-3 pb-3 pt-3 sm:px-5 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Brand />
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className={`hidden min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground hover:text-forest sm:inline-flex ${focusRingClassName}`}
              >
                <ArrowLeftIcon className="size-4" />
                Back to home
              </Link>
              <LocalAdminTag />
            </div>
          </div>
          <nav aria-label="Workspace sections">
            <NavLinks nav={nav} active={active} layout="top" />
          </nav>
        </header>

        <main
          id="main"
          className="min-w-0 flex-1 rounded-t-[1.75rem] border border-b-0 border-border bg-card lg:my-3 lg:mr-3 lg:rounded-[1.75rem] lg:border-b"
        >
          <div className="flex flex-col gap-4 px-4 pb-6 pt-6 sm:px-7 sm:pt-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="font-serif text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.015em] text-foreground sm:text-[2.6rem]">
                {title}
              </h1>
              {subline ? (
                <p className="mt-2 max-w-3xl text-[0.9375rem] leading-relaxed text-foreground/75">
                  {subline}
                </p>
              ) : null}
            </div>
            {actions ? <div className="min-w-0 shrink-0">{actions}</div> : null}
          </div>
          <div className="px-4 pb-12 sm:px-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
