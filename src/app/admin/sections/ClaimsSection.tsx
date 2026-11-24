import { LockIcon } from "@/components/icons";
import { Notice, StatusChip } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import { formatDateTime } from "@/i18n/format";
import type { AdminMessages } from "@/i18n/messages/admin";
import {
  AskFollowupForm,
  OwnershipDecisionForm,
  ResetDecisionForm,
  RetryAssessmentButton,
} from "@/app/admin/OwnershipControls";
import {
  answersStatus,
  assessmentMissing,
  currentDecision,
  decidedAt,
  single,
  waitingOnLabel,
  type ReportMatch,
  type Verification,
} from "@/app/admin/parts/model";
import { JumpButton } from "@/app/admin/parts/JumpButton";
import { ClaimExpander } from "@/app/admin/parts/ClaimExpander";
import {
  Disclosure,
  EmptyState,
  PairLine,
  QueueHeading,
  ReportPair,
  ScoreChip,
  ScoreNote,
  blockClassName,
  rowClassName,
  stampClassName,
} from "@/app/admin/parts/ui";

// Ownership claims: who is waiting on whom, the owner's answers beside the
// private expected details, the AI assessment as a recommendation, the
// optional follow-up, and the staff decision with its history.

type Props = {
  t: AdminMessages;
  locale: Locale;
  state: "ok" | "not_set_up" | "error";
  ready: Verification[];
  waiting: Verification[];
  decided: Verification[];
  loadedAt: number;
  matches: ReportMatch[];
  followupsAvailable: boolean;
};

