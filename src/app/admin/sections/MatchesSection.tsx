import Link from "next/link";
import { ArrowEndIcon } from "@/components/icons";
import { Notice, StatusChip } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import { formatDateTime } from "@/i18n/format";
import type { AdminMessages } from "@/i18n/messages/admin";
import { localizeClue } from "@/i18n/messages/clues";
import { RunMatching } from "@/app/admin/RunMatching";
import {
  currentDecision,
  reviewStatus,
  type ReportMatch,
  type Verification,
} from "@/app/admin/parts/model";
import {
  ClueColumns,
  Disclosure,
  EmptyState,
  PairNames,
  QueueHeading,
  ReportPair,
  ScoreFigure,
  inlineLinkClassName,
  rowClassName,
  stampClassName,
} from "@/app/admin/parts/ui";

// Possible matches: the queue that needs review first, then reviewed and
// uncertain suggestions behind disclosures. Each row opens to the two reports
// side by side, the AI's clues, and where ownership verification stands.

type Props = {
  t: AdminMessages;
  locale: Locale;
  error: boolean;
  needsReview: ReportMatch[];
  reviewed: ReportMatch[];
  uncertain: ReportMatch[];
  verificationByMatch: Map<string, Verification>;
  verifiedLostReports: Set<string>;
};

/** Where this pair stands in ownership verification: a fact, never a staff action here. */
function VerificationStatus({
  verification,
  verifiedElsewhere,
  t,
}: {
  verification: Verification | undefined;
  verifiedElsewhere: boolean;
  t: AdminMessages;
}) {
  const decision = verification ? currentDecision(verification) : null;
  const tone = decision?.decision === "approved" ? "ok" : decision?.decision === "rejected" ? "bad" : "wait";
  return (
    <section
      aria-label={t.verificationTitle}
      className="flex min-w-0 flex-col gap-2 rounded-2xl bg-secondary p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-body font-semibold text-foreground">{t.verificationTitle}</h4>
        {verification ? <StatusChip tone={tone}>{reviewStatus(verification, t)}</StatusChip> : null}
      </div>
      {!verification ? (
        <p className="text-small text-foreground">
          {verifiedElsewhere ? t.verificationElsewhere : t.verificationNotStarted}
        </p>
      ) : (
        <>
          {verification.questions.length === 0 ? (
            <p className="text-small text-foreground">{t.verificationNoQuestions}</p>
          ) : null}
          <Link href={`/admin?section=claims#verification-${verification.id}`} className={inlineLinkClassName}>
            {t.goToClaim}
            <ArrowEndIcon className="size-4" />
          </Link>
        </>
      )}
      <p className="text-caption text-muted-foreground">{t.staffDecideNote}</p>
    </section>
  );
}

function MatchRow({
  match,
  verification,
  verifiedElsewhere,
  t,
  locale,
}: {
  match: ReportMatch;
  verification: Verification | undefined;
  verifiedElsewhere: boolean;
  t: AdminMessages;
  locale: Locale;
}) {
  const decision = verification ? currentDecision(verification) : null;
  const statusTone =
    decision?.decision === "approved" ? "ok" : decision?.decision === "rejected" ? "bad" : "wait";
  const statusLabel = verification ? reviewStatus(verification, t) : t.status.pendingReview;

  return (
    <li className={rowClassName}>
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3">
          <PairNames match={match} t={t} />
          <p dir="auto" className="line-clamp-2 max-w-[70ch] break-words text-small text-foreground/85">
            {localizeClue(match.explanation, locale)}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <StatusChip tone={statusTone}>{statusLabel}</StatusChip>
            {match.contradictions.length > 0 ? (
              <StatusChip tone="bad" icon={null}>
                {t.contradictionsChip(match.contradictions.length)}
              </StatusChip>
            ) : null}
            <span className={stampClassName}>{formatDateTime(match.created_at, locale)}</span>
          </div>
        </div>
        <ScoreFigure score={match.ai_similarity_score} t={t} />
      </div>

      <div className="px-4 pb-2 sm:px-5">
        <Disclosure label={t.showDetails} openLabel={t.hideDetails}>
          <div className="mb-3 flex min-w-0 flex-col gap-4">
            <section aria-label={t.reportsCompared} className="flex flex-col gap-2">
              <h4 className="text-body font-semibold text-foreground">{t.reportsCompared}</h4>
              <ReportPair lost={match.lost} found={match.found} t={t} />
            </section>

            <section aria-label={t.whatTheAiSaw} className="flex flex-col gap-2">
              <h4 className="text-body font-semibold text-foreground">{t.whatTheAiSaw}</h4>
              <ClueColumns match={match} t={t} />
              <p className="break-words text-small text-foreground">
                <span className="font-semibold">{t.aiSummary}: </span>
                <bdi>{localizeClue(match.explanation, locale)}</bdi>
              </p>
              <p className={stampClassName}>
                {t.suggestedAt(formatDateTime(match.created_at, locale), match.model)} · {t.scoreHelp}
              </p>
            </section>

            <VerificationStatus verification={verification} verifiedElsewhere={verifiedElsewhere} t={t} />
          </div>
        </Disclosure>
      </div>
    </li>
  );
}

