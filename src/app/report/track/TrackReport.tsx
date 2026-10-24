"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LostConfirmation,
  statusMessage,
  type OwnershipStage,
} from "@/app/report/SubmissionConfirmation";
import { OwnershipVerification } from "@/app/report/track/OwnershipVerification";
import { useMatchingProgress } from "@/app/report/useMatchingProgress";
import { CheckIcon, ShieldIcon } from "@/components/icons";
import {
  Eyebrow,
  LoadingRow,
  Notice,
  PageHeading,
  PageShell,
  focusRingClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/ui";

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
      id="private-link"
      aria-labelledby="tracking-link-title"
      className="mt-4 scroll-mt-6 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <Eyebrow tone="clay">Keep this safe</Eyebrow>
      <h2
        id="tracking-link-title"
        className="mt-3 font-serif text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.75rem]"
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
          className={secondaryButtonClassName}
        >
          {copyState === "copied" ? (
            <>
              <CheckIcon className="size-4 text-forest" />
              Copied
            </>
          ) : (
            "Copy link"
          )}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-forest">
        {copyState === "copied"
          ? "Link copied."
          : copyState === "failed"
            ? "Copying is not available here. The link is selected so you can copy it."
            : ""}
      </p>
      <p className="mt-1 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
        <ShieldIcon className="mt-0.5 size-4 shrink-0 text-forest" />
        Keep it private: anyone with this link can see your report’s progress.
      </p>
    </section>
  );
}

const TRACK_EYEBROW = "Private tracking page";

function StatusLoading() {
  return (
    <div aria-busy="true">
      <PageHeading eyebrow={TRACK_EYEBROW} title="Track your report" />
      <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <LoadingRow>Loading your report status…</LoadingRow>
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
  const [ownershipStage, setOwnershipStage] = useState<OwnershipStage | null>(
    null,
  );

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
    <PageShell>
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
          <PageHeading
            eyebrow={TRACK_EYEBROW}
            title="This tracking link doesn’t work"
            intro="Check that you opened the full link you saved when you reported your item."
          />
          <Notice tone="error" className="mt-8">
            <span className="font-normal">
              If it still doesn’t work, please contact your organization’s
              lost-and-found staff.
            </span>
          </Notice>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/report/lost" className={primaryButtonClassName}>
              Report a lost item
            </Link>
            <Link href="/" className={secondaryButtonClassName}>
              Back to home
            </Link>
          </div>
        </>
      ) : matching ? (
        <LostConfirmation
          eyebrow={TRACK_EYEBROW}
          title="Track your report"
          intro={
            <>
              This private page shows the progress of your lost-item report.
              Come back any time to see updates.{" "}
              {linkUrl ? (
                <a
                  href="#private-link"
                  className={`rounded-sm font-medium text-foreground underline underline-offset-4 transition-colors hover:text-forest ${focusRingClassName}`}
                >
                  Save your private link
                </a>
              ) : null}
            </>
          }
          ownership={showVerification ? ownershipStage : null}
          view={matching}
          isContinuing={isContinuing}
          canRetry={canRetry}
          onRetry={retryChecks}
          onReportAnother={() => router.push("/report/lost")}
          headingRef={headingRef}
        >
          {showVerification && credential ? (
            <OwnershipVerification
              key={credential}
              credential={credential}
              onStageChange={setOwnershipStage}
            />
          ) : null}
          {linkUrl ? <TrackingLinkCard url={linkUrl} /> : null}
        </LostConfirmation>
      ) : (
        <StatusLoading />
      )}
    </PageShell>
  );
}
