"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  MoreActions,
  RetryAction,
  lostHeadline,
  sceneFor,
  statusMessage,
  type OwnershipStage,
} from "@/app/report/SubmissionConfirmation";
import { CaseTag } from "@/app/report/track/parts/CaseTag";
import { LinkTag } from "@/app/report/track/parts/LinkTag";
import { SceneNote, TrackScene } from "@/app/report/track/parts/TrackScene";
import { OwnershipVerification } from "@/app/report/track/OwnershipVerification";
import { takeJustSaved } from "@/app/report/tracking";
import { useMatchingProgress } from "@/app/report/useMatchingProgress";
import { ArrowEndIcon, LinkIcon, ShieldIcon, UserIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { LoadingRow, textLinkClassName } from "@/components/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { track } from "@/i18n/messages/track";

/** A plain paper slip torn from the desk's pad, for the screens without a status. */
function Slip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="relative isolate px-5 pb-10 pt-6 sm:px-8 sm:pt-7"
    >
      <span aria-hidden className="edge-torn absolute inset-0 -z-10 bg-card" />
      {children}
    </section>
  );
}

function Opening() {
  const t = useMessages(track);
  return (
    <div aria-busy="true">
      <TrackScene
        art="compare"
        mark="lens"
        title={t.opening.title}
        intro={t.opening.intro}
        sheet={
          <Slip label={t.opening.title}>
            <LoadingRow>{t.loadingStatus}</LoadingRow>
          </Slip>
        }
      />
    </div>
  );
}

/** Someone tapped "Check my report" without their link: explain how to find it. */
function NoLink() {
  const t = useMessages(track);
  return (
    <TrackScene
      art="compare"
      mark="link"
      stage="recovery"
      title={t.noLink.title}
      intro={t.noLink.intro}
      sheet={
        <Slip label={t.noLink.title}>
          <ul className="flex flex-col gap-4">
            {t.noLink.places.map((place) => (
              <li key={place} className="flex items-start gap-3 text-body text-foreground">
                <LinkIcon className="mt-1 size-5 shrink-0 text-forest" />
                <span className="min-w-0">{place}</span>
              </li>
            ))}
          </ul>
          <span aria-hidden className="perforation my-5 block text-foreground/20" />
          {/* Reporting again is the fallback, after the ways to find the link. */}
          <p className="max-w-[58ch] text-small text-foreground/80">{t.noLink.lostLink}</p>
          <Link href="/report/lost" className={`${textLinkClassName} mt-3`}>
            {t.actions.reportLost}
            <ArrowEndIcon className="size-4" />
          </Link>
        </Slip>
      }
    />
  );
}

/** A malformed or unknown credential, or a found report's credential. */
function BrokenLink() {
  const t = useMessages(track);
  return (
    <TrackScene
      art="compare"
      mark="x"
      stage="recovery"
      title={t.broken.title}
      intro={t.broken.intro}
      sheet={
        <Slip label={t.broken.title}>
          <p className="flex items-start gap-3 text-body text-foreground">
            <UserIcon className="mt-1 size-5 shrink-0 text-forest" />
            <span className="min-w-0">{t.broken.help}</span>
          </p>
          <span aria-hidden className="perforation my-5 block text-foreground/20" />
          <Link href="/report/lost" className={textLinkClassName}>
            {t.actions.reportLost}
            <ArrowEndIcon className="size-4" />
          </Link>
        </Slip>
      }
    />
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

  function statusView() {
    if (!matching || !headline) return <Opening />;
    const scene = sceneFor(headline, ownership);
    const verification =
      showVerification && credential ? (
        <OwnershipVerification
          key={credential}
          credential={credential}
          onStageChange={setOwnershipStage}
          headlineShown={!justSaved}
        />
      ) : null;
    const task =
      justSaved ||
      ownership === "loading" ||
      ownership === "question" ||
      ownership === "followup" ||
      ownership === "retry";
    const retry = <RetryAction view={matching} waiting={isContinuing} canRetry={canRetry} onRetry={retryChecks} />;

    if (justSaved) {
      // Right after saving, the page is about keeping the link: one tag on the
      // counter. The status follows under it, in plain words.
      return (
        <TrackScene
          art={scene.art}
          mark="check"
          stage="task"
          title={t.saved.title}
          intro={t.saved.intro}
          headingRef={headingRef}
          sheet={
            <>
              {linkUrl ? <LinkTag url={linkUrl} focal /> : null}
              {verification}
            </>
          }
          aside={
            <>
              <section aria-labelledby="saved-status-title" aria-busy={isContinuing} className="flex flex-col gap-3">
                <h2 id="saved-status-title" className="text-subheading text-foreground">
                  {headline.title}
                </h2>
                <p className="max-w-[52ch] text-body text-foreground/85">
                  {headline.intro} {headline.extra}
                </p>
                {retry}
              </section>
              {headline.tone === "match" ? (
                <SceneNote icon={<ShieldIcon className="size-4" />}>{t.aiNote}</SceneNote>
              ) : null}
              <SceneNote icon={<UserIcon className="size-4" />}>{t.staffContact}</SceneNote>
              <MoreActions
                waiting={isContinuing}
                reportAnotherLabel={t.actions.reportAnotherLost}
                onReportAnother={() => router.push("/report/lost")}
              />
            </>
          }
        />
      );
    }

    return (
      <TrackScene
        art={scene.art}
        mark={scene.mark}
        stage={task ? "task" : "status"}
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
        sheet={
          <>
            {verification}
            <CaseTag view={matching} waiting={isContinuing} ownership={ownership}>
              {retry}
            </CaseTag>
          </>
        }
        aside={
          <>
            {headline.tone === "match" ? (
              <SceneNote icon={<ShieldIcon className="size-4" />}>{t.aiNote}</SceneNote>
            ) : null}
            {linkUrl ? <LinkTag url={linkUrl} /> : null}
            {decided ? null : <SceneNote icon={<UserIcon className="size-4" />}>{t.staffContact}</SceneNote>}
            <MoreActions
              waiting={isContinuing}
              reportAnotherLabel={t.actions.reportAnotherLost}
              onReportAnother={() => router.push("/report/lost")}
            />
          </>
        }
      />
    );
  }

  return (
    <>
      <SiteHeader tone="pine" />
      <main id="main" className="flex-1">
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
        ) : (
          statusView()
        )}
      </main>
      <SiteFooter />
    </>
  );
}
