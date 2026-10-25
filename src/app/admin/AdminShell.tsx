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

// The staff workspace frame: a labelled sidebar on a green-grey frame and one
// white work sheet per section. On tablets and phones the sidebar folds into a
// top bar with a scrolling row of section links. Navigation keeps the same
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
        <span aria-hidden className="size-2 rounded-full bg-destructive" />
        <span className="sr-only">{item.alert}</span>
      </span>
    );
  }
  if (item.count && item.count.value > 0) {
    return (
      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium tabular-nums text-primary-foreground">
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
      className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1 ${focusRingClassName}`}
    >
      <KeyholeMark className="size-8" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[15px] font-semibold text-foreground">Amanah</span>
        <span className="text-xs text-muted-foreground">Staff workspace</span>
      </span>
    </Link>
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
  const activeLabel = nav.find((item) => item.key === active)?.label;

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:grid lg:grid-cols-[228px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-20"
      >
        Skip to content
      </a>

      {/* Sidebar (desktop). */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-7 lg:px-3 lg:py-4">
        <Brand />
        <nav aria-label="Workspace sections">
          <ul className="flex flex-col gap-0.5">
            {nav.map((item) => {
              const Icon = ICONS[item.key];
              const current = item.key === active;
              return (
                <li key={item.key}>
                  <Link
                    href={sectionHref(item.key)}
                    aria-current={current ? "page" : undefined}
                    className={`flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-150 ${focusRingClassName} ${
                      current
                        ? "bg-frame-active font-medium text-foreground"
                        : "text-muted-foreground hover:bg-frame-active/60 hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                    <Badge item={item} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-3 px-1.5 text-xs leading-relaxed text-muted-foreground">
          <p>AI suggestions are never a decision. Staff decide every claim.</p>
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              className={`-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-medium text-foreground transition-colors hover:text-forest ${focusRingClassName}`}
            >
              <ArrowLeftIcon className="size-3.5" />
              Back to home
            </Link>
            <span className="rounded-md bg-frame-active px-2 py-0.5 font-medium text-foreground">
              Local admin
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar and section links (tablet and phone). */}
        <header className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5 lg:hidden">
          <Brand />
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/"
              className={`hidden items-center gap-1 rounded-md px-1.5 py-1 font-medium text-foreground hover:text-forest sm:inline-flex ${focusRingClassName}`}
            >
              <ArrowLeftIcon className="size-3.5" />
              Back to home
            </Link>
            <span className="rounded-md bg-frame-active px-2 py-0.5 font-medium text-foreground">
              Local admin
            </span>
          </div>
        </header>
        <nav aria-label="Workspace sections" className="overflow-x-auto px-1 sm:px-3 lg:hidden">
          <ul className="flex min-w-max gap-1">
            {nav.map((item) => {
              const Icon = ICONS[item.key];
              const current = item.key === active;
              return (
                <li key={item.key}>
                  <Link
                    href={sectionHref(item.key)}
                    aria-current={current ? "page" : undefined}
                    className={`flex h-11 cursor-pointer items-center gap-2 border-b-2 px-3 text-sm transition-colors duration-150 ${focusRingClassName} ${
                      current
                        ? "border-forest font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                    <Badge item={item} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Breadcrumb (desktop): names the workspace and the open section. */}
        <div className="hidden h-12 items-center px-6 text-sm text-muted-foreground lg:flex">
          <span>Staff workspace</span>
          {activeLabel ? (
            <>
              <span aria-hidden className="px-2">/</span>
              <span className="text-foreground">{activeLabel}</span>
            </>
          ) : null}
        </div>

        <main
          id="main"
          className="min-w-0 flex-1 border-t border-border bg-background lg:mb-2 lg:mr-2 lg:rounded-2xl lg:border"
        >
          <div className="flex flex-col gap-4 px-4 pb-5 pt-5 sm:px-6 sm:pt-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-[1.375rem] font-semibold leading-tight tracking-tight text-foreground">
                {title}
              </h1>
              {subline ? (
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {subline}
                </p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
          <div className="px-4 pb-10 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