function MatchList({
  matches,
  verificationByMatch,
  verifiedLostReports,
  t,
  locale,
}: Pick<Props, "verificationByMatch" | "verifiedLostReports" | "t" | "locale"> & {
  matches: ReportMatch[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {matches.map((match) => (
        <MatchRow
          key={match.id}
          match={match}
          verification={verificationByMatch.get(match.id)}
          verifiedElsewhere={verifiedLostReports.has(match.lost_report_id)}
          t={t}
          locale={locale}
        />
      ))}
    </ul>
  );
}

export function MatchesSection(props: Props) {
  const { t, error, needsReview, reviewed, uncertain } = props;
  return (
    <div id="matches" className="grid scroll-mt-6 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {error ? (
          <Notice tone="error" role="alert">
            {t.errorMatches}
          </Notice>
        ) : (
          <>
            <section aria-labelledby="needs-review-heading" className="flex flex-col gap-3">
              <QueueHeading id="needs-review-heading" title={t.needsReview} count={needsReview.length} />
              {needsReview.length === 0 ? (
                <EmptyState title={t.emptyMatchesTitle}>{t.emptyMatches}</EmptyState>
              ) : (
                <MatchList {...props} matches={needsReview} />
              )}
            </section>

            {reviewed.length > 0 ? (
              <Disclosure
                label={t.reviewedGroup(reviewed.length)}
                className="rounded-[1.25rem] bg-secondary/70 px-4 py-1.5 sm:px-5"
              >
                <div className="mb-4">
                  <MatchList {...props} matches={reviewed} />
                </div>
              </Disclosure>
            ) : null}

            {uncertain.length > 0 ? (
              <Disclosure
                label={t.uncertainGroup(uncertain.length)}
                className="rounded-[1.25rem] bg-secondary/70 px-4 py-1.5 sm:px-5"
              >
                <p className="max-w-[70ch] text-small text-foreground/85">{t.uncertainHelp}</p>
                <div className="mb-4">
                  <MatchList {...props} matches={uncertain} />
                </div>
              </Disclosure>
            ) : null}
          </>
        )}
      </div>

      {/* Desktop: a side column. Smaller screens: after the queue, which is the main job. */}
      <aside className="flex flex-col gap-4 xl:sticky xl:top-4">
        <section className="flex min-w-0 flex-col gap-3 rounded-[1.25rem] bg-background p-5">
          <h2 className="text-subheading text-foreground">{t.matchingPanel}</h2>
          <RunMatching stacked />
          <p className="text-small text-muted-foreground">
            {t.matchingHelp}{" "}
            <Link href="/admin?section=monitoring" className={inlineLinkClassName}>
              {t.section.monitoring}
              <ArrowEndIcon className="size-4" />
            </Link>
          </p>
        </section>
      </aside>
    </div>
  );
}