/** Read-only view of the saved questions, answers and AI assessment. Nothing is generated here. */
function OwnershipReview({
  verification,
  t,
  locale,
}: {
  verification: Verification;
  t: AdminMessages;
  locale: Locale;
}) {
  const answers = verification.answers ?? [];
  const assessment = single(verification.assessment);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {verification.questions.length === 0 ? (
        <p className="text-small text-foreground">{t.verificationNoQuestions}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {verification.questions.map((question, index) => {
            const answer = answers.find((item) => item.question_number === index + 1);
            return (
              <li key={index} className={blockClassName}>
                <p className="text-caption font-semibold text-muted-foreground">{t.question(index + 1)}</p>
                <p dir="auto" className="break-words text-body font-semibold text-foreground">{question}</p>
                <div className="mt-1 grid gap-3 md:grid-cols-2">
                  <div className="border-s-2 border-forest ps-3">
                    <p className="text-caption font-semibold text-forest">{t.ownerAnswer}</p>
                    {answer ? (
                      <p dir="auto" className="mt-0.5 break-words text-small text-foreground">{answer.answer}</p>
                    ) : (
                      <p className="mt-0.5 text-small text-muted-foreground">{t.awaitingAnswer}</p>
                    )}
                  </div>
                  <div className="border-s-2 border-border ps-3">
                    <p className="flex items-center gap-1.5 text-caption font-semibold text-muted-foreground">
                      <LockIcon className="size-3.5" />
                      {t.expectedPrivate}
                    </p>
                    <p dir="auto" className="mt-0.5 break-words text-small text-foreground">
                      {verification.expected_details[index]}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {verification.questions.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-secondary p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-body font-semibold text-foreground">{t.aiAssessment}</h5>
            <StatusChip tone="info">{t.recommendationOnly}</StatusChip>
          </div>
          {assessment ? (
            <>
              <p className="text-body font-medium text-foreground">{t.assessment[assessment.assessment]}</p>
              <p dir="auto" className="break-words text-small text-foreground/85">{assessment.explanation}</p>
              <p className={stampClassName}>
                {t.assessmentFooter(formatDateTime(assessment.created_at, locale), assessment.model)}
              </p>
            </>
          ) : assessmentMissing(verification) ? (
            // The retry button sits on the claim's head, where the row shows it too.
            <p className="text-small text-foreground">{t.assessmentDidNotFinish}</p>
          ) : (
            <p className="text-small text-foreground/85">{t.assessmentRunsAfter}</p>
          )}
        </div>
      ) : null}
      <p className="text-caption text-muted-foreground">{t.expectedHelp}</p>
    </div>
  );
}

/** The optional staff follow-up: the question and answer once asked, or the form while undecided. */
function FollowupPanel({
  verification,
  decided,
  available,
  t,
  locale,
}: {
  verification: Verification;
  decided: boolean;
  available: boolean;
  t: AdminMessages;
  locale: Locale;
}) {
  const followup = verification.followup;
  if (followup) {
    const answered = followup.answer !== null;
    return (
      <section aria-label={t.followupTitle} className={blockClassName}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h5 className="text-body font-semibold text-foreground">{t.followupTitle}</h5>
          <StatusChip tone={answered ? "ok" : "wait"}>
            {answered ? t.followupAnswered : t.followupAwaiting}
          </StatusChip>
        </div>
        <p dir="auto" className="break-words text-small font-semibold text-foreground">{followup.question}</p>
        {answered ? (
          <div className="border-s-2 border-forest ps-3">
            <p className="text-caption font-semibold text-forest">{t.ownerAnswer}</p>
            <p dir="auto" className="mt-0.5 break-words text-small text-foreground">{followup.answer}</p>
          </div>
        ) : (
          <p className="text-small text-foreground/85">{t.followupOwnerSees}</p>
        )}
        <p className={stampClassName}>{t.followupAsked(formatDateTime(followup.created_at, locale))}</p>
      </section>
    );
  }
  if (decided) {
    return null;
  }
  if (!available) {
    return <p className="text-small text-foreground/85">{t.followupNotSetUp}</p>;
  }
  return <AskFollowupForm verificationId={verification.id} />;
}

type CardKind = "ready" | "waiting" | "decided";

/** The evidence behind a claim, each part behind its own disclosure. */
function ClaimEvidence({
  verification,
  match,
  otherMatches,
  openAnswers,
  withFollowup,
  t,
  locale,
}: {
  verification: Verification;
  match: ReportMatch | undefined;
  otherMatches: ReportMatch[];
  openAnswers: boolean;
  // Ready claims: the answered follow-up is evidence, read with the answers.
  withFollowup: boolean;
  t: AdminMessages;
  locale: Locale;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Disclosure label={t.questionsAndAnswers} defaultOpen={openAnswers}>
        <OwnershipReview verification={verification} t={t} locale={locale} />
        {withFollowup && verification.followup ? (
          <div className="mb-3">
            <FollowupPanel verification={verification} decided available t={t} locale={locale} />
          </div>
        ) : null}
      </Disclosure>

      <Disclosure label={t.reportsCompared}>
        <ReportPair lost={match?.lost ?? null} found={match?.found ?? null} t={t} />
      </Disclosure>

      {otherMatches.length > 0 ? (
        <Disclosure label={t.otherSuggestions(otherMatches.length)}>
          <ol className="flex flex-col gap-2">
            {otherMatches.map((other) => (
              <li key={other.id} className={blockClassName}>
                <div className="flex flex-wrap items-center gap-2">
                  <ScoreChip score={other.ai_similarity_score} t={t} />
                  <span className="text-caption font-medium text-muted-foreground">
                    {other.ai_decision === "match" ? t.aiPossibleMatch : t.aiNotEnough}
                  </span>
                </div>
                <p className="text-small font-semibold text-foreground">
                  {t.kindFound}: <bdi dir="auto">{other.found?.item_name ?? t.reportUnavailable}</bdi>
                </p>
                {other.found ? (
                  <p dir="auto" className="break-words text-small text-foreground/85">
                    {other.found.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </Disclosure>
      ) : null}
    </div>
  );
}

function DecisionHistory({ verification, t, locale }: { verification: Verification; t: AdminMessages; locale: Locale }) {
  const history = [...(verification.decisions ?? [])].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  if (history.length === 0) {
    return null;
  }
  return (
    <Disclosure label={t.decisionHistory(history.length)}>
      <ol className="flex flex-col divide-y divide-border">
        {history.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-0.5 py-2 text-small first:pt-0 last:pb-0">
            <p className="font-semibold text-foreground">{t.decision[entry.decision]}</p>
            {entry.note ? (
              <p dir="auto" className="break-words text-foreground">
                {entry.note}
              </p>
            ) : null}
            <p className={stampClassName}>{formatDateTime(entry.created_at, locale)}</p>
          </li>
        ))}
      </ol>
    </Disclosure>
  );
}

/**
 * One claim. The head is always a one-glance summary: the pair, where it
 * stands, the AI's suggestion in words and who it waits on. Evidence sits
 * behind disclosures. The next ready claim (oldest ready) is open with its
 * decision controls and carries the screen's one brass accent; later ready
 * claims stay compact until staff choose "Review claim".
 */
function ClaimCard({
  verification,
  kind,
  next = false,
  matches,
  followupsAvailable,
  t,
  locale,
}: {
  verification: Verification;
  kind: CardKind;
  next?: boolean;
  matches: ReportMatch[];
  followupsAvailable: boolean;
  t: AdminMessages;
  locale: Locale;
}) {
  const match = matches.find((item) => item.id === verification.report_match_id);
  const otherMatches = matches
    .filter(
      (item) =>
        item.lost_report_id === verification.lost_report_id && item.id !== verification.report_match_id,
    )
    .sort((a, b) => (b.ai_similarity_score ?? -1) - (a.ai_similarity_score ?? -1));
  const decision = currentDecision(verification);
  const assessment = single(verification.assessment);
  const decisionTone =
    decision?.decision === "approved" ? "ok" : decision?.decision === "rejected" ? "bad" : "wait";
  const evidence = (
    <ClaimEvidence
      verification={verification}
      match={match}
      otherMatches={otherMatches}
      openAnswers={kind === "ready"}
      withFollowup={kind === "ready"}
      t={t}
      locale={locale}
    />
  );

  // Evidence beside the decision; asking a follow-up stays with the decision
  // until one is asked, then the answer moves to the evidence.
  const readyBody = (
    <div
      className={`grid border-t xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] ${next ? "border-brass/40" : "border-border/80"}`}
    >
      <div className="min-w-0 px-4 py-2 sm:px-5">{evidence}</div>
      <section
        id={`decision-${verification.id}`}
        tabIndex={-1}
        aria-label={t.staffDecision}
        className="flex min-w-0 scroll-mt-4 flex-col gap-4 bg-secondary p-4 focus:outline-none sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-subheading text-foreground">{t.staffDecision}</h4>
          <StatusChip tone="wait">{t.status.pendingReview}</StatusChip>
        </div>
        <OwnershipDecisionForm verificationId={verification.id} />
        {verification.followup ? null : (
          <FollowupPanel
            verification={verification}
            decided={false}
            available={followupsAvailable}
            t={t}
            locale={locale}
          />
        )}
        <DecisionHistory verification={verification} t={t} locale={locale} />
      </section>
    </div>
  );

  return (
    <li
      id={`verification-${verification.id}`}
      className={`${rowClassName} relative scroll-mt-6 overflow-hidden ${next ? "bg-brass-soft/60 ring-2 ring-brass" : ""}`}
    >
      <div className="flex flex-col gap-2.5 p-4 sm:px-5">
        {next ? (
          <p className="flex items-center gap-2 text-caption font-semibold text-brass-ink">
            <span aria-hidden className="eyelet size-3" />
            {t.nextDecision}
          </p>
        ) : null}
        <PairLine match={match} t={t} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {kind === "decided" ? null : (
            <StatusChip tone={kind === "ready" ? "wait" : "neutral"}>{answersStatus(verification, t)}</StatusChip>
          )}
          {assessment ? (
            <StatusChip
              tone="info"
              icon={null}
            >
              {t.aiSuggests(t.assessment[assessment.assessment])}
            </StatusChip>
          ) : null}
          {assessmentMissing(verification) ? (
            <StatusChip tone="bad" icon={null}>
              {t.status.assessmentMissing}
            </StatusChip>
          ) : null}
          {kind === "decided" ? null : (
            <span className="text-small text-foreground">
              {t.waitingOn}: <span className="font-semibold">{waitingOnLabel(verification, t)}</span>
            </span>
          )}
          {match ? <ScoreNote score={match.ai_similarity_score} t={t} /> : null}
        </div>
        {assessmentMissing(verification) && !decision ? (
          <RetryAssessmentButton verificationId={verification.id} />
        ) : null}
        {/* Below xl the decision follows the evidence; this skips to it. */}
        {kind === "ready" && next ? (
          <JumpButton targetId={`decision-${verification.id}`} label={t.jumpToDecision} className="-my-1 xl:hidden" />
        ) : null}
      </div>

      {kind === "ready" && next ? readyBody : null}

      {/* Other ready claims: a compact row; "Review claim" opens the same body. */}
      {kind === "ready" && !next ? (
        <ClaimExpander claimId={`verification-${verification.id}`} label={t.reviewClaim} openLabel={t.hideClaim}>
          {readyBody}
        </ClaimExpander>
      ) : null}

      {kind === "waiting" ? (
        <div className="flex min-w-0 flex-col gap-3 border-t border-border/80 px-4 py-2 sm:px-5">
          {verification.followup ? (
            <div className="pt-2">
              <FollowupPanel
                verification={verification}
                decided={false}
                available={followupsAvailable}
                t={t}
                locale={locale}
              />
            </div>
          ) : null}
          <Disclosure label={t.openClaim}>
            {evidence}
            <section aria-label={t.staffDecision} className="mb-2 flex min-w-0 flex-col gap-4 rounded-2xl bg-secondary p-4">
              <h4 className="text-subheading text-foreground">{t.staffDecision}</h4>
              <OwnershipDecisionForm verificationId={verification.id} />
              {verification.followup ? null : (
                <FollowupPanel
                  verification={verification}
                  decided={false}
                  available={followupsAvailable}
                  t={t}
                  locale={locale}
                />
              )}
              <DecisionHistory verification={verification} t={t} locale={locale} />
            </section>
          </Disclosure>
        </div>
      ) : null}

      {kind === "decided" && decision ? (
        <div className="flex min-w-0 flex-col border-t border-border/80">
          <section
            aria-label={t.staffDecision}
            className={`flex min-w-0 flex-col gap-1.5 px-4 py-3 sm:px-5 ${
              decision.decision === "approved" ? "bg-ok-soft/60" : "bg-bad-soft/60"
            }`}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <StatusChip tone={decisionTone}>{t.decision[decision.decision]}</StatusChip>
              <span className={stampClassName}>{formatDateTime(decision.created_at, locale)}</span>
            </div>
            {decision.note ? (
              <p dir="auto" className="break-words text-small text-foreground">
                <span className="font-semibold">{t.decisionNote}: </span>
                {decision.note}
              </p>
            ) : null}
            {decision.decision === "approved" ? (
              <p className="text-small text-foreground/85">{t.approvalNoReturn}</p>
            ) : null}
          </section>
          <div className="flex min-w-0 flex-col gap-1 px-4 py-2 sm:px-5">
            {verification.followup ? (
              <Disclosure label={t.followupTitle}>
                <FollowupPanel
                  verification={verification}
                  decided
                  available={followupsAvailable}
                  t={t}
                  locale={locale}
                />
              </Disclosure>
            ) : null}
            {evidence}
            <Disclosure label={t.changeDecision}>
              <ResetDecisionForm verificationId={verification.id} />
              <DecisionHistory verification={verification} t={t} locale={locale} />
            </Disclosure>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function ClaimList({
  items,
  kind,
  withNext = false,
  ...rest
}: {
  items: Verification[];
  kind: CardKind;
  withNext?: boolean;
  matches: ReportMatch[];
  followupsAvailable: boolean;
  t: AdminMessages;
  locale: Locale;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((verification, index) => (
        <ClaimCard
          key={verification.id}
          verification={verification}
          kind={kind}
          next={withNext && index === 0}
          {...rest}
        />
      ))}
    </ul>
  );
}

// Decisions this recent stay in view so staff can check or reset them.
const RECENT_DECISION_MS = 30 * 60_000;

export function ClaimsSection({
  t,
  locale,
  state,
  ready,
  waiting,
  decided,
  loadedAt,
  matches,
  followupsAvailable,
}: Props) {
  if (state === "not_set_up") {
    return (
      <Notice tone="error" role="alert">
        {t.errorClaimsNotSetUp}
      </Notice>
    );
  }
  if (state === "error") {
    return (
      <Notice tone="error" role="alert">
        {t.errorClaims}
      </Notice>
    );
  }
  const total = ready.length + waiting.length + decided.length;
  const listProps = { matches, followupsAvailable, t, locale };
  const recent = decided.filter(
    (verification) => loadedAt - new Date(decidedAt(verification)).getTime() < RECENT_DECISION_MS,
  );
  const earlier = decided.filter((verification) => !recent.includes(verification));

  return (
    <div id="verification" className="flex scroll-mt-6 flex-col gap-6">
      <p className="flex max-w-[70ch] items-start gap-2 text-small text-foreground/85">
        <LockIcon className="mt-1 size-4 shrink-0 text-forest" />
        {t.privacyNote}
      </p>

      {total === 0 ? (
        <EmptyState title={t.emptyClaimsTitle}>{t.emptyClaims}</EmptyState>
      ) : (
        <>
          <section aria-labelledby="ready-heading" className="flex flex-col gap-3">
            <QueueHeading id="ready-heading" title={t.readyGroup} count={ready.length} />
            {ready.length === 0 ? (
              <EmptyState title={t.emptyReadyTitle}>{t.emptyReady}</EmptyState>
            ) : (
              <ClaimList items={ready} kind="ready" withNext {...listProps} />
            )}
          </section>

          {recent.length > 0 ? (
            <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
              <QueueHeading
                id="recent-heading"
                title={t.recentlyDecidedGroup}
                count={recent.length}
                intro={t.recentlyDecidedHelp}
              />
              <ClaimList items={recent} kind="decided" {...listProps} />
            </section>
          ) : null}

          {waiting.length > 0 ? (
            <section aria-labelledby="waiting-heading" className="flex scroll-mt-6 flex-col gap-3">
              <QueueHeading id="waiting-heading" title={t.waitingGroup} count={waiting.length} />
              <ClaimList items={waiting} kind="waiting" {...listProps} />
            </section>
          ) : null}

          {earlier.length > 0 ? (
            <Disclosure
              label={t.olderDecidedGroup(earlier.length)}
              className="rounded-[1.25rem] bg-secondary/70 px-4 py-1.5 sm:px-5"
            >
              <div className="mb-4">
                <ClaimList items={earlier} kind="decided" {...listProps} />
              </div>
            </Disclosure>
          ) : null}
        </>
      )}
    </div>
  );
}
