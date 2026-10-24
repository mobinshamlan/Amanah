"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LostConfirmation,
  secondaryButtonClassName,
  statusMessage,
} from "@/app/report/SubmissionConfirmation";
import { OwnershipVerification } from "@/app/report/track/OwnershipVerification";
import { useMatchingProgress } from "@/app/report/useMatchingProgress";
import { SiteHeader } from "@/components/site-header";

function TrackingLinkCard({ url }: { url: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
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

  return (
    <section
      aria-labelledby="tracking-link-title"
      className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <h2
        id="tracking-link-title"
        className="font-serif text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.75rem]"
      >
        Your private tracking link
      </h2>
      <p className="mt-2 text-base leading-relaxed text-foreground">
        Save this link to come back to your report later, even after closing
        your browser. Bookmark this page or copy the link somewhere safe.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="tracking-link" className="sr-only">
          Private tracking link
        </label>
        <input
          ref={inputRef}
          id="tracking-link"
          type="text"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="h-11 w-full min-w-0 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <button
          type="button"
          onClick={() => void copyLink()}
          className={`${secondaryButtonClassName} shrink-0`}
        >
          Copy link
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-forest">
        {copyState === "copied"
          ? "Link copied."
          : copyState === "failed"
            ? "Copying is not available here. The link is selected so you can copy it."
            : ""}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Keep it private: anyone with this link can see your report’s progress.
      </p>
    </section>
  );
}

function StatusLoading() {
  return (
    <div className="mt-5" aria-busy="true">
      <h1 className="text-balance font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
        Track your report
      </h1>
      <div className="mt-8 flex items-center gap-3">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full bg-forest motion-safe:animate-breathe"
        />
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          Loading your report status…
        </p>
      </div>
    </div>
  );
}

export default function TrackReport() {
  const router = useRouter();
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [linkMissing, setLinkMissing] = useState(false);
  // False until the hash has been read once, so the first paint is loading
  // rather than an empty "Track your report" heading.
  const [linkReady, setLinkReady] = useState(false);
  const {
    matching,
    isContinuing,
    canRetry,
    credential,
    continueChecks,
    cancel,
    clear,
  } = useMatchingProgress({
    reportType: "lost",
    confirmStatusBeforeDisplay: true,
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Token whose status fetch has not yet painted; cleared when the hash is empty.
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  useEffect(() => {
    // The credential lives only in the URL fragment, never in a path or query.
    function openLink() {
      const fromLink = window.location.hash.slice(1);
      if (!fromLink) {
        setPendingToken(null);
        clear();
        setLinkUrl(null);
        setLinkMissing(true);
        setLinkReady(true);
        return;
      }
      // A new or refreshed token must not keep the previous status on screen.
      setPendingToken(fromLink);
      clear();
      setLinkMissing(false);
      setLinkUrl(window.location.href);
      setLinkReady(true);
      void continueChecks(fromLink);
    }
    const timer = setTimeout(openLink, 0);
    window.addEventListener("hashchange", openLink);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", openLink);
      cancel();
    };
  }, [continueChecks, cancel, clear]);

  function retryChecks() {
    if (!credential) {
      return;
    }
    headingRef.current?.focus();
    setPendingToken(credential);
    void continueChecks(credential);
  }

  const linkWorks = !linkMissing && matching?.phase !== "lost_access";
  // Show loading until this token's fetch has set a status. Do not show
  // checking, no-match, or ownership UI from a previous visit or token.
  const statusLoading =
    !linkReady ||
    (linkWorks && matching === null && (isContinuing || pendingToken !== null));
  // Verification starts once checking has stopped with a possible match.
  const showVerification =
    Boolean(credential) &&
    !isContinuing &&
    matching !== null &&
    "outcome" in matching &&
    matching.outcome === "possible_match";

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-8 sm:pb-24 sm:pt-10">
          <Link
            href="/"
            className="-ml-2 inline-flex w-fit items-center rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Back to home
          </Link>

          {/* Always mounted so screen readers announce each status change. */}
          <p role="status" className="sr-only">
            {!linkReady || statusLoading
              ? "Loading your report status…"
              : !linkWorks
                ? "This tracking link does not work."
                : matching
                  ? statusMessage("lost", matching, isContinuing)
                  : ""}
          </p>

          {!linkReady || (linkWorks && statusLoading) ? (
            <StatusLoading />
          ) : !linkWorks ? (
            <>
              <h1 className="mt-5 text-balance font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
                This tracking link doesn’t work
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Check that you opened the full link you saved when you reported
                your item. If it still doesn’t work, please contact your
                organization’s lost-and-found staff.
              </p>
            </>
          ) : matching ? (
            <LostConfirmation
              title="Track your report"
              intro="This private page shows the progress of your lost-item report. Come back any time to see updates."
              view={matching}
              isContinuing={isContinuing}
              canRetry={canRetry}
              onRetry={retryChecks}
              onReportAnother={() => router.push("/report/lost")}
              headingRef={headingRef}
            >
              {showVerification && credential ? (
                <OwnershipVerification key={credential} credential={credential} />
              ) : null}
              {linkUrl ? <TrackingLinkCard url={linkUrl} /> : null}
            </LostConfirmation>
          ) : (
            <StatusLoading />
          )}
        </div>
      </main>
    </>
  );
}
