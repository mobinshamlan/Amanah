import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { AlertIcon, ArrowLeftIcon, CheckIcon, InfoIcon } from "@/components/icons";

export const focusRingClassName =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// One button shape for the whole product: a full pill, at least 44px tall.
// Labels may wrap and a button never grows past its container, so a long
// label in a narrow panel wraps instead of pushing out of the layout.
const buttonShapeClassName = `inline-flex w-full max-w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full py-2 text-center text-base font-semibold leading-tight transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 sm:w-auto ${focusRingClassName}`;

const buttonBaseClassName = `${buttonShapeClassName} min-h-11 px-5`;

export const primaryButtonClassName = `${buttonBaseClassName} bg-primary text-primary-foreground hover:bg-pine`;

/** The main action of a public form: the same pill, 48px tall. */
export const primaryButtonLargeClassName = `${buttonShapeClassName} min-h-12 px-7 bg-primary text-primary-foreground hover:bg-pine`;

export const secondaryButtonClassName = `${buttonBaseClassName} border border-foreground/25 bg-transparent text-foreground hover:border-foreground/50 hover:bg-secondary`;

export const rejectButtonClassName = `${buttonBaseClassName} border border-destructive/45 bg-transparent text-destructive hover:border-destructive hover:bg-bad-soft`;

// Fields: 48px, a clear border, a forest focus ring.
export const fieldClassName =
  "min-h-12 w-full min-w-0 rounded-xl border border-foreground/45 bg-background px-4 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-foreground/70 focus-visible:border-forest focus-visible:ring-3 focus-visible:ring-forest/35 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15";

export const textareaClassName = `${fieldClassName} min-h-28 resize-y py-3 leading-relaxed`;

export const linkClassName = `-ml-1.5 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-semibold text-foreground underline-offset-4 transition-colors hover:text-forest hover:underline ${focusRingClassName}`;

/** Header, main landmark, page frame, and footer shared by every inner public page. */
export function PageShell({
  backHref = "/",
  backLabel = "Back to home",
  width = "narrow",
  children,
}: {
  backHref?: string;
  backLabel?: string;
  width?: "narrow" | "wide";
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div
          className={`mx-auto flex w-full ${
            width === "wide" ? "max-w-[1440px]" : "max-w-3xl"
          } flex-col px-4 pb-20 pt-6 sm:px-8 sm:pb-28 sm:pt-10 xl:px-12`}
        >
          <Link
            href={backHref}
            className={`-ml-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground ${focusRingClassName}`}
          >
            <ArrowLeftIcon className="size-4" />
            {backLabel}
          </Link>
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * Page title block: an optional context line, the serif title, a short intro.
 * Pass headingRef to move focus to the title when the page content changes in place.
 */
export function PageHeading({
  context,
  saved = false,
  title,
  intro,
  headingRef,
}: {
  // Where the visitor is, in plain words ("Private tracking page").
  context?: string;
  // Shows a forest check seal before the context line, for "report saved" screens.
  saved?: boolean;
  title: string;
  intro?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="mt-6 flex max-w-3xl flex-col items-start sm:mt-8">
      {context ? (
        <p className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-forest">
          {saved ? (
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-forest text-primary-foreground motion-safe:animate-rise"
            >
              <CheckIcon className="size-4" />
            </span>
          ) : null}
          {context}
        </p>
      ) : null}
      <h1
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="mt-3 text-balance font-serif text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.02em] text-foreground outline-none sm:text-6xl"
      >
        {title}
      </h1>
      {intro ? (
        <p className="mt-4 max-w-[58ch] text-pretty text-base leading-relaxed text-foreground/80 sm:text-lg">
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
  surface = "bg-secondary",
  role,
  className = "",
  children,
}: {
  tone?: "info" | "error";
  // Fill for info notices, e.g. "bg-card" on a tinted panel.
  surface?: string;
  role?: "alert" | "status";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={role}
      className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 ${
        tone === "error" ? "border border-destructive/35 bg-bad-soft/60" : surface
      } ${className}`}
    >
      {tone === "error" ? (
        <AlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
      ) : (
        <InfoIcon className="mt-0.5 size-5 shrink-0 text-forest" />
      )}
      <div className="min-w-0 flex-1 text-[0.9375rem] font-medium leading-relaxed text-foreground">
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

/** A labelled stage of a paper slip: its name in bold, then rows. */
export function SlipRow({
  label,
  value,
  muted = false,
}: {
  label: ReactNode;
  value: ReactNode;
  muted?: boolean;
}) {
  return (
    <li className={`flex items-baseline gap-3 py-1.5 ${muted ? "text-muted-foreground" : "text-foreground"}`}>
      <span className="min-w-0 text-pretty">{label}</span>
      <span aria-hidden className="leader" />
      <span className="shrink-0 text-right text-[0.9375rem] font-medium tabular-nums">{value}</span>
    </li>
  );
}
