import type { ReactNode, Ref } from "react";
import { frameClassName } from "@/components/frame";
import { BackLink, SiteFooter, SiteHeader } from "@/components/site-header";
import {
  AlertIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  InfoIcon,
  LensIcon,
  TagIcon,
  XIcon,
} from "@/components/icons";

/*
  Shared controls. This module has no "use client" so its class-name strings
  can be imported by server components; the pieces that need the visitor's
  language (header, footer, back link) live in site-header.tsx.
*/

/* Focus */

export const focusRingClassName =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The same ring on deep pine fields: brass, offset to the field. */
export const focusRingOnDarkClassName =
  "outline-none focus-visible:ring-3 focus-visible:ring-brass-light focus-visible:ring-offset-2 focus-visible:ring-offset-pine-deep";

/* Buttons */

// One button shape for the whole product: a full pill, at least 44px tall.
// Labels may wrap and a button never grows past its container, so a long
// label in a narrow panel wraps instead of pushing out of the layout.
const buttonShapeClassName =
  "inline-flex w-full max-w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full py-2 text-center text-base font-semibold leading-tight transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 sm:w-auto";

const buttonBaseClassName = `${buttonShapeClassName} min-h-11 px-5 ${focusRingClassName}`;

/** Filled pine pill. One per screen, on the action the visitor came for. */
export const primaryButtonClassName = `${buttonBaseClassName} bg-primary text-primary-foreground hover:bg-pine`;

/** The main action of a public form: the same pill, 48px tall. */
export const primaryButtonLargeClassName = `${buttonShapeClassName} min-h-12 px-7 ${focusRingClassName} bg-primary text-primary-foreground hover:bg-pine`;

/** Outlined pill for the second action beside a primary. */
export const secondaryButtonClassName = `${buttonBaseClassName} border border-foreground/25 bg-transparent text-foreground hover:border-foreground/50 hover:bg-secondary`;

/** A pill with no border: close, cancel, "not now". */
export const quietButtonClassName = `${buttonBaseClassName} bg-transparent text-foreground hover:bg-secondary`;

/** Staff rejection: outlined in the destructive red, filled only on hover. */
export const rejectButtonClassName = `${buttonBaseClassName} border border-destructive/45 bg-transparent text-destructive hover:border-destructive hover:bg-bad-soft`;

/** Primary on deep pine: a paper pill with pine text. */
export const primaryOnDarkButtonClassName = `${buttonShapeClassName} min-h-12 px-7 ${focusRingOnDarkClassName} bg-paper text-pine-deep hover:bg-brass-light`;

/** Secondary on deep pine: an outlined paper pill. */
export const secondaryOnDarkButtonClassName = `${buttonShapeClassName} min-h-11 px-5 ${focusRingOnDarkClassName} border border-paper/35 bg-transparent text-paper hover:border-paper/70 hover:bg-paper/10`;

/* Text links */

/**
 * The quiet second action next to a primary button, as a plain underlined
 * link in the text colour. Pair it with `ArrowEndIcon` when it leads on.
 */
export const textLinkClassName = `inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md px-1 text-base font-medium text-foreground underline decoration-foreground/40 underline-offset-[0.3em] transition-colors hover:text-pine hover:decoration-pine ${focusRingClassName}`;

/** The same quiet link on deep pine fields. */
export const textLinkOnDarkClassName = `inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md px-1 text-base font-medium text-paper underline decoration-paper/45 underline-offset-[0.3em] transition-colors hover:decoration-brass-light ${focusRingOnDarkClassName}`;

/** A small inline link inside running text or a slip row. */
export const linkClassName = `-ms-1.5 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-semibold text-foreground underline-offset-4 transition-colors hover:text-forest hover:underline ${focusRingClassName}`;

/* Fields */

// Fields: 48px, a clear border, a forest focus ring.
export const fieldClassName =
  "min-h-12 w-full min-w-0 rounded-xl border border-foreground/45 bg-card px-4 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-foreground/70 focus-visible:border-forest focus-visible:ring-3 focus-visible:ring-forest/35 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15";

export const textareaClassName = `${fieldClassName} min-h-28 resize-y py-3 leading-relaxed`;

/** Native select with the same frame; the browser draws the arrow in the end padding. */
export const selectClassName = `${fieldClassName} appearance-auto pe-10`;

/** The visible label above a field. */
export const labelClassName = "block text-base font-semibold leading-snug text-foreground";

/** A short line under the label that says what to type. Link it with aria-describedby. */
export const hintClassName = "text-small text-muted-foreground";

/* Layout */

/**
 * Header, main landmark, page frame, and footer shared by every inner public
 * page. Works inside server and client screens.
 */
