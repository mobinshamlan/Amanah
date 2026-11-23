"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  JourneySteps,
  LostActions,
  TrackingLinkCard,
  lostHeadline,
  statusMessage,
  type OwnershipStage,
} from "@/app/report/SubmissionConfirmation";
import { OwnershipVerification } from "@/app/report/track/OwnershipVerification";
import { takeJustSaved } from "@/app/report/tracking";
import { useMatchingProgress } from "@/app/report/useMatchingProgress";
import { ArrowEndIcon, LinkIcon } from "@/components/icons";
import {
  LoadingRow,
  Notice,
  PageHeading,
  PageShell,
  primaryButtonClassName,
  secondaryButtonClassName,
  textLinkClassName,
} from "@/components/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { common } from "@/i18n/messages/common";
import { track } from "@/i18n/messages/track";

function Opening() {
  const t = useMessages(track);
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-3xl">
      <PageHeading context={t.pageContext} title={t.opening.title} intro={t.opening.intro} />
      <div className="mt-8">
        <LoadingRow>{t.loadingStatus}</LoadingRow>
      </div>
    </div>
  );
}

/** Someone tapped "Check my report" without their link: explain how to find it. */
function NoLink() {
  const t = useMessages(track);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeading context={t.pageContext} title={t.noLink.title} intro={t.noLink.intro} />
      <section aria-label={t.noLink.title} className="edge-torn mt-8 max-w-xl bg-card px-5 pt-6 sm:px-7">
        <ul className="flex flex-col gap-3">
          {t.noLink.places.map((place) => (
            <li key={place} className="flex items-start gap-3 text-body text-foreground">
              <LinkIcon className="mt-1 size-5 shrink-0 text-forest" />
              <span className="min-w-0">{place}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-6 max-w-[58ch] text-small text-foreground/80">{t.noLink.lostLink}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <Link href="/report/lost" className={primaryButtonClassName}>
          {t.actions.reportLost}
        </Link>
        <Link href="/" className={textLinkClassName}>
          {useMessages(common).backHome}
          <ArrowEndIcon className="size-4" />
        </Link>
      </div>
    </div>
  );
}

/** A malformed or unknown credential, or a found report's credential. */
function BrokenLink() {
  const t = useMessages(track);
  const c = useMessages(common);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeading context={t.pageContext} title={t.broken.title} intro={t.broken.intro} />
      <Notice tone="error" className="mt-8">
        <span className="font-normal">{t.broken.help}</span>
      </Notice>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link href="/report/lost" className={primaryButtonClassName}>
          {t.actions.reportLost}
        </Link>
        <Link href="/" className={secondaryButtonClassName}>
          {c.backHome}
        </Link>
      </div>
    </div>
  );
}

export default function TrackReport() {
  const router = useRouter();
  const t = useMessages(track);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [linkMissing, setLinkMissing] = useState(false);
  // True on the visit right after the report was saved: the page then leads
  // with saving the private link, and the status follows.
  const [justSaved, setJustSaved] = useState(false);
  // False until the hash has been read once, so the first paint is loading
  // rather than an empty heading.
  const [linkReady, setLinkReady] = useState(false);
  const { matching, isContinuing, canRetry, credential, continueChecks, cancel, clear } =
    useMatchingProgress({ reportType: "lost", confirmStatusBeforeDisplay: true });
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Token whose status fetch has not yet painted; cleared when the hash is empty.
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [ownershipStage, setOwnershipStage] = useState<OwnershipStage | null>(null);

  useEffect(() => {
    // The credential lives only in the URL fragment, never in a path or query.
    function openLink() {
      const fromLink = window.location.hash.slice(1);
      // A different link must never show the previous report's result.
      setOwnershipStage(null);
      if (!fromLink) {
        setPendingToken(null);
        clear();
        setLinkUrl(null);
        setJustSaved(false);
        setLinkMissing(true);
        setLinkReady(true);
        return;
      }
      // A new or refreshed token must not keep the previous status on screen.
      setPendingToken(fromLink);
      clear();
      setLinkMissing(false);
      setJustSaved(takeJustSaved(fromLink));
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

  // When checking stops and the headline changes in place, move focus to it
  // unless the visitor is already using something on the page.
  const wasContinuing = useRef(false);
  useEffect(() => {
    if (wasContinuing.current && !isContinuing && !justSaved) {
      const active = document.activeElement;
      if (!active || active === document.body) {
        headingRef.current?.focus();
      }
    }
    wasContinuing.current = isContinuing;
  }, [isContinuing, justSaved]);

  // After the last answer, the ownership card shrinks to a chip and the
  // headline becomes the result: move focus to the headline.
  const previousStage = useRef<OwnershipStage | null>(null);
  useEffect(() => {
    const was = previousStage.current;
    previousStage.current = ownershipStage;
    const answered = was === "question" || was === "followup";
    const settled =
      ownershipStage === "answers_received" ||
      ownershipStage === "staff_review" ||
      ownershipStage === "approved" ||
      ownershipStage === "rejected";
    if (answered && settled && !justSaved) {
      headingRef.current?.focus();
    }
  }, [ownershipStage, justSaved]);

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
    !linkReady || (linkWorks && matching === null && (isContinuing || pendingToken !== null));
  // Verification starts once checking has stopped with a possible match.
  const showVerification =
    Boolean(credential) &&
    !isContinuing &&
    matching !== null &&
    "outcome" in matching &&
    matching.outcome === "possible_match";
  const ownership = showVerification ? ownershipStage : null;
  const headline = matching ? lostHeadline(t, matching, isContinuing, ownership) : null;
  const decided = ownership === "approved" || ownership === "rejected";

  return (
    <PageShell width="wide">
      {/* Always mounted so screen readers announce each status change. */}
      <p role="status" className="sr-only">
        {!linkReady || statusLoading
          ? t.loadingStatus
          : linkMissing
            ? t.noLink.title
            : !linkWorks
              ? t.broken.title
              : matching
                ? statusMessage("lost", matching, isContinuing, t, ownership)
                : ""}
      </p>

      {!linkReady || (linkWorks && statusLoading) ? (
        <Opening />
      ) : linkMissing ? (
        <NoLink />
      ) : !linkWorks ? (
        <BrokenLink />
      ) : matching && headline ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-16">
          {/* 1. The heading: the status, or "save your link" right after saving. */}
          <div className="lg:col-start-1 lg:row-start-1">
            {justSaved ? (
              <PageHeading
                context={t.saved.context}
                saved
                title={t.saved.title}
                intro={t.saved.intro}
                headingRef={headingRef}
              />
            ) : (
              <PageHeading
                context={t.pageContext}
                title={headline.title}
                intro={
                  headline.extra ? (
                    <>
                      {headline.intro} {headline.extra}
                    </>
                  ) : (
                    headline.intro
                  )
                }
                headingRef={headingRef}
              />
            )}
          </div>

          {/* 2. What to do now. */}
          <div className="mt-8 flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-2">
            {justSaved && linkUrl ? <TrackingLinkCard url={linkUrl} focal /> : null}

            {justSaved ? (
              // The live status, under the link: a titled block of its own.
              <section
                aria-labelledby="live-status-title"
                aria-busy={isContinuing}
                className="rounded-[1.75rem] bg-card p-5 sm:p-7"
              >
                <h2 id="live-status-title" className="text-heading text-foreground">
                  {headline.title}
                </h2>
                <p className="mt-3 max-w-[58ch] text-body text-foreground">{headline.intro}</p>
                {headline.extra ? <p className="mt-2 text-body text-foreground">{headline.extra}</p> : null}
              </section>
            ) : null}

            {headline.tone === "match" ? (
              <Notice>
                <span className="font-normal">{t.aiNote}</span>
              </Notice>
            ) : null}

            {showVerification && credential ? (
              <OwnershipVerification
                key={credential}
                credential={credential}
                onStageChange={setOwnershipStage}
                headlineShown={!justSaved}
              />
            ) : null}

            {decided ? null : <p className="max-w-[58ch] text-small text-foreground/80">{t.staffContact}</p>}
          </div>

          {/* 3. The progress slip and the link, beside the status on wide screens. */}
          <div className="mt-8 flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-6">
            <JourneySteps view={matching} waiting={isContinuing} ownership={ownership} />
            {!justSaved && linkUrl ? <TrackingLinkCard url={linkUrl} /> : null}
          </div>

          {/* 4. Actions. */}
          <div className="mt-8 lg:col-start-1 lg:row-start-3">
            <LostActions
              view={matching}
              waiting={isContinuing}
              canRetry={canRetry}
              onRetry={retryChecks}
              onReportAnother={() => router.push("/report/lost")}
            />
          </div>
        </div>
      ) : (
        <Opening />
      )}
    </PageShell>
  );
}
