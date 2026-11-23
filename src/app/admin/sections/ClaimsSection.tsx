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
  readyForDecision,
  single,
  waitingOnLabel,
  type ReportMatch,
  type Verification,
} from "@/app/admin/parts/model";
import {
  Disclosure,
  EmptyState,
  PairNames,
  QueueHeading,
  ReportPair,
  ScoreChip,
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
                <p className="break-words text-body font-semibold text-foreground">{question}</p>
                <div className="mt-1 grid gap-3 md:grid-cols-2">
                  <div className="border-s-2 border-forest ps-3">
                    <p className="text-caption font-semibold text-forest">{t.ownerAnswer}</p>
                    {answer ? (
                      <p className="mt-0.5 break-words text-small text-foreground">{answer.answer}</p>
                    ) : (
                      <p className="mt-0.5 text-small text-muted-foreground">{t.awaitingAnswer}</p>
                    )}
                  </div>
                  <div className="border-s-2 border-border ps-3">
                    <p className="flex items-center gap-1.5 text-caption font-semibold text-muted-foreground">
                      <LockIcon className="size-3.5" />
                      {t.expectedPrivate}
                    </p>
                    <p className="mt-0.5 break-words text-small text-foreground">
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
              <p className="break-words text-small text-foreground/85">{assessment.explanation}</p>
              <p className={stampClassName}>
                {t.assessmentFooter(formatDateTime(assessment.created_at, locale), assessment.model)}
              </p>
            </>
          ) : assessmentMissing(verification) ? (
            <>
              <p className="text-small text-foreground">{t.assessmentDidNotFinish}</p>
              <RetryAssessmentButton verificationId={verification.id} />
            </>
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
        <p className="break-words text-small font-semibold text-foreground">{followup.question}</p>
        {answered ? (
          <div className="border-s-2 border-forest ps-3">
            <p className="text-caption font-semibold text-forest">{t.ownerAnswer}</p>
            <p className="mt-0.5 break-words text-small text-foreground">{followup.answer}</p>
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

function ClaimCard({
  verification,
  matches,
  followupsAvailable,
  t,
  locale,
}: {
  verification: Verification;
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
  const ready = readyForDecision(verification);
  const history = [...(verification.decisions ?? [])].sort((a, b) =>
    a.created_at < b.created_at ? -1 : 1,
  );
  const decisionTone =
    decision?.decision === "approved" ? "ok" : decision?.decision === "rejected" ? "bad" : "wait";

  return (
    <li
      id={`verification-${verification.id}`}
      className={`${rowClassName} scroll-mt-6 overflow-hidden ${ready ? "ring-2 ring-brass" : ""}`}
    >
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <PairNames match={match} t={t} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <StatusChip tone={decision ? decisionTone : ready ? "wait" : "neutral"}>
            {decision ? t.decision[decision.decision] : answersStatus(verification, t)}
          </StatusChip>
          {match ? <ScoreChip score={match.ai_similarity_score} t={t} /> : null}
          {assessmentMissing(verification) ? (
            <StatusChip tone="bad" icon={null}>
              {t.status.assessmentMissing}
            </StatusChip>
          ) : null}
          <span className="text-small text-foreground">
            {t.waitingOn}: <span className="font-semibold">{waitingOnLabel(verification, t)}</span>
          </span>
          <span className={stampClassName}>
            {t.questionsPrepared(formatDateTime(verification.created_at, locale), verification.model)}
          </span>
        </div>
      </div>

      {/* Evidence first; the decision beside it on wide screens. */}
      <div className="grid border-t border-border/80 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="flex min-w-0 flex-col gap-1 p-4 sm:px-5">
          <Disclosure label={t.questionsAndAnswers} defaultOpen={ready}>
            <OwnershipReview verification={verification} t={t} locale={locale} />
          </Disclosure>

          <Disclosure label={t.reportsCompared}>
            <ReportPair lost={match?.lost ?? null} found={match?.found ?? null} t={t} />
          </Disclosure>

          <Disclosure label={t.otherSuggestions(otherMatches.length)}>
            {otherMatches.length === 0 ? (
              <p className="text-small text-muted-foreground">{t.noOtherSuggestions}</p>
            ) : (
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
                      {t.kindFound}: {other.found?.item_name ?? t.reportUnavailable}
                    </p>
                    {other.found ? (
                      <p className="break-words text-small text-foreground/85">{other.found.description}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </Disclosure>
        </div>

        <section
          aria-label={t.staffDecision}
          className={`flex min-w-0 flex-col gap-4 p-4 sm:p-5 ${
            decision?.decision === "approved"
              ? "bg-ok-soft/60"
              : decision?.decision === "rejected"
                ? "bg-bad-soft/60"
                : "bg-secondary"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-subheading text-foreground">{t.staffDecision}</h4>
            <StatusChip tone={decisionTone}>
              {decision ? t.decision[decision.decision] : t.status.pendingReview}
            </StatusChip>
          </div>

          <FollowupPanel
            verification={verification}
            decided={Boolean(decision)}
            available={followupsAvailable}
            t={t}
            locale={locale}
          />

          {decision ? (
            <>
              <div className="flex flex-col gap-1 text-small">
                {decision.note ? (
                  <p className="break-words text-foreground">
                    <span className="font-semibold">{t.decisionNote}: </span>
                    {decision.note}
                  </p>
                ) : null}
                <p className={stampClassName}>{formatDateTime(decision.created_at, locale)}</p>
                {decision.decision === "approved" ? (
                  <p className="text-foreground/85">{t.approvalNoReturn}</p>
                ) : null}
              </div>
              <ResetDecisionForm verificationId={verification.id} />
            </>
          ) : (
            <OwnershipDecisionForm verificationId={verification.id} />
          )}

          {history.length > 0 ? (
            <Disclosure label={t.decisionHistory(history.length)} className="border-t border-foreground/10 pt-1">
              <ol className="flex flex-col divide-y divide-border">
                {history.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 py-2 text-small first:pt-0 last:pb-0">
                    <p className="font-semibold text-foreground">{t.decision[entry.decision]}</p>
                    {entry.note ? <p className="break-words text-foreground">{entry.note}</p> : null}
                    <p className={stampClassName}>{formatDateTime(entry.created_at, locale)}</p>
                  </li>
                ))}
              </ol>
            </Disclosure>
          ) : null}
        </section>
      </div>
    </li>
  );
}

function ClaimList({
  items,
  ...rest
}: {
  items: Verification[];
  matches: ReportMatch[];
  followupsAvailable: boolean;
  t: AdminMessages;
  locale: Locale;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((verification) => (
        <ClaimCard key={verification.id} verification={verification} {...rest} />
      ))}
    </ul>
  );
}

export function ClaimsSection({ t, locale, state, ready, waiting, decided, matches, followupsAvailable }: Props) {
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
              <ClaimList items={ready} {...listProps} />
            )}
          </section>

          {waiting.length > 0 ? (
            <section aria-labelledby="waiting-heading" className="flex flex-col gap-3">
              <QueueHeading id="waiting-heading" title={t.waitingGroup} count={waiting.length} />
              <ClaimList items={waiting} {...listProps} />
            </section>
          ) : null}

          {decided.length > 0 ? (
            <section aria-labelledby="decided-heading" className="flex flex-col gap-3">
              <QueueHeading id="decided-heading" title={t.decidedGroup} count={decided.length} />
              <ClaimList items={decided} {...listProps} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
