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
      className="scroll-mt-6 rounded-[1.75rem] bg-secondary p-5 sm:p-6"
    >
      <h2
        id="tracking-link-title"
        className="font-serif text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-foreground"
      >
        Your private tracking link
      </h2>
      <p className="mt-2 text-base leading-relaxed text-foreground">
        Save this link to come back to your report later, even after closing
        your browser. Bookmark this page or copy the link somewhere safe.
      </p>
      <span aria-hidden className="perforation mt-5 block text-foreground/20" />
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
          className="min-h-12 w-full min-w-0 flex-1 truncate rounded-full border border-foreground/30 bg-card px-5 text-[0.9375rem] text-foreground outline-none focus-visible:border-forest focus-visible:ring-3 focus-visible:ring-forest/35"
        />
        <button
          type="button"
          onClick={() => void copyLink()}
          className={`${primaryButtonClassName} shrink-0`}
        >
          {copyState === "copied" ? (
            <>
              <CheckIcon className="size-4 text-sage" />
              Copied
            </>
          ) : (
            "Copy link"
          )}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm font-medium text-forest">
        {copyState === "copied"
          ? "Link copied."
          : copyState === "failed"
            ? "Copying is not available here. The link is selected so you can copy it."
            : ""}
      </p>
      <p className="mt-1 flex items-start gap-2 text-[0.9375rem] leading-relaxed text-foreground/80">
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
      <PageHeading context={TRACK_EYEBROW} title="Track your report" />
      <div className="edge-torn mt-8 max-w-xl bg-card px-5 pt-6 sm:px-7">
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
    <PageShell width="wide">
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
            context={TRACK_EYEBROW}
            title="This tracking link doesn’t work"
            intro="Check that you opened the full link you saved when you reported your item."
          />
          <Notice tone="error" className="mt-8 max-w-3xl">
            <span className="font-normal">
              If it still doesn’t work, please contact your organization’s
              lost-and-found staff.
            </span>
          </Notice>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
          context={TRACK_EYEBROW}
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
          aside={linkUrl ? <TrackingLinkCard url={linkUrl} /> : null}
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
        </LostConfirmation>
      ) : (
        <StatusLoading />
      )}
    </PageShell>
  );
}
