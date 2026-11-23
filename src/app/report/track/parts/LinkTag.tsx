"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { CheckIcon, ChevronDownIcon, CopyIcon, LinkIcon, LockIcon, SendIcon } from "@/components/icons";
import {
  fieldClassName,
  focusRingClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { track } from "@/i18n/messages/track";

const subscribeNever = () => () => {};

/**
 * The owner's private link. Right after saving it is the one claim tag on the
 * counter (brass, with its eyelet): copy it, with the other ways to keep it
 * behind a disclosure. On later visits it is a compact strip under the desk,
 * so the status leads. Both carry the warning that the link is the key.
 */
export function LinkTag({ url, focal = false }: { url: string; focal?: boolean }) {
  const t = useMessages(track);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed" | "shareFailed">("idle");
  // Browser-only: false on the server and during hydration, then the real answer.
  const canShare = useSyncExternalStore(
    subscribeNever,
    () => typeof navigator.share === "function",
    () => false,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      inputRef.current?.select();
      setCopyState("failed");
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ title: t.link.shareTitle, text: t.link.shareText, url });
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setCopyState("shareFailed");
    }
  }

  const statusText =
    copyState === "copied"
      ? t.link.copiedStatus
      : copyState === "failed"
        ? t.link.copyFailed
        : copyState === "shareFailed"
          ? t.link.shareFailed
          : "";

  const input = (
    <>
      <label htmlFor="tracking-link" className="sr-only">
        {t.link.label}
      </label>
      <input
        ref={inputRef}
        id="tracking-link"
        type="text"
        readOnly
        dir="ltr"
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className={`${fieldClassName} min-w-0 truncate border-foreground/60! text-small`}
      />
    </>
  );

  const copyButton = (
    <button
      type="button"
      onClick={() => void copyLink()}
      className={`${focal ? primaryButtonClassName : secondaryButtonClassName} shrink-0`}
    >
      {copyState === "copied" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      {copyState === "copied" ? t.link.copied : t.link.copy}
    </button>
  );

  // The live region is always mounted so the result is announced; the visible
  // line only takes room once there is something to say.
  const status = (
    <>
      <p aria-live="polite" className="sr-only">
        {statusText}
      </p>
      {statusText ? (
        <p
          aria-hidden
          className={`text-small font-medium ${copyState === "copied" ? "text-forest" : "text-wait-ink"}`}
        >
          {statusText}
        </p>
      ) : null}
    </>
  );

  const warning = (
    <p className="flex items-start gap-2 text-small text-foreground/85">
      <LockIcon className="mt-1 size-4 shrink-0 text-forest" />
      <span>{t.link.keepPrivate}</span>
    </p>
  );

  if (!focal) {
    return (
      // Its own paper surface: a long headline can push it up onto the pine band.
      <section
        id="private-link"
        aria-labelledby="tracking-link-title"
        className="flex flex-col gap-3 rounded-[1.25rem] bg-card p-5 text-foreground sm:p-6"
      >
        <h2 id="tracking-link-title" className="flex items-center gap-2 text-subheading text-foreground">
          <LinkIcon className="size-5 shrink-0 text-forest" />
          {t.link.title}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {input}
          {copyButton}
        </div>
        {status}
        {warning}
      </section>
    );
  }

  return (
    <div className="relative w-full max-w-[34rem] pt-10">
      <span aria-hidden className="track-string absolute top-0 h-[4.25rem] w-0.5 -translate-x-1/2 bg-brass-light rtl:translate-x-1/2" />
      <span aria-hidden className="track-string absolute top-0 size-2 -translate-x-1/2 rounded-full bg-brass-light rtl:translate-x-1/2" />
      <section
        id="private-link"
        aria-labelledby="tracking-link-title"
        className="track-tag relative isolate scroll-mt-6 text-foreground"
      >
        <span aria-hidden className="shape-tag absolute inset-0 -z-10 bg-brass-soft" />
        <span aria-hidden className="eyelet absolute start-4 top-4 size-6 bg-pine-deep" />
        <div className="flex flex-col gap-4 px-6 pb-7 pt-12 sm:px-8">
          <div>
            <h2 id="tracking-link-title" className="text-heading text-foreground">
              {t.link.focalTitle}
            </h2>
            <p className="mt-2 max-w-[52ch] text-body text-foreground/85">{t.link.focalBody}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {input}
            {copyButton}
          </div>
          {status}
          {warning}
          <span aria-hidden className="perforation block text-brass-ink/30" />
          <details className="group/save">
            <summary
              className={`-ms-2 inline-flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full px-2 text-small font-semibold text-foreground [&::-webkit-details-marker]:hidden ${focusRingClassName}`}
            >
              {t.link.moreWays}
              <ChevronDownIcon className="size-4 transition-transform group-open/save:rotate-180" />
            </summary>
            <div className="mt-2 flex flex-col items-start gap-3">
              {canShare ? (
                <button type="button" onClick={() => void shareLink()} className={secondaryButtonClassName}>
                  <SendIcon className="size-4" />
                  {t.link.share}
                </button>
              ) : null}
              <p className="text-small text-foreground/85">{t.link.bookmarkHint}</p>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
