import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { SiteHeader } from "@/components/site-header";
import { AlertIcon, ArrowLeftIcon, CheckIcon, InfoIcon } from "@/components/icons";

export const focusRingClassName =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// 44px controls: full width on phones, natural width from `sm` up.
const buttonBaseClassName = `inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-6 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${focusRingClassName}`;

export const primaryButtonClassName = `${buttonBaseClassName} bg-primary text-primary-foreground hover:bg-primary/85`;

export const secondaryButtonClassName = `${buttonBaseClassName} border border-border bg-background text-foreground hover:bg-muted`;

export const rejectButtonClassName = `${buttonBaseClassName} border border-destructive/40 bg-background text-destructive hover:bg-muted`;

export const fieldClassName =
  "h-11 w-full rounded-lg border border-foreground/50 bg-background px-3 text-base outline-none transition-colors hover:border-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

export const textareaClassName = `${fieldClassName} h-auto min-h-24 py-2`;

export const linkClassName = `-ml-2 inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-forest hover:underline ${focusRingClassName}`;

/** Header, main landmark, and the narrow content column shared by every inner page. */
export function PageShell({
  badge,
  backHref = "/",
  backLabel = "Back to home",
  children,
}: {
  badge?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader badge={badge} />
      <main id="main" className="flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pb-24 sm:pt-10">
          <Link
            href={backHref}
            className={`-ml-2 inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground ${focusRingClassName}`}
          >
            <ArrowLeftIcon className="size-4" />
            {backLabel}
          </Link>
          {children}
        </div>
      </main>
    </>
  );
}

/** Small uppercase label above a heading, as in the Amanah deck. */
export function Eyebrow({
  tone = "pine",
  className = "",
  children,
}: {
  tone?: "pine" | "clay" | "forest";
  className?: string;
  children: ReactNode;
}) {
  const color = {
    pine: "text-pine",
    clay: "text-clay-ink",
    forest: "text-forest",
  }[tone];
  return (
    <p
      className={`text-xs font-semibold uppercase leading-none tracking-[0.16em] ${color} ${className}`}
    >
      {children}
    </p>
  );
}

/**
 * Page title block: optional label, serif title, muted intro. Pass headingRef to
 * move focus to the title when the page content changes in place.
 */
export function PageHeading({
  eyebrow,
  saved = false,
  title,
  intro,
  headingRef,
}: {
  eyebrow?: string;
  // Shows a check before the label, for "report saved" screens.
  saved?: boolean;
  title: string;
  intro?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="mt-6 flex flex-col items-start sm:mt-8">
      {eyebrow ? (
        <div className="flex items-center gap-2.5">
          {saved ? (
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-forest text-primary-foreground motion-safe:animate-rise"
            >
              <CheckIcon className="size-4" />
            </span>
          ) : null}
          <Eyebrow tone={saved ? "forest" : "pine"}>{eyebrow}</Eyebrow>
        </div>
      ) : null}
      <h1
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="mt-3 text-balance font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-foreground outline-none sm:text-5xl"
      >
        {title}
      </h1>
      {intro ? (
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {intro}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A short message box. Errors keep charcoal copy with a destructive icon; info
 * uses forest. Pass role="alert" for errors that appear after an action.
 */
export function Notice({
  tone = "info",
  role,
  className = "",
  children,
}: {
  tone?: "info" | "error";
  role?: "alert" | "status";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={role}
      className={`flex items-start gap-3 rounded-xl border bg-card px-4 py-3 ${
        tone === "error" ? "border-destructive/40" : "border-border"
      } ${className}`}
    >
      {tone === "error" ? (
        <AlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
      ) : (
        <InfoIcon className="mt-0.5 size-5 shrink-0 text-forest" />
      )}
      <div className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-foreground">
        {children}
      </div>
    </div>
  );
}

/** Error message shown under a form field; link it with aria-describedby. */
export function FieldError({
  id,
  role,
  children,
}: {
  id: string;
  role?: "alert";
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role={role}
      className="flex items-start gap-1.5 text-sm font-medium leading-snug text-foreground"
    >
      <AlertIcon className="mt-px size-4 shrink-0 text-destructive" />
      <span>{children}</span>
    </p>
  );
}

/** Decorative busy ring for buttons and loading rows; pair it with visible text. */
export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-orbit ${className}`}
    />
  );
}

/** A visible "working on it" line, e.g. while a status loads. */
export function LoadingRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-forest">
      <Spinner className="size-5" />
      <p className="text-base leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
