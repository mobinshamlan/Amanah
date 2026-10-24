import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  createAdminClient,
  isLocalAdminEnabled,
} from "@/utils/supabase/admin";
import { SiteHeader } from "@/components/site-header";
import { RunMatching } from "@/app/admin/RunMatching";
import {
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
  id, lost_report_id, explanation, model, created_at, ai_decision,
  supporting_details, contradictions, missing_information,
  ai_similarity_score, status,
  lost:reports!report_matches_lost_report_fkey(item_name, description, location),
  found:reports!report_matches_found_report_fkey(item_name, description, location)
`;

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
  const boxClass =
    tone === "warning" && items.length > 0
      ? "rounded-xl border border-destructive/40 bg-background p-3"
      : "rounded-xl border border-border bg-background p-3";
  const titleClass =
    tone === "warning" && items.length > 0
      ? "text-sm font-medium text-destructive"
      : "text-sm font-medium text-foreground";

  return (
    <div className={boxClass}>
      <h4 className={titleClass}>{title}</h4>
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
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
        {label}
      </p>
      {report ? (
        <>
          <h3 className="font-serif text-xl font-semibold leading-tight tracking-tight text-foreground">
            {report.item_name}
          </h3>
          <p className="text-sm leading-relaxed text-foreground">
            {report.description}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Location: {report.location}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Report unavailable.</p>
      )}
    </div>
  );
}

function SimilarityBadge({ score }: { score: number | null }) {
  return (
    <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-foreground">
      AI similarity:{" "}
      {score === null ? (
        "Not scored"
      ) : (
        <>
          <span className="font-semibold">{score}</span>
          <span className="text-muted-foreground">/100</span>
        </>
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
  "-ml-2 inline-flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:text-forest focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden";

function Chevron({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`size-4 transition-transform ${className}`}
    >
      <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function ItemNames({ match }: { match: ReportMatch | undefined }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2 sm:gap-4">
      <div>
        <dt className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
          Lost
        </dt>
        <dd className="font-serif text-xl font-semibold leading-tight tracking-tight text-foreground">
          {match?.lost?.item_name ?? "Report unavailable"}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
          Found
        </dt>
        <dd className="font-serif text-xl font-semibold leading-tight tracking-tight text-foreground">
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
      <div className="mt-2 flex flex-col gap-3">{children}</div>
    </details>
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
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <SimilarityBadge score={match.ai_similarity_score} />
        <StatusPill>
          {verification ? reviewStatus(verification) : "Pending review"}
        </StatusPill>
        {match.contradictions.length > 0 ? (
          <span className="rounded-full border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive">
            Contradictions noted ({match.contradictions.length})
          </span>
        ) : null}
      </div>

      <ItemNames match={match} />

      <p className="line-clamp-2 text-sm leading-relaxed text-foreground">
        {match.explanation}
      </p>

      <details className="group/card">
        <summary className={SUMMARY_TOGGLE_CLASS}>
          <span className="group-open/card:hidden">View details</span>
          <span className="hidden group-open/card:inline">Hide details</span>
          <Chevron className="group-open/card:rotate-180" />
        </summary>
        <div className="mt-2 flex flex-col gap-3">
          <OwnershipReview
            verification={verification}
            verifiedElsewhere={verifiedElsewhere}
            compact
          />

          <Disclosure group="reports" label="Full reports">
            <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="grid gap-3 sm:grid-cols-2">
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
};

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
  return "Ready for staff review";
}

/** Owner answer progress only (the decision is shown in the Staff decision panel). */
function answersStatus(verification: Verification) {
  if (verification.questions.length === 0) {
    return "No questions needed";
  }
  const answered = answeredCount(verification);
  if (answered < verification.questions.length) {
    return `Awaiting answer (${answered}/${verification.questions.length})`;
  }
  return "Answers received";
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
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground">Ownership review</h4>
        {verification && showStatus ? (
          <StatusPill>{reviewStatus(verification)}</StatusPill>
        ) : null}
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
        <ol className="flex flex-col divide-y divide-border">
          {verification.questions.map((question, index) => {
            const answer = answers.find((item) => item.question_number === index + 1);
            return (
              <li key={index} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Question {index + 1}
                </p>
                <p className="text-sm font-medium leading-relaxed text-foreground">
                  {question}
                </p>
                <div className="rounded-lg border-l-2 border-forest bg-background px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
                    Owner&apos;s answer
                  </p>
                  {answer ? (
                    <p className="mt-0.5 text-sm leading-relaxed text-foreground">
                      {answer.answer}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted-foreground">Awaiting answer</p>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Expected (private): {verification.expected_details[index]}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {verification && verification.questions.length > 0 ? (
        <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm leading-relaxed">
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
                <p className="text-xs text-muted-foreground">
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
          href={`#verification-${verification.id}`}
          className="-ml-2 inline-flex w-fit items-center rounded-md px-2 py-1.5 text-sm font-medium text-foreground underline-offset-4 outline-none transition-colors hover:text-forest hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Go to staff decision
        </a>
      ) : null}
    </section>
  );
}

