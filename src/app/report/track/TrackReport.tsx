"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LostProgress,
  MoreActions,
  RetryAction,
  canContinue,
  lostHeadline,
  sceneFor,
  statusMessage,
  type OwnershipStage,
} from "@/app/report/SubmissionConfirmation";
import { CaseTag } from "@/app/report/track/parts/CaseTag";
import { LinkTag } from "@/app/report/track/parts/LinkTag";
import { SceneNote, TrackScene } from "@/app/report/track/parts/TrackScene";
import { OwnershipVerification, type OwnershipControl } from "@/app/report/track/OwnershipVerification";
import { NextSteps } from "@/app/report/track/parts/NextSteps";
import { TryStaffRole } from "@/app/report/track/parts/TryStaffRole";
import { takeJustSaved } from "@/app/report/tracking";
import { useMatchingProgress } from "@/app/report/useMatchingProgress";
import { ArrowEndIcon, ChevronDownIcon, ClockIcon, LinkIcon, ShieldIcon, UserIcon } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import {
  FieldError,
  LoadingRow,
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  textLinkClassName,
  textLinkOnDarkClassName,
} from "@/components/ui";
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
          <PasteLink />
          <span aria-hidden className="perforation my-5 block text-foreground/20" />
          <p className="mb-3 text-small font-semibold text-foreground">{t.noLink.placesTitle}</p>
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

// The shape of a private credential (src/utils/matching/submissionCredential.ts is server-only).
const CREDENTIAL_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/** The credential from a pasted Amanah tracking link, or null when it isn't one. */
function credentialFromLink(value: string) {
  try {
    const url = new URL(value.trim(), window.location.origin);
    const credential = url.hash.slice(1);
    return url.pathname === "/report/track" && CREDENTIAL_SHAPE.test(credential) ? credential : null;
  } catch {
    return null;
  }
}

/** Opens a pasted tracking link in place; the page follows the new hash. */
function PasteLink() {
  const t = useMessages(track);
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const credential = credentialFromLink(value);
        if (!credential) {
          setInvalid(true);
          return;
        }
        window.location.hash = credential;
      }}
    >
      <label htmlFor="paste-link" className={labelClassName}>
        {t.noLink.pasteLabel}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            id="paste-link"
            type="url"
            dir="ltr"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={t.noLink.pastePlaceholder}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setInvalid(false);
            }}
            aria-invalid={invalid}
            aria-describedby={invalid ? "paste-link-error" : undefined}
            className={fieldClassName}
          />
          {invalid ? <FieldError id="paste-link-error">{t.noLink.pasteInvalid}</FieldError> : null}
        </div>
        <button type="submit" className={primaryButtonClassName}>
          {t.noLink.pasteSubmit}
          <ArrowEndIcon className="size-4" />
        </button>
      </div>
    </form>
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
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            {/* An empty hash brings back the page where a link can be pasted. */}
            <button type="button" onClick={() => (window.location.hash = "")} className={secondaryButtonClassName}>
              {t.broken.tryAnother}
            </button>
            <Link href="/report/lost" className={textLinkClassName}>
              {t.actions.reportLost}
              <ArrowEndIcon className="size-4" />
            </Link>
          </div>
        </Slip>
      }
    />
  );
}

// Nothing is left for the owner to answer: staff decide, or already did.
const settledStages: ReadonlySet<OwnershipStage> = new Set([
  "staff_review",
  "answers_received",
  "approved",
  "rejected",
]);

/** Test version only: a quiet line that saved reports are deleted after a few days. */
function SandboxNote() {
  const t = useMessages(track);
  return <SceneNote icon={<ClockIcon className="size-4" />}>{t.sandbox.note}</SceneNote>;
}