export function PageShell({
  backHref = "/",
  backLabel,
  hideBack = false,
  width = "narrow",
  children,
}: {
  backHref?: string;
  // Defaults to "Back to home" in the visitor's language.
  backLabel?: ReactNode;
  hideBack?: boolean;
  width?: "narrow" | "wide";
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div
          className={`${width === "wide" ? frameClassName : "mx-auto w-full max-w-3xl px-4 sm:px-8"} flex flex-col pb-20 pt-6 sm:pb-28 sm:pt-10`}
        >
          {hideBack ? null : <BackLink href={backHref} label={backLabel} />}
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * Page title block: an optional context line, the title, a short intro.
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
  title: ReactNode;
  intro?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="mt-6 flex max-w-3xl flex-col items-start sm:mt-8">
      {context ? (
        <p className="flex items-center gap-2.5 text-small font-medium text-forest">
          {saved ? (
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-forest text-paper motion-safe:animate-rise"
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
        className="mt-3 text-title text-foreground outline-none"
      >
        {title}
      </h1>
      {intro ? <p className="mt-4 max-w-[58ch] text-lead text-foreground/85">{intro}</p> : null}
    </div>
  );
}

/** A section title inside a page: the heading size, with an optional one-line intro. */
export function SectionHeading({
  as: Tag = "h2",
  id,
  title,
  intro,
  className = "",
}: {
  as?: "h2" | "h3";
  id?: string;
  title: ReactNode;
  intro?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Tag id={id} className="text-heading text-foreground">
        {title}
      </Tag>
      {intro ? <p className="max-w-[58ch] text-body text-foreground/80">{intro}</p> : null}
    </div>
  );
}

/* Messages */

type NoticeTone = "info" | "success" | "warning" | "error";

const noticeStyle: Record<NoticeTone, { frame: string; icon: string; Icon: typeof InfoIcon }> = {
  info: { frame: "", icon: "text-forest", Icon: InfoIcon },
  success: { frame: "bg-ok-soft", icon: "text-ok-ink", Icon: CheckCircleIcon },
  warning: { frame: "bg-wait-soft", icon: "text-wait-ink", Icon: ClockIcon },
  error: { frame: "border border-destructive/35 bg-bad-soft/60", icon: "text-destructive", Icon: AlertIcon },
};

/**
 * A short message box. Text stays in the foreground colour; the icon and fill
 * carry the tone, and the tone also reads from the words. Pass role="alert"
 * for errors that appear after an action, role="status" for progress.
 */
export function Notice({
  tone = "info",
  surface = "bg-secondary",
  title,
  role,
  className = "",
  children,
}: {
  tone?: NoticeTone;
  // Fill for info notices, e.g. "bg-card" on a tinted panel.
  surface?: string;
  // An optional bold first line.
  title?: ReactNode;
  role?: "alert" | "status";
  className?: string;
  children: ReactNode;
}) {
  const style = noticeStyle[tone];
  return (
    <div
      role={role}
      className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 ${
        tone === "info" ? surface : style.frame
      } ${className}`}
    >
      <style.Icon className={`mt-0.5 size-5 shrink-0 ${style.icon}`} />
      <div className="min-w-0 flex-1 text-small font-medium text-foreground">
        {title ? <p className="font-semibold">{title}</p> : null}
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

/* Status */

type ChipTone = "ok" | "bad" | "wait" | "info" | "neutral";

const chipStyle: Record<ChipTone, { frame: string; Icon: typeof InfoIcon | null }> = {
  ok: { frame: "bg-ok-soft text-ok-ink", Icon: CheckIcon },
  bad: { frame: "bg-bad-soft text-bad-ink", Icon: XIcon },
  wait: { frame: "bg-wait-soft text-wait-ink", Icon: ClockIcon },
  info: { frame: "bg-accent text-pine", Icon: InfoIcon },
  neutral: { frame: "bg-secondary text-foreground", Icon: null },
};

/**
 * A small status pill: tone colour plus an icon plus words, so the state is
 * never carried by colour alone. Approved is always ok, rejected always bad,
 * pending always wait.
 */
export function StatusChip({
  tone = "neutral",
  icon,
  className = "",
  children,
}: {
  tone?: ChipTone;
  // Replace the default icon, or pass null for none.
  icon?: ReactNode | null;
  className?: string;
  children: ReactNode;
}) {
  const style = chipStyle[tone];
  const glyph = icon === undefined ? (style.Icon ? <style.Icon className="size-3.5" /> : null) : icon;
  return (
    <span
      className={`inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold ${style.frame} ${className}`}
    >
      {glyph}
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}

/**
 * Lost or found, told apart by shape and icon: lost is a dashed outline with
 * a lens, found is a filled accent with a tag. Pass the word in the
 * visitor's language (`common.kindLost` / `common.kindFound`).
 */
export function ReportKindCue({
  kind,
  className = "",
  children,
}: {
  kind: "lost" | "found";
  className?: string;
  children: ReactNode;
}) {
  const lost = kind === "lost";
  return (
    <span
      data-kind={kind}
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold ${
        lost ? "border border-dashed border-pine/60 text-pine" : "bg-accent text-pine"
      } ${className}`}
    >
      {lost ? <LensIcon className="size-3.5" /> : <TagIcon className="size-3.5" />}
      {children}
    </span>
  );
}

/* Loading */

/** Decorative busy ring for buttons and loading rows; pair it with visible text. */
export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full border-2 border-current border-e-transparent motion-safe:animate-orbit ${className}`}
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

/* Slips */

/** A row on a paper slip: label, dot leaders, value. */
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
      <span className="shrink-0 text-end text-small font-medium tabular-nums">{value}</span>
    </li>
  );
}

export { BackLink, frameClassName };
export type { Tone } from "@/components/site-header";