function VerificationCard({
  verification,
  verifiedMatch,
  otherMatches,
}: {
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
    (verification.questions.length === 0 ||
      answeredCount(verification) >= verification.questions.length);

  return (
    <li
      id={`verification-${verification.id}`}
      className="flex scroll-mt-6 flex-col gap-4 rounded-xl border border-border bg-background p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill>{answersStatus(verification)}</StatusPill>
        {verifiedMatch ? (
          <SimilarityBadge score={verifiedMatch.ai_similarity_score} />
        ) : null}
        {assessmentMissing(verification) ? (
          <StatusPill>AI assessment missing</StatusPill>
        ) : null}
      </div>

      <ItemNames match={verifiedMatch} />

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
        <p className="text-sm text-muted-foreground">
          Questions prepared {new Date(verification.created_at).toLocaleString()} ·{" "}
          {verification.model}
        </p>
      </Disclosure>

      <Disclosure group="reports" label="Full reports">
        <div className="grid gap-3 sm:grid-cols-2">
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
                className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-sm leading-relaxed"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SimilarityBadge score={match.ai_similarity_score} />
                  <span className="text-xs font-medium text-muted-foreground">
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

      <section
        aria-label="Staff decision"
        className={`flex flex-col gap-3 rounded-xl border p-3 ${
          decision?.decision === "approved"
            ? "border-forest/30 bg-accent"
            : "border-border bg-card"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground">Staff decision</h4>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              decision?.decision === "approved"
                ? "bg-forest text-primary-foreground"
                : decision?.decision === "rejected"
                  ? "border border-destructive/40 text-destructive"
                  : "border border-border text-foreground"
            }`}
          >
            {decision ? DECISION_LABELS[decision.decision] : "Pending review"}
          </span>
        </div>

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
          <details className="group/history border-t border-border pt-2">
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
                  <p className="font-medium text-foreground">
                    {DECISION_LABELS[entry.decision]}
                  </p>
                  {entry.note ? <p className="text-foreground">{entry.note}</p> : null}
                  <p className="text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </section>
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

function filterClass(active: boolean) {
  return active
    ? "rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    : "rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  if (!isLocalAdminEnabled()) {
    notFound();
  }

  const params = await searchParams;
  const filter = parseFilter(params.type);

  let reports: Report[] = [];
  let matches: ReportMatch[] = [];
  let loadError = false;
  let matchesError = false;
  let missingConfig = false;
  let verifications: Verification[] = [];
  let verificationsState: "ok" | "error" | "not_set_up" = "ok";

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

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-balance font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
                Admin reports
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Local development only. Newest reports appear first.
              </p>
            </div>
            <span className="w-fit rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Local admin
            </span>
          </div>

          {missingConfig ? null : (
            <section
              aria-labelledby="matches-heading"
              className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
            >
              <div>
                <h2
                  id="matches-heading"
                  className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground"
                >
                  Possible matches
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Private AI suggestions from the report text only. Pending
                  review means staff have not checked them yet. A suggestion
                  does not establish ownership or authorize returning an item.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  AI similarity (0–100) is an experimental ranking aid from
                  Gemini. It is not a probability and does not verify
                  ownership.
                </p>
              </div>

              <RunMatching />

              {matchesError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium leading-snug text-foreground"
                >
                  Could not load possible matches. Please try again.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-medium text-foreground">
                      AI: possible match ({possibleMatches.length})
                    </h3>
                    {possibleMatches.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                        No possible matches saved yet.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {possibleMatches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            verification={verificationByMatch.get(match.id)}
                            verifiedElsewhere={verifiedLostReports.has(match.lost_report_id)}
                          />
                        ))}
                      </ul>
                    )}
                  </div>

                  {uncertainMatches.length > 0 ? (
                    <details className="group/uncertain rounded-xl border border-border px-3 py-2 sm:px-4">
                      <summary className={SUMMARY_TOGGLE_CLASS}>
                        AI: not enough information ({uncertainMatches.length})
                        <Chevron className="group-open/uncertain:rotate-180" />
                      </summary>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        The reports might describe the same item, but the
                        details are too common or too thin to say.
                      </p>
                      <ul className="mt-3 mb-2 flex flex-col gap-3">
                        {uncertainMatches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            verification={verificationByMatch.get(match.id)}
                            verifiedElsewhere={verifiedLostReports.has(match.lost_report_id)}
                          />
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </>
              )}
            </section>
          )}

          {missingConfig ? null : (
            <section
              aria-labelledby="verification-heading"
              className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
            >
              <div>
                <h2
                  id="verification-heading"
                  className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground"
                >
                  Ownership verification
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Owners answer private questions about the highest-ranked
                  possible match through their tracking link. They never see
                  the found report or the expected answers. The AI assessment
                  is a recommendation; staff make the final decision.
                </p>
              </div>

              {verificationsState === "not_set_up" ? (
                <p
                  role="alert"
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium leading-snug text-foreground"
                >
                  Ownership verification is not set up yet. Apply the
                  ownership_verification migration, then refresh.
                </p>
              ) : verificationsState === "error" || matchesError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium leading-snug text-foreground"
                >
                  Could not load ownership verifications. Please try again.
                </p>
              ) : orderedVerifications.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  No ownership claims yet. Questions are prepared when an owner
                  opens their tracking link after a possible match.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {orderedVerifications.map((verification) => (
                    <VerificationCard
                      key={verification.id}
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
            </section>
          )}

          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filter reports">
            <Link href="/admin" className={filterClass(filter === "all")}>
              All
            </Link>
            <Link
              href="/admin?type=lost"
              className={filterClass(filter === "lost")}
            >
              Lost
            </Link>
            <Link
              href="/admin?type=found"
              className={filterClass(filter === "found")}
            >
              Found
            </Link>
          </nav>

          {missingConfig ? (
            <p
              role="alert"
              className="mt-6 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium leading-snug text-foreground"
            >
              Admin is not configured. Add SUPABASE_SECRET_KEY to your local
              .env.local file, then restart the dev server.
            </p>
          ) : loadError ? (
            <p
              role="alert"
              className="mt-6 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium leading-snug text-foreground"
            >
              Could not load reports. Please try again.
            </p>
          ) : reports.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
              No reports to show.
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-4">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
                    {report.report_type}
                  </p>
                  <h2 className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground">
                    {report.item_name}
                  </h2>
                  <p className="text-base leading-relaxed text-foreground">
                    {report.description}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Location: {report.location}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(report.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
