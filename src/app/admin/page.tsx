import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  createAdminClient,
  isLocalAdminEnabled,
} from "@/utils/supabase/admin";
import { ArrowRightIcon, CheckIcon, ClockIcon, XIcon } from "@/components/icons";
import { Notice, focusRingClassName } from "@/components/ui";
import { AdminShell, type AdminNavItem, type AdminSectionKey } from "@/app/admin/AdminShell";
import { RunMatching } from "@/app/admin/RunMatching";
import { MonitoringPanel } from "@/app/admin/Monitoring";
import {
  buildDemoMonitoringSnapshot,
  isMonitoringDemoEnabled,
} from "@/utils/monitoring/demo";
import { loadMonitoringSnapshot, type MonitoringLoad } from "@/utils/monitoring/server";
import {
  AskFollowupForm,
  OwnershipDecisionForm,
  ResetDecisionForm,
  RetryAssessmentButton,
} from "@/app/admin/OwnershipControls";
import { latestDecision } from "@/utils/ownership/supabaseStore";


export const dynamic = "force-dynamic";

type MatchedReport = {
  item_name: string;
  description: string;
  location: string;
};

type ReportMatch = {
  id: string;
  lost_report_id: string;
  found_report_id: string;
  explanation: string;
  model: string;
  created_at: string;
  ai_decision: "match" | "insufficient_information";
  supporting_details: string[];
  contradictions: string[];
  missing_information: string[];
  ai_similarity_score: number | null;
  status: "pending_review";
  lost: MatchedReport | null;
  found: MatchedReport | null;
};

const MATCH_COLUMNS = `
  id, lost_report_id, found_report_id, explanation, model, created_at, ai_decision,
  supporting_details, contradictions, missing_information,
  ai_similarity_score, status,
  lost:reports!report_matches_lost_report_fkey(item_name, description, location),
  found:reports!report_matches_found_report_fkey(item_name, description, location)
`;

// Status chips may wrap, so a long label never pushes past its panel.
const chipClassName =
  "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold leading-tight";