export default function TrackReport({ sandbox = false }: { sandbox?: boolean }) {
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
  // Checking has stopped and every pair was compared with no possible match.
  // Only then may the first visit trade "saved" for the result as its
  // headline; paused, unfinished or uncertain checks keep "saved".
  const definitiveNoMatch =
    !isContinuing &&
    matching !== null &&
    matching.phase === "complete" &&
    "outcome" in matching &&
    matching.outcome === "no_match";
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Right after saving, the status has its own heading beside the link card.
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);
  const verificationRef = useRef<OwnershipControl>(null);
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
    // On the first visit the headline changes only for a definite no-match.
    if (wasContinuing.current && !isContinuing && (!justSaved || definitiveNoMatch)) {
      const active = document.activeElement;
      if (!active || active === document.body) {
        headingRef.current?.focus();
      }
    }
    wasContinuing.current = isContinuing;
  }, [isContinuing, justSaved, definitiveNoMatch]);

  // After the last answer, or a decision tried in the test version, the
  // ownership card steps aside and the status heading says the result: move
  // focus to it.
  const previousStage = useRef<OwnershipStage | null>(null);
  useEffect(() => {
    const was = previousStage.current;
    previousStage.current = ownershipStage;
    if (!ownershipStage || !settledStages.has(ownershipStage) || was === ownershipStage) return;
    const answered = was === "question" || was === "followup";
    const decided = was !== null && settledStages.has(was);
    if (answered || decided) {
      // The first visit promotes these results to the main heading too.
      headingRef.current?.focus();
    }
  }, [ownershipStage, justSaved]);

  // Scrolls to the question and puts the cursor in its answer field; the hash stays the credential.
  function goToQuestion() {
    const field = document.getElementById("ownership-answer");
    field?.scrollIntoView({ block: "center" });
    field?.focus({ preventScroll: true });
  }

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
  // Reopening a link: until the ownership status arrives, say only that it is
  // loading, so a decided claim never flashes "possible match" first.
  const ownershipLoading = showVerification && !justSaved && (ownershipStage === null || ownershipStage === "loading");
  const resolved = matching ? lostHeadline(t, matching, isContinuing, ownership) : null;
  const headline =
    resolved && ownershipLoading ? { ...resolved, ...t.opening, extra: undefined } : resolved;
  const decided = ownership === "approved" || ownership === "rejected";

  // Right after saving, the link card needs only the URL: show it at once,
  // under the same headline, while the status loads beside it. The same
  // scene element follows, so the card stays put when the status arrives.
  function savedLoadingView(url: string) {
    return (
      <TrackScene
        art="compare"
        mark="check"
        stage="task"
        title={t.saved.title}
        intro={t.saved.intro}
        headingRef={headingRef}
        sheet={
          <>
            <LinkTag url={url} focal />
          </>
        }
        aside={
          <>
            <div aria-busy="true">
              <LoadingRow>{t.comparingNow}</LoadingRow>
            </div>
            {sandbox ? <SandboxNote /> : null}
          </>
        }
      />
    );
  }

  function statusView() {
    if (!matching || !headline) return <Opening />;
    const scene = sceneFor(headline, ownership);
    const verification =
      showVerification && credential ? (
        <OwnershipVerification
          key={credential}
          credential={credential}
          onStageChange={setOwnershipStage}
          controlRef={verificationRef}
          headlineShown
          sandbox={sandbox}
        />
      ) : null;
    // Test version: once nothing is left to answer, the visitor may play staff.
    const tryStaff =
      sandbox && showVerification && credential && ownership && settledStages.has(ownership) ? (
        <TryStaffRole
          credential={credential}
          decision={decided ? (ownership as "approved" | "rejected") : null}
          onDecided={(view) => verificationRef.current?.applyView(view)}
        />
      ) : null;
    const task =
      justSaved ||
      ownership === "loading" ||
      ownership === "question" ||
      ownership === "followup" ||
      ownership === "retry";
    const retry = <RetryAction view={matching} waiting={isContinuing} canRetry={canRetry} onRetry={retryChecks} />;
    const progress = (
      <LostProgress view={matching} waiting={isContinuing} ownership={ownership}>
        {/* Right after saving, the question sits under the link card: a way straight to it. */}
        {justSaved && (ownership === "question" || ownership === "followup") ? (
          <button type="button" onClick={goToQuestion} className={textLinkOnDarkClassName}>
            {t.steps.toQuestion}
            <ChevronDownIcon className="size-4" />
          </button>
        ) : null}
      </LostProgress>
    );
    // While staff review, the page ends on what happens next. A decision's
    // next step is already in its headline.
    const nextSteps =
      ownership === "staff_review" || ownership === "answers_received" ? (
        <NextSteps />
      ) : decided ? null : (
        <SceneNote icon={<UserIcon className="size-4" />}>{t.staffContact}</SceneNote>
      );
    // The AI note describes the possible match itself, never a staff follow-up.
    const aiNote =
      headline.tone === "match" && ownership !== "followup" ? (
        <SceneNote icon={<ShieldIcon className="size-4" />}>{t.aiNote}</SceneNote>
      ) : null;

    if (justSaved) {
      // Right after saving, the page is about keeping the link: one tag on the
      // counter. While checking runs (or stops short of a clear answer) the
      // headline says the report is saved and the status follows below. Once
      // there is a clear result (every pair compared with no match, answers
      // sent, or a decision) that result becomes the headline, as it is when
      // the link is reopened, and "saved" stays as a small confirmation above
      // it. The result is shown once, not twice.
      const promote =
        definitiveNoMatch ||
        ownership === "answers_received" ||
        ownership === "staff_review" ||
        ownership === "approved" ||
        ownership === "rejected";
      return (
        <TrackScene
          art={scene.art}
          mark={promote ? scene.mark : "check"}
          stage="task"
          context={promote ? t.saved.context : undefined}
          title={promote ? headline.title : t.saved.title}
          intro={promote ? headline.intro : t.saved.intro}
          headingRef={headingRef}
          progress={progress}
          sheet={
            <>
              {linkUrl ? <LinkTag url={linkUrl} focal /> : null}
              {verification}
              {/* The status is said once, beside the link; the tag carries only a decision's stamp. */}
              {decided ? <CaseTag view={matching} waiting={isContinuing} ownership={ownership} /> : null}
              {tryStaff}
            </>
          }
          aside={
            <>
              {/* Said once: when the questions could not be prepared, the question card explains it and has its own retry. */}
              {promote || ownership === "retry" ? null : (
                <section aria-labelledby="saved-status-title" aria-busy={isContinuing} className="flex flex-col gap-3">
                  <h2
                    id="saved-status-title"
                    ref={statusHeadingRef}
                    tabIndex={-1}
                    className="text-subheading text-foreground outline-none"
                  >
                    {headline.title}
                  </h2>
                  <p className="max-w-[52ch] text-body text-foreground/85">
                    {headline.intro} {headline.extra}
                  </p>
                  {retry}
                </section>
              )}
              {aiNote}
              {nextSteps}
              {sandbox ? <SandboxNote /> : null}
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
        progress={progress}
        sheet={
          <>
            {verification}
            <CaseTag view={matching} waiting={isContinuing} ownership={ownership}>
              {canContinue(matching, isContinuing, canRetry) ? retry : null}
            </CaseTag>
            {tryStaff}
            {/* The compact link sits on the counter under the tag. */}
            {linkUrl ? <LinkTag url={linkUrl} /> : null}
          </>
        }
        aside={
          <>
            {aiNote}
            {nextSteps}
            {sandbox ? <SandboxNote /> : null}
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
          justSaved && linkUrl ? (
            savedLoadingView(linkUrl)
          ) : (
            <Opening />
          )
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