function DetailList({
  title,
  items,
  emptyText,
  tone = "default",
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone?: "default" | "warning";
}) {
  const warning = tone === "warning" && items.length > 0;
  return (
    <div className={`rounded-2xl p-4 ${warning ? "bg-bad-soft" : "bg-card"}`}>
      <h4 className={`text-sm font-semibold ${warning ? "text-bad-ink" : "text-foreground"}`}>{title}</h4>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">
          {items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MatchedReportDetails({
  label,
  report,
}: {
  label: string;
  report: MatchedReport | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-4">
      <p className="text-[0.8125rem] font-semibold text-muted-foreground">{label}</p>
      {report ? (
        <>
          <h3 className="font-serif text-xl font-semibold leading-snug text-foreground">{report.item_name}</h3>
          <p className="text-sm leading-relaxed text-foreground">{report.description}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">Location: {report.location}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Report unavailable.</p>
      )}
    </div>
  );
}

function SimilarityBadge({ score }: { score: number | null }) {
  return (
    <span className={`${chipClassName} bg-muted text-foreground`}>
      AI similarity{" "}
      {score === null ? (
        "not scored"
      ) : (
        <span className="tabular-nums">
          <span className="font-semibold">{score}</span>
          <span className="text-muted-foreground">/100</span>
        </span>
      )}
    </span>
  );
}

function byScoreThenNewest(a: ReportMatch, b: ReportMatch) {
  const aScore = a.ai_similarity_score ?? -1;
  const bScore = b.ai_similarity_score ?? -1;
  if (aScore !== bScore) {
    return bScore - aScore;
  }
  return a.created_at < b.created_at ? 1 : -1;
}

const SUMMARY_TOGGLE_CLASS =
  "-ml-2 inline-flex min-h-11 w-fit max-w-full cursor-pointer list-none items-center gap-1.5 rounded-full px-2 text-left text-[0.9375rem] font-semibold text-foreground outline-none transition-colors duration-150 hover:text-forest focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden";

function Chevron({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`size-4 shrink-0 transition-transform duration-150 ${className}`}
    >
      <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return <span className={`${chipClassName} bg-muted text-foreground`}>{children}</span>;
}

/** Review status with the approval (green) and rejection (red) cues. */
function DecisionPill({ verification }: { verification: Verification | undefined }) {
  const decision = verification ? currentDecision(verification) : null;
  const label = verification ? reviewStatus(verification) : "Pending review";
  if (decision?.decision === "approved") {
    return (
      <span className={`${chipClassName} bg-ok-soft text-ok-ink`}>
        <CheckIcon className="size-3.5" />
        {label}
      </span>
    );
  }
  if (decision?.decision === "rejected") {
    return (
      <span className={`${chipClassName} bg-bad-soft text-bad-ink`}>
        <XIcon className="size-3.5" />
        {label}
      </span>
    );
  }
  return (
    <span className={`${chipClassName} bg-wait-soft text-wait-ink`}>
      <ClockIcon className="size-3.5" />
      {label}
    </span>
  );
}

/** "Lost item → Found item", the pair a suggestion or claim is about. */
function ItemNames({ match }: { match: ReportMatch | undefined }) {
  return (
    <dl className="grid min-w-0 gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,auto)_auto_minmax(0,auto)] sm:justify-start">
      <div className="min-w-0">
        <dt className="text-[0.8125rem] font-semibold text-clay-ink">Lost</dt>
        <dd className="font-serif text-[1.375rem] font-semibold leading-tight text-foreground">
          {match?.lost?.item_name ?? "Report unavailable"}
        </dd>
      </div>
      <ArrowRightIcon className="hidden size-5 self-end text-muted-foreground sm:mb-1 sm:block" />
      <div className="min-w-0">
        <dt className="text-[0.8125rem] font-semibold text-forest">Found</dt>
        <dd className="font-serif text-[1.375rem] font-semibold leading-tight text-foreground">
          {match?.found?.item_name ?? "Report unavailable"}
        </dd>
      </div>
    </dl>
  );
}

function Disclosure({
  group,
  label,
  defaultOpen = false,
  children,
}: {
  group: "reports" | "ai" | "review";
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const open = {
    reports: "group-open/reports:rotate-180",
    ai: "group-open/ai:rotate-180",
    review: "group-open/review:rotate-180",
  }[group];
  const groupClass = {
    reports: "group/reports",
    ai: "group/ai",
    review: "group/review",
  }[group];
  return (
    <details className={groupClass} open={defaultOpen}>
      <summary className={SUMMARY_TOGGLE_CLASS}>
        {label}
        <Chevron className={open} />
      </summary>
      <div className="mt-2 flex min-w-0 flex-col gap-3">{children}</div>
    </details>
  );
}

/** The suggestion's AI similarity as the row's key figure. */
function ScoreFigure({ score }: { score: number | null }) {
  return (
    <div className="flex items-baseline gap-1.5 sm:flex-col sm:items-end sm:gap-0">
      <span className="text-[2.25rem] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
        {score ?? "—"}
        {score !== null ? <span className="text-sm text-muted-foreground">/100</span> : null}
      </span>
      <span className="text-[0.8125rem] text-muted-foreground">
        {score === null ? "Not scored" : "AI similarity"}
      </span>
    </div>
  );
}

function MatchCard({
  match,
  verification,
  verifiedElsewhere,
}: {
  match: ReportMatch;
  // Present when ownership questions were prepared for this suggestion.
  verification: Verification | undefined;
  // True when they were prepared for another suggestion for the same lost report.
  verifiedElsewhere: boolean;
}) {
  const detailsRecorded =
    match.supporting_details.length > 0 ||
    match.contradictions.length > 0 ||
    match.missing_information.length > 0;

  return (
    <li className="min-w-0 rounded-[1.5rem] bg-background">
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6 sm:p-5">
        <div className="flex min-w-0 flex-col gap-2.5">
          <ItemNames match={match} />
          <p className="line-clamp-2 text-[0.9375rem] leading-relaxed text-foreground/75">
            {match.explanation}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <DecisionPill verification={verification} />
            {match.contradictions.length > 0 ? (
              <span className={`${chipClassName} bg-bad-soft text-bad-ink`}>
                Contradictions noted ({match.contradictions.length})
              </span>
            ) : null}
          </div>
        </div>
        <ScoreFigure score={match.ai_similarity_score} />
      </div>

      <details className="group/card border-t border-border/80 px-4 py-1.5 sm:px-5">
        <summary className={SUMMARY_TOGGLE_CLASS}>
          <span className="group-open/card:hidden">View details</span>
          <span className="hidden group-open/card:inline">Hide details</span>
          <Chevron className="group-open/card:rotate-180" />
        </summary>
        <div className="mb-3 mt-2 flex min-w-0 flex-col gap-3">
          <OwnershipReview
            verification={verification}
            verifiedElsewhere={verifiedElsewhere}
            compact
          />

          <Disclosure group="reports" label="Full reports">
            <div className="grid gap-3 md:grid-cols-2">
              <MatchedReportDetails label="Lost" report={match.lost} />
              <MatchedReportDetails label="Found" report={match.found} />
            </div>
          </Disclosure>

          <Disclosure group="ai" label="AI match details">
            <p className="text-sm leading-relaxed text-foreground">
              <span className="font-medium">Gemini&apos;s summary: </span>
              {match.explanation}
            </p>
            {match.contradictions.length > 0 ? (
              <DetailList
                title="Contradictions"
                items={match.contradictions}
                emptyText=""
                tone="warning"
              />
            ) : null}
            {detailsRecorded ? (
              <div className="grid gap-3 md:grid-cols-2">
                <DetailList
                  title="Supporting details"
                  items={match.supporting_details}
                  emptyText="None found in both reports."
                />
                <DetailList
                  title="Missing information"
                  items={match.missing_information}
                  emptyText="None noted."
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Supporting details, contradictions, and missing information were
                not recorded for this suggestion (saved before they were
                collected).
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Suggested {new Date(match.created_at).toLocaleString()} · {match.model}
            </p>
          </Disclosure>
        </div>
      </details>
    </li>
  );
}


type Verification = {
  id: string;
  lost_report_id: string;
  report_match_id: string;
  questions: string[];
  expected_details: string[];
  model: string;
  created_at: string;
  answers: { question_number: number; answer: string; created_at: string }[] | null;
  assessment: VerificationAssessment | VerificationAssessment[] | null;
  decisions: DecisionEntry[] | null;
  // The optional staff follow-up; loaded separately, so it is absent until
  // its migration is applied.
  followup?: { question: string; created_at: string; answer: string | null } | null;
};

/** A follow-up question the owner has not answered yet. */
function followupPending(verification: Verification) {
  return Boolean(verification.followup && verification.followup.answer === null);
}

type VerificationAssessment = {
  assessment: "supports" | "unclear" | "conflicts";
  explanation: string;
  model: string;
  created_at: string;
};

// One entry of the append-only decision log. "pending_review" is a reset.
type DecisionEntry = {
  id: string;
  decision: "approved" | "rejected" | "pending_review";
  note: string | null;
  previous_decision_id: string | null;
  created_at: string;
};

const VERIFICATION_COLUMNS = `
  id, lost_report_id, report_match_id, questions, expected_details, model, created_at,
  answers:ownership_answers(question_number, answer, created_at),
  assessment:ownership_assessments(assessment, explanation, model, created_at),
  decisions:ownership_decisions(id, decision, note, previous_decision_id, created_at)
`;

// One-to-one embeds may come back as an object or a one-item array.
function single<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** The current staff decision; null means pending review. */
function currentDecision(verification: Verification) {
  const decisions = verification.decisions ?? [];
  const latest = latestDecision(decisions);
  const entry = latest ? decisions.find((item) => item.id === latest.id) : undefined;
  return entry && entry.decision !== "pending_review" ? entry : null;
}

const DECISION_LABELS: Record<DecisionEntry["decision"], string> = {
  approved: "Approved for ownership follow-up",
  rejected: "Rejected",
  pending_review: "Reset to pending review",
};

const ASSESSMENT_LABELS: Record<VerificationAssessment["assessment"], string> = {
  supports: "Answers support the claim",
  unclear: "Answers are unclear",
  conflicts: "Answers conflict with the found report",
};

function answeredCount(verification: Verification) {
  return (verification.answers ?? []).length;
}

/** Staff-facing review status, derived only from saved questions, answers, and decisions. */
function reviewStatus(verification: Verification) {
  const decision = currentDecision(verification);
  if (decision) {
    return DECISION_LABELS[decision.decision];
  }
  if (verification.questions.length === 0) {
    return "Staff review required";
  }
  const answered = answeredCount(verification);
  if (answered < verification.questions.length) {
    return `Awaiting answer (${answered}/${verification.questions.length})`;
  }
  if (followupPending(verification)) {
    return "Awaiting follow-up answer";
  }
  return "Ready for staff review";
}

/** Owner answer progress only (the decision is shown in the Staff decision panel). */
function answersStatus(verification: Verification) {
  const answered = answeredCount(verification);
  if (verification.questions.length > 0 && answered < verification.questions.length) {
    return `Awaiting answer (${answered}/${verification.questions.length})`;
  }
  if (followupPending(verification)) {
    return "Awaiting follow-up answer";
  }
  if (verification.followup) {
    return "Follow-up answered";
  }
  return verification.questions.length === 0 ? "No questions needed" : "Answers received";
}

function assessmentMissing(verification: Verification) {
  return (
    verification.questions.length > 0 &&
    answeredCount(verification) >= verification.questions.length &&
    single(verification.assessment) === null
  );
}

/**
 * Read-only view of the saved ownership questions, answers, and AI assessment.
 * Shows only what is stored; nothing is generated here.
 */
function OwnershipReview({
  verification,
  verifiedElsewhere = false,
  compact = false,
  showStatus = true,
  assessmentAction,
}: {
  verification: Verification | undefined;
  verifiedElsewhere?: boolean;
  showStatus?: boolean;
  // Compact: shorter assessment and a link to the staff decision.
  compact?: boolean;
  assessmentAction?: ReactNode;
}) {
  const answers = verification?.answers ?? [];
  const assessment = verification ? single(verification.assessment) : null;

  return (
    <section
      aria-label="Ownership review"
      className="flex min-w-0 flex-col gap-3 rounded-2xl bg-secondary p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-semibold text-foreground">Ownership review</h4>
        {verification && showStatus ? <DecisionPill verification={verification} /> : null}
      </div>

      {!verification ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {verifiedElsewhere
            ? "Ownership questions were prepared for another suggestion for this lost report."
            : "No ownership questions yet. They are prepared when the owner opens their tracking link."}
        </p>
      ) : verification.questions.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          No questions needed; staff review required.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {verification.questions.map((question, index) => {
            const answer = answers.find((item) => item.question_number === index + 1);
            return (
              <li key={index} className="flex min-w-0 flex-col gap-2.5 rounded-xl bg-card p-3.5">
                <p className="text-[0.9375rem] leading-relaxed text-foreground">
                  <span className="block text-[0.8125rem] font-semibold text-muted-foreground">
                    Question {index + 1}
                  </span>
                  <span className="font-semibold">{question}</span>
                </p>
                <div className="border-l-2 border-forest pl-3">
                  <p className="text-[0.8125rem] font-semibold text-forest">Owner&apos;s answer</p>
                  {answer ? (
                    <p className="mt-0.5 break-words text-[0.9375rem] leading-relaxed text-foreground">{answer.answer}</p>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted-foreground">Awaiting answer</p>
                  )}
                </div>
                <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
                  Expected (private): {verification.expected_details[index]}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {verification && verification.questions.length > 0 ? (
        <div className="flex flex-col gap-1 text-sm leading-relaxed">
          {assessment ? (
            <>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">AI assessment: </span>
                {ASSESSMENT_LABELS[assessment.assessment]}
                <span> · recommendation only</span>
              </p>
              <p className={`text-muted-foreground ${compact ? "line-clamp-2" : ""}`}>
                {assessment.explanation}
              </p>
              {compact ? null : (
                <p className="text-[0.8125rem] text-muted-foreground">
                  {new Date(assessment.created_at).toLocaleString()} · {assessment.model}.
                  The assessment never approves or rejects a claim. Staff decide.
                </p>
              )}
            </>
          ) : assessmentMissing(verification) ? (
            <>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">AI assessment: </span>
                did not finish. The owner&apos;s answers are saved. This is not a
                &ldquo;no match&rdquo; result.
              </p>
              {assessmentAction}
            </>
          ) : (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">AI assessment: </span>
              runs after the owner answers every question.
            </p>
          )}
        </div>
      ) : null}

      {verification && compact ? (
        <a
          href={`/admin?section=claims#verification-${verification.id}`}
          className={`-ml-1.5 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full px-1.5 text-[0.9375rem] font-semibold text-foreground underline-offset-4 transition-colors duration-150 hover:text-forest hover:underline ${focusRingClassName}`}
        >
          Go to staff decision
          <ArrowRightIcon className="size-4" />
        </a>
      ) : null}
    </section>
  );
}

/**
 * The optional staff follow-up on a claim: the question and the owner's
 * answer once given, or the form to ask one while the claim is undecided.
 */
function FollowupPanel({
  verification,
  decided,
  available,
}: {
  verification: Verification;
  decided: boolean;
  available: boolean;
}) {
  const followup = verification.followup;
  if (followup) {
    return (
      <section aria-label="Follow-up question" className="flex min-w-0 flex-col gap-2 rounded-2xl bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h5 className="text-base font-semibold text-foreground">Follow-up question</h5>
          <span
            className={`${chipClassName} ${
              followup.answer === null ? "bg-wait-soft text-wait-ink" : "bg-ok-soft text-ok-ink"
            }`}
          >
            {followup.answer === null ? "Awaiting answer" : "Answered"}
          </span>
        </div>
        <p className="break-words text-[0.9375rem] font-semibold leading-relaxed text-foreground">
          {followup.question}
        </p>
        {followup.answer === null ? (
          <p className="text-sm leading-relaxed text-foreground/70">
            The owner sees this on their tracking page. You can decide without waiting for an
            answer.
          </p>
        ) : (
          <div className="border-l-2 border-forest pl-3">
            <p className="text-[0.8125rem] font-semibold text-forest">Owner&apos;s answer</p>
            <p className="mt-0.5 break-words text-[0.9375rem] leading-relaxed text-foreground">
              {followup.answer}
            </p>
          </div>
        )}
        <p className="text-[0.8125rem] text-muted-foreground">
          Asked {new Date(followup.created_at).toLocaleString()} · Only one follow-up is allowed
          per claim.
        </p>
      </section>
    );
  }
  if (decided) {
    return null;
  }
  if (!available) {
    return (
      <p className="text-sm leading-relaxed text-foreground/70">
        Follow-up questions are not set up yet. Apply the ownership_followups migration, then
        refresh.
      </p>
    );
  }
  return <AskFollowupForm verificationId={verification.id} />;
}

function VerificationCard({
  verification,
  verifiedMatch,
  otherMatches,
  followupsAvailable,
}: {
  followupsAvailable: boolean;
  verification: Verification;
  verifiedMatch: ReportMatch | undefined;
  otherMatches: ReportMatch[];
}) {
  const decision = currentDecision(verification);
  const history = [...(verification.decisions ?? [])].sort((a, b) =>
    a.created_at < b.created_at ? -1 : 1,
  );
  const readyForDecision =
    !decision &&
    !followupPending(verification) &&
    (verification.questions.length === 0 ||
      answeredCount(verification) >= verification.questions.length);

  return (
    <li
      id={`verification-${verification.id}`}
      className={`min-w-0 scroll-mt-6 overflow-hidden rounded-[1.5rem] bg-background ${
        readyForDecision ? "ring-2 ring-clay/60" : ""
      }`}
    >
      <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <ItemNames match={verifiedMatch} />
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:justify-end">
          <StatusPill>{answersStatus(verification)}</StatusPill>
          {verifiedMatch ? <SimilarityBadge score={verifiedMatch.ai_similarity_score} /> : null}
          {assessmentMissing(verification) ? (
            <span className={`${chipClassName} bg-bad-soft text-bad-ink`}>AI assessment missing</span>
          ) : null}
        </div>
      </div>

      {/* Evidence first, the decision beside it on wide screens. The decision
          column is narrow, so its controls lay out by the column's width. */}
      <div className="grid border-t border-border/80 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="flex min-w-0 flex-col gap-1 p-4 sm:px-5">
          <Disclosure
            group="review"
            label="Questions, answers, and AI assessment"
            defaultOpen={readyForDecision}
          >
            <OwnershipReview
              verification={verification}
              showStatus={false}
              assessmentAction={<RetryAssessmentButton verificationId={verification.id} />}
            />
            <p className="text-[0.8125rem] text-muted-foreground">
              Questions prepared {new Date(verification.created_at).toLocaleString()} ·{" "}
              {verification.model}
            </p>
          </Disclosure>

          <Disclosure group="reports" label="Full reports">
            <div className="grid gap-3 md:grid-cols-2">
              <MatchedReportDetails label="Lost" report={verifiedMatch?.lost ?? null} />
              <MatchedReportDetails label="Found (private)" report={verifiedMatch?.found ?? null} />
            </div>
          </Disclosure>

          <details className="group/others">
            <summary className={SUMMARY_TOGGLE_CLASS}>
              Other suggestions for this lost report ({otherMatches.length})
              <Chevron className="group-open/others:rotate-180" />
            </summary>
            {otherMatches.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                No other suggestions for this lost report.
              </p>
            ) : (
              <ol className="mt-2 flex flex-col gap-2">
                {otherMatches.map((match) => (
                  <li
                    key={match.id}
                    className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-4 text-sm leading-relaxed"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SimilarityBadge score={match.ai_similarity_score} />
                      <span className="text-[0.8125rem] font-medium text-muted-foreground">
                        {match.ai_decision === "match"
                          ? "AI: possible match"
                          : "AI: not enough information"}
                      </span>
                    </div>
                    <p className="font-medium text-foreground">
                      Found: {match.found?.item_name ?? "Report unavailable"}
                    </p>
                    {match.found ? (
                      <p className="text-muted-foreground">{match.found.description}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </details>
        </div>

        <section
          aria-label="Staff decision"
          className={`flex min-w-0 flex-col gap-4 p-4 sm:p-5 ${
            decision?.decision === "approved"
              ? "bg-ok-soft/60"
              : decision?.decision === "rejected"
                ? "bg-bad-soft/60"
                : "bg-secondary"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-serif text-[1.5rem] font-semibold leading-tight text-foreground">Staff decision</h4>
            <span
              className={`${chipClassName} ${
                decision?.decision === "approved"
                  ? "bg-ok-soft text-ok-ink"
                  : decision?.decision === "rejected"
                    ? "bg-bad-soft text-bad-ink"
                    : "bg-wait-soft text-wait-ink"
              }`}
            >
              {decision ? DECISION_LABELS[decision.decision] : "Pending review"}
            </span>
          </div>

          <FollowupPanel
            verification={verification}
            decided={Boolean(decision)}
            available={followupsAvailable}
          />

          {decision ? (
            <>
              <div className="flex flex-col gap-1 text-sm leading-relaxed">
                {decision.note ? (
                  <p className="text-foreground">
                    <span className="font-medium">Note: </span>
                    {decision.note}
                  </p>
                ) : null}
                <p className="text-muted-foreground">
                  {new Date(decision.created_at).toLocaleString()}
                  {decision.decision === "approved"
                    ? " · Approval does not return the item automatically."
                    : null}
                </p>
              </div>
              <ResetDecisionForm verificationId={verification.id} />
            </>
          ) : (
            <OwnershipDecisionForm verificationId={verification.id} />
          )}

          {history.length > 0 ? (
            <details className="group/history border-t border-foreground/10 pt-1">
              <summary className={SUMMARY_TOGGLE_CLASS}>
                Decision history ({history.length})
                <Chevron className="group-open/history:rotate-180" />
              </summary>
              <ol className="mt-2 flex flex-col divide-y divide-border">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-0.5 py-2 text-sm leading-relaxed first:pt-0 last:pb-0"
                  >
                    <p className="font-medium text-foreground">{DECISION_LABELS[entry.decision]}</p>
                    {entry.note ? <p className="text-foreground">{entry.note}</p> : null}
                    <p className="text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
        </section>
      </div>
    </li>
  );
}


type Report = {
  id: string;
  report_type: string;
  item_name: string;
  description: string;
  location: string;
  created_at: string;
};

type Filter = "all" | "lost" | "found";

function parseFilter(value: string | string[] | undefined): Filter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "lost" || raw === "found") {
    return raw;
  }
  return "all";
}

function parseSection(value: string | string[] | undefined): AdminSectionKey | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "matches" || raw === "claims" || raw === "reports" || raw === "monitoring") {
    return raw;
  }
  return null;
}

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  lost: "Lost",
  found: "Found",
};

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** Lost / found filter for All reports, as a segmented control of the same links. */
function ReportFilter({ filter }: { filter: Filter }) {
  return (
    <nav aria-label="Filter reports">
      <ul className="inline-flex rounded-full bg-secondary p-1">
        {(["all", "lost", "found"] as const).map((value) => (
          <li key={value}>
            <Link
              href={value === "all" ? "/admin?section=reports" : `/admin?section=reports&type=${value}`}
              aria-current={filter === value ? "page" : undefined}
              className={`inline-flex min-h-10 min-w-16 cursor-pointer items-center justify-center rounded-full px-4 text-[0.9375rem] transition-colors duration-150 ${focusRingClassName} ${
                filter === value
                  ? "bg-ink font-semibold text-cream"
                  : "text-foreground/75 hover:bg-card hover:text-foreground"
              }`}
            >
              {FILTER_LABELS[value]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** One container split by hairlines into equal count cells. */
function CountStrip({ items }: { items: { label: string; value: number; attention?: boolean }[] }) {
  return (
    // Hairlines come from the 1px gaps; the last cell takes the rest of its row.
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] bg-border/70 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col justify-between gap-2 bg-background p-4 last:col-span-2 sm:p-5 lg:last:col-span-1"
        >
          <dt className="text-[0.8125rem] font-semibold leading-snug text-muted-foreground">{item.label}</dt>
          <dd
            className={`text-[2rem] font-semibold leading-none tracking-[-0.03em] tabular-nums ${
              item.attention && item.value > 0 ? "text-clay-ink" : "text-foreground"
            }`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[1.5rem] bg-background p-5">
      <h2 className="font-serif text-[1.5rem] font-semibold leading-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[1.5rem] border border-dashed border-foreground/20 px-5 py-8 text-[0.9375rem] leading-relaxed text-foreground/70">
      {children}
    </p>
  );
}

function GroupDetails({
  group,
  title,
  description,
  children,
}: {
  group: "reviewed" | "uncertain";
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <details className={`${group === "reviewed" ? "group/reviewed" : "group/uncertain"} rounded-[1.5rem] bg-secondary/70 px-4 py-1.5 sm:px-5`}>
      <summary className={SUMMARY_TOGGLE_CLASS}>
        {title}
        <Chevron className={group === "reviewed" ? "group-open/reviewed:rotate-180" : "group-open/uncertain:rotate-180"} />
      </summary>
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      <ul className="mb-4 mt-3 flex flex-col gap-3">{children}</ul>
    </details>
  );
}

function ReportTypeTag({ type }: { type: string }) {
  return (
    <span className={`${chipClassName} bg-muted capitalize text-foreground`}>
      <span aria-hidden className={`size-2 rounded-full ${type === "lost" ? "bg-clay" : "bg-forest"}`} />
      {type}
    </span>
  );
}

function ReportsList({ reports }: { reports: Report[] }) {
  return (
    <>
      {/* Phone: two-line rows. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {reports.map((report) => (
          <li key={report.id} className="flex min-w-0 flex-col gap-1.5 rounded-2xl bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 break-words font-serif text-xl font-semibold leading-snug text-foreground">{report.item_name}</h3>
              <ReportTypeTag type={report.report_type} />
            </div>
            <p className="break-words text-[0.9375rem] leading-relaxed text-foreground">{report.description}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Location: {report.location}
            </p>
            <p className="text-[0.8125rem] tabular-nums text-muted-foreground">
              {new Date(report.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>

      {/* Tablet and desktop: a table. */}
      {/* A labelled scroll region: keyboard users can focus it to scroll a wide table. */}
      <div
        role="region"
        aria-label="Saved reports"
        tabIndex={0}
        className={`hidden overflow-x-auto rounded-[1.5rem] bg-background md:block ${focusRingClassName}`}
      >
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Saved reports, newest first</caption>
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="px-5 py-3.5 font-semibold">Item</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">Type</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">Description</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">Location</th>
              <th scope="col" className="px-5 py-3.5 text-right font-semibold">Saved</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-b border-border/80 align-top last:border-b-0 hover:bg-secondary/60">
                <th scope="row" className="w-[18%] px-5 py-3.5 font-serif text-lg font-semibold leading-snug text-foreground">
                  {report.item_name}
                </th>
                <td className="px-4 py-3">
                  <ReportTypeTag type={report.report_type} />
                </td>
                <td className="w-[40%] px-4 py-3 leading-relaxed text-foreground">{report.description}</td>
                <td className="px-4 py-3 leading-relaxed text-muted-foreground">{report.location}</td>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-muted-foreground">
                  {new Date(report.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}


export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; section?: string; demo?: string }>;
}) {
  if (!isLocalAdminEnabled()) {
    notFound();
  }

  const params = await searchParams;
  const filter = parseFilter(params.type);
  const requestedSection = parseSection(params.section);
  const monitoringDemo = isMonitoringDemoEnabled(params.demo);

  let reports: Report[] = [];
  let matches: ReportMatch[] = [];
  let loadError = false;
  let matchesError = false;
  let missingConfig = false;
  let verifications: Verification[] = [];
  let verificationsState: "ok" | "error" | "not_set_up" = "ok";
  let followupsAvailable = false;
  let monitoring: MonitoringLoad = { ok: false };
  // Demo snapshot is built in memory only: no Supabase read/write, no Gemini.
  if (monitoringDemo) {
    monitoring = { ok: true, snapshot: buildDemoMonitoringSnapshot() };
  }

  try {
    const supabase = createAdminClient();

    const matchesResult = await supabase
      .from("report_matches")
      .select(MATCH_COLUMNS)
      .order("created_at", { ascending: false });
    if (matchesResult.error) {
      matchesError = true;
    } else {
      matches = (matchesResult.data ?? []) as unknown as ReportMatch[];
    }

    const verificationsResult = await supabase
      .from("ownership_verifications")
      .select(VERIFICATION_COLUMNS)
      .order("created_at", { ascending: false });
    if (verificationsResult.error) {
      const code = verificationsResult.error.code;
      verificationsState = code === "PGRST205" || code === "42P01" ? "not_set_up" : "error";
    } else {
      verifications = (verificationsResult.data ?? []) as unknown as Verification[];

      // Follow-ups load on their own: a missing table (migration not applied)
      // only turns the feature off and never breaks the claims list.
      const followupsResult = await supabase
        .from("ownership_followups")
        .select("verification_id, question, created_at, answer:ownership_followup_answers(answer)");
      if (!followupsResult.error) {
        followupsAvailable = true;
        const byVerification = new Map(
          (
            (followupsResult.data ?? []) as unknown as {
              verification_id: string;
              question: string;
              created_at: string;
              answer: { answer: string } | { answer: string }[] | null;
            }[]
          ).map((row) => [
            row.verification_id,
            {
              question: row.question,
              created_at: row.created_at,
              answer: single(row.answer)?.answer ?? null,
            },
          ]),
        );
        verifications = verifications.map((verification) => ({
          ...verification,
          followup: byVerification.get(verification.id) ?? null,
        }));
      }
    }

    // Aggregate counts only; it needs the full suggestion list to count pairs.
    // Skip when demo mode is on so live figures never mix with the fixture.
    if (!monitoringDemo && !matchesError) {
      monitoring = await loadMonitoringSnapshot(supabase, {
        suggestions: matches,
        claims:
          verificationsState === "ok"
            ? verifications.map((verification) => ({
                questionCount: verification.questions.length,
                answerCount: answeredCount(verification),
                assessed: single(verification.assessment) !== null,
                decision:
                  (currentDecision(verification)?.decision as "approved" | "rejected" | undefined) ??
                  null,
                similarityScore:
                  matches.find((match) => match.id === verification.report_match_id)
                    ?.ai_similarity_score ?? null,
              }))
            : null,
      });
    }

    let query = supabase
      .from("reports")
      .select("id, report_type, item_name, description, location, created_at")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("report_type", filter);
    }

    const { data, error } = await query;
    if (error) {
      loadError = true;
    } else {
      reports = (data ?? []) as Report[];
    }
  } catch (error) {
    if (error instanceof Error && error.message === "missing-admin-config") {
      missingConfig = true;
    } else {
      loadError = true;
    }
  }

  const possibleMatches = matches
    .filter((match) => match.ai_decision === "match")
    .sort(byScoreThenNewest);
  const uncertainMatches = matches
    .filter((match) => match.ai_decision === "insufficient_information")
    .sort(byScoreThenNewest);

  const verificationByMatch = new Map(
    verifications.map((verification) => [verification.report_match_id, verification]),
  );
  const verifiedLostReports = new Set(
    verifications.map((verification) => verification.lost_report_id),
  );

  // Claims still waiting for a staff decision come first, newest first.
  const orderedVerifications = [...verifications].sort(
    (a, b) => Number(currentDecision(a) !== null) - Number(currentDecision(b) !== null),
  );
  const awaitingDecision = verifications.filter(
    (verification) => currentDecision(verification) === null,
  ).length;
  const section = requestedSection ?? (awaitingDecision > 0 ? "claims" : "matches");
  const verificationsLoaded = verificationsState === "ok" && !matchesError;
  const needsReviewMatches = possibleMatches.filter((match) => {
    const verification = verificationByMatch.get(match.id);
    return !verification || currentDecision(verification) === null;
  });
  const reviewedMatches = possibleMatches.filter((match) => {
    const verification = verificationByMatch.get(match.id);
    return verification ? currentDecision(verification) !== null : false;
  });

  // Presentation only: counts for the navigation and the claims strip, from
  // the lists already loaded above.
  const claimCounts = {
    readyForDecision: verifications.filter(
      (verification) =>
        currentDecision(verification) === null &&
        !followupPending(verification) &&
        (verification.questions.length === 0 ||
          answeredCount(verification) >= verification.questions.length),
    ).length,
    awaitingAnswers: verifications.filter(
      (verification) =>
        currentDecision(verification) === null &&
        (answeredCount(verification) < verification.questions.length ||
          followupPending(verification)),
    ).length,
    assessmentRetry: verifications.filter(assessmentMissing).length,
    decided: verifications.length - awaitingDecision,
  };

  const monitoringAlert = !monitoring.ok
    ? null
    : monitoring.snapshot.health === "last_run_failed"
      ? "Last check failed"
      : monitoring.snapshot.health === "not_configured"
        ? "Matching is not configured"
        : null;

  const nav: AdminNavItem[] = [
    {
      key: "matches",
      label: "Possible matches",
      count: matchesError
        ? null
        : { value: needsReviewMatches.length, label: needsReviewMatches.length === 1 ? "suggestion needs review" : "suggestions need review" },
    },
    {
      key: "claims",
      label: "Ownership claims",
      count: verificationsLoaded
        ? { value: awaitingDecision, label: awaitingDecision === 1 ? "claim awaiting decision" : "claims awaiting decision" }
        : null,
    },
    { key: "reports", label: "All reports" },
    { key: "monitoring", label: "Monitoring", alert: monitoringAlert },
  ];

  const titles: Record<AdminSectionKey, { title: string; subline: ReactNode; actions?: ReactNode }> = {
    matches: {
      title: "Possible matches",
      subline: matchesError
        ? "AI suggestions help you spot reports that may describe the same item."
        : `AI suggestions help you spot reports that may describe the same item. ${countLabel(needsReviewMatches.length, "suggestion needs", "suggestions need")} review.`,
    },
    claims: {
      title: "Ownership claims",
      subline:
        "Owners answer private questions about the highest-ranked possible match through their tracking link. Claims awaiting a decision are listed first.",
    },
    reports: {
      title: "All reports",
      subline: loadError
        ? "Every saved report, newest first."
        : `Every saved report, newest first. ${
            filter === "all"
              ? countLabel(reports.length, "report", "reports")
              : `${reports.length} ${filter}`
          }.`,
      actions: <ReportFilter filter={filter} />,
    },
    monitoring: {
      title: "Monitoring",
      subline:
        "Whether matching is set up and working, what is left to check, and which claims need staff. Counts and times only; no report details are shown here.",
    },
  };

  if (missingConfig) {
    return (
      <AdminShell active={null} nav={nav} title="Staff workspace">
        <Notice tone="error" role="alert">
          Admin is not configured. Add SUPABASE_SECRET_KEY to your local
          .env.local file, then restart the dev server.
        </Notice>
      </AdminShell>
    );
  }

  const current = titles[section];

  return (
    <AdminShell
      active={section}
      nav={nav}
      title={current.title}
      subline={current.subline}
      actions={current.actions}
    >
      {section === "matches" ? (
        <div id="matches" className="grid scroll-mt-6 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">

          <div className="flex min-w-0 flex-col gap-4">
            {matchesError ? (
              <Notice tone="error" role="alert">
                Could not load possible matches. Please try again.
              </Notice>
            ) : (
              <>
                <section aria-labelledby="needs-review-heading" className="flex flex-col gap-3">
                  <h2 id="needs-review-heading" className="font-serif text-[1.75rem] font-semibold leading-tight text-foreground">
                    Needs review <span className="font-sans text-lg font-medium tabular-nums text-muted-foreground">{needsReviewMatches.length}</span>
                  </h2>
                  {needsReviewMatches.length === 0 ? (
                    <EmptyState>No suggestions need review. Check new reports when you are ready.</EmptyState>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {needsReviewMatches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          verification={verificationByMatch.get(match.id)}
                          verifiedElsewhere={verifiedLostReports.has(match.lost_report_id)}
                        />
                      ))}
                    </ul>
                  )}
                </section>

                {reviewedMatches.length > 0 ? (
                  <GroupDetails group="reviewed" title={`Reviewed suggestions (${reviewedMatches.length})`}>
                    {reviewedMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        verification={verificationByMatch.get(match.id)}
                        verifiedElsewhere={verifiedLostReports.has(match.lost_report_id)}
                      />
                    ))}
                  </GroupDetails>
                ) : null}

                {uncertainMatches.length > 0 ? (
                  <GroupDetails
                    group="uncertain"
                    title={`AI: not enough information (${uncertainMatches.length})`}
                    description="The reports might describe the same item, but the details are too common or too thin to say."
                  >
                    {uncertainMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        verification={verificationByMatch.get(match.id)}
                        verifiedElsewhere={verifiedLostReports.has(match.lost_report_id)}
                      />
                    ))}
                  </GroupDetails>
                ) : null}
              </>
            )}
          </div>
          {/* Desktop: a side column. Smaller screens: after the queue, which is the main job. */}
          <aside className="flex flex-col gap-4 xl:sticky xl:top-4">
            <SidePanel title="Matching">
              <RunMatching stacked />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Unchecked pairs, past checks, and failures are listed in{" "}
                <Link
                  href="/admin?section=monitoring"
                  className={`rounded-sm font-medium text-foreground underline underline-offset-4 hover:text-forest ${focusRingClassName}`}
                >
                  Monitoring
                </Link>
                .
              </p>
            </SidePanel>
            {matchesError ? null : (
              <div className="hidden xl:block">
              <SidePanel title="Suggestions">
                <dl className="flex flex-col divide-y divide-border text-sm">
                  {[
                    ["Needs review", needsReviewMatches.length],
                    ["Reviewed", reviewedMatches.length],
                    ["Not enough information", uncertainMatches.length],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </SidePanel>
              </div>
            )}
          </aside>
        </div>
      ) : null}

      {section === "claims" ? (
        <div id="verification" className="flex scroll-mt-6 flex-col gap-5">
          {verificationsState === "not_set_up" ? (
            <Notice tone="error" role="alert">
              Ownership verification is not set up yet. Apply the
              ownership_verification migration, then refresh.
            </Notice>
          ) : verificationsState === "error" || matchesError ? (
            <Notice tone="error" role="alert">
              Could not load ownership verifications. Please try again.
            </Notice>
          ) : (
            <>
              <CountStrip
                items={[
                  { label: "Awaiting decision", value: awaitingDecision, attention: true },
                  { label: "Ready for decision", value: claimCounts.readyForDecision },
                  { label: "Waiting for owner answers", value: claimCounts.awaitingAnswers },
                  { label: "AI assessment needs a retry", value: claimCounts.assessmentRetry, attention: true },
                  { label: "Decided", value: claimCounts.decided },
                ]}
              />
              <p className="max-w-3xl text-[0.9375rem] leading-relaxed text-foreground/75">
                Owners never see the found report or the expected answers. The AI
                assessment is a recommendation; staff make the final decision.
              </p>
              {orderedVerifications.length === 0 ? (
                <EmptyState>
                  No ownership claims yet. Questions are prepared when an owner
                  opens their tracking link after a possible match.
                </EmptyState>
              ) : (
                <ul className="flex flex-col gap-4">
                  {orderedVerifications.map((verification) => (
                    <VerificationCard
                      key={verification.id}
                      followupsAvailable={followupsAvailable}
                      verification={verification}
                      verifiedMatch={matches.find(
                        (match) => match.id === verification.report_match_id,
                      )}
                      otherMatches={matches
                        .filter(
                          (match) =>
                            match.lost_report_id === verification.lost_report_id &&
                            match.id !== verification.report_match_id,
                        )
                        .sort(byScoreThenNewest)}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ) : null}

      {section === "reports" ? (
        <div id="reports" className="scroll-mt-6">
          {loadError ? (
            <Notice tone="error" role="alert">
              Could not load reports. Please try again.
            </Notice>
          ) : reports.length === 0 ? (
            <EmptyState>
              {filter === "all" ? "No reports to show." : `No ${filter} reports to show.`}
            </EmptyState>
          ) : (
            <ReportsList reports={reports} />
          )}
        </div>
      ) : null}

      {section === "monitoring" ? (
        <div id="monitoring" className="scroll-mt-6">
          {monitoring.ok ? (
            <MonitoringPanel
              snapshot={monitoring.snapshot}
              reviewNeeded={
                monitoringDemo
                  ? monitoring.snapshot.pairs.possible
                  : matchesError || !verificationsLoaded
                    ? null
                    : needsReviewMatches.length
              }
              demo={monitoringDemo}
            />
          ) : (
            <Notice tone="error" role="alert">
              Could not load monitoring information. Please try again.
            </Notice>
          )}
        </div>
      ) : null}
    </AdminShell>
  );
}
