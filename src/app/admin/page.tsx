import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isLocalAdminEnabled } from "@/utils/supabase/admin";
import { Notice } from "@/components/ui";
import { admin } from "@/i18n/messages/admin";
import { getLocale, getMessages } from "@/i18n/server";
import { AdminShell, type AdminNavItem, type AdminSectionKey } from "@/app/admin/AdminShell";
import { MonitoringPanel } from "@/app/admin/Monitoring";
import { CandidatesPanel } from "@/app/admin/Candidates";
import { buildCandidateQueues } from "@/utils/matching/candidates";
import { loadAdminData, parseFilter, parseSection } from "@/app/admin/parts/data";
import {
  byScoreThenNewest,
  currentDecision,
  readyForDecision,
  waitingOnOwner,
} from "@/app/admin/parts/model";
import { MatchesSection } from "@/app/admin/sections/MatchesSection";
import { ClaimsSection } from "@/app/admin/sections/ClaimsSection";
import { ReportFilter, ReportsSection } from "@/app/admin/sections/ReportsSection";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; section?: string; demo?: string }>;
}) {
  if (!isLocalAdminEnabled()) {
    notFound();
  }

  const [params, t, locale] = await Promise.all([searchParams, getMessages(admin), getLocale()]);
  const filter = parseFilter(params.type);
  const requestedSection = parseSection(params.section);
  const data = await loadAdminData({ filter, section: requestedSection, demo: params.demo });
  const { matches, verifications, reports } = data;

  // Queues, derived from the lists already loaded.
  const possibleMatches = matches.filter((match) => match.ai_decision === "match").sort(byScoreThenNewest);
  const uncertainMatches = matches
    .filter((match) => match.ai_decision === "insufficient_information")
    .sort(byScoreThenNewest);
  const verificationByMatch = new Map(
    verifications.map((verification) => [verification.report_match_id, verification]),
  );
  const verifiedLostReports = new Set(verifications.map((verification) => verification.lost_report_id));
  const needsReviewMatches = possibleMatches.filter((match) => {
    const verification = verificationByMatch.get(match.id);
    return !verification || currentDecision(verification) === null;
  });
  const reviewedMatches = possibleMatches.filter((match) => {
    const verification = verificationByMatch.get(match.id);
    return verification ? currentDecision(verification) !== null : false;
  });

  const readyClaims = verifications.filter(readyForDecision);
  const waitingClaims = verifications.filter(waitingOnOwner);
  const decidedClaims = verifications.filter((verification) => currentDecision(verification) !== null);
  const awaitingDecision = readyClaims.length + waitingClaims.length;
  const verificationsLoaded = data.verificationsState === "ok" && !data.matchesError;

  const candidateQueues = buildCandidateQueues(matches, data.candidateReviews);
  const unmarkedCandidates = candidateQueues.open.filter((item) => item.review?.action !== "ownership_review");

  const section = requestedSection ?? (awaitingDecision > 0 ? "claims" : "matches");

  const monitoringAlert = !data.monitoring.ok
    ? null
    : data.monitoring.snapshot.health === "last_run_failed"
      ? t.alertLastRunFailed
      : data.monitoring.snapshot.health === "not_configured"
        ? t.alertNotConfigured
        : null;

  const nav: AdminNavItem[] = [
    {
      key: "matches",
      label: t.section.matches,
      count: data.matchesError
        ? null
        : { value: needsReviewMatches.length, label: t.navCount.matches(needsReviewMatches.length) },
    },
    {
      key: "candidates",
      label: t.section.candidates,
      count: data.matchesError
        ? null
        : { value: unmarkedCandidates.length, label: t.navCount.candidates(unmarkedCandidates.length) },
    },
    {
      key: "claims",
      label: t.section.claims,
      count: verificationsLoaded
        ? { value: awaitingDecision, label: t.navCount.claims(awaitingDecision) }
        : null,
    },
    { key: "reports", label: t.section.reports },
    { key: "monitoring", label: t.section.monitoring, alert: monitoringAlert },
  ];

  if (data.missingConfig) {
    return (
      <AdminShell active={null} nav={nav} title={t.workspace} t={t}>
        <Notice tone="error" role="alert">
          {t.notConfigured}
        </Notice>
      </AdminShell>
    );
  }

  const sublines: Record<AdminSectionKey, { subline: string; actions?: ReactNode }> = {
    matches: {
      subline: data.matchesError ? t.intro.matchesError : t.intro.matches(needsReviewMatches.length),
    },
    candidates: {
      subline: data.matchesError ? t.intro.candidatesError : t.intro.candidates(unmarkedCandidates.length),
    },
    claims: {
      subline: verificationsLoaded
        ? t.intro.claims(readyClaims.length, waitingClaims.length)
        : t.intro.claimsError,
    },
    reports: {
      subline: data.loadError ? t.intro.reportsError : t.intro.reports(reports.length, filter),
      actions: <ReportFilter filter={filter} t={t} />,
    },
    monitoring: { subline: t.intro.monitoring },
  };

  return (
    <AdminShell
      active={section}
      nav={nav}
      title={t.section[section]}
      subline={sublines[section].subline}
      actions={sublines[section].actions}
      t={t}
    >
      {section === "matches" ? (
        <MatchesSection
          t={t}
          locale={locale}
          error={data.matchesError}
          needsReview={needsReviewMatches}
          reviewed={reviewedMatches}
          uncertain={uncertainMatches}
          verificationByMatch={verificationByMatch}
          verifiedLostReports={verifiedLostReports}
        />
      ) : null}

      {section === "claims" ? (
        <ClaimsSection
          t={t}
          locale={locale}
          state={data.matchesError && data.verificationsState === "ok" ? "error" : data.verificationsState}
          ready={readyClaims}
          waiting={waitingClaims}
          decided={decidedClaims}
          matches={matches}
          followupsAvailable={data.followupsAvailable}
        />
      ) : null}

      {section === "candidates" ? (
        data.matchesError ? (
          <Notice tone="error" role="alert">
            {t.errorCandidates}
          </Notice>
        ) : (
          <CandidatesPanel
            open={candidateQueues.open}
            dismissed={candidateQueues.dismissed}
            lostReports={reports
              .filter((report) => report.report_type === "lost")
              .map((report) => ({ id: report.id, item_name: report.item_name }))}
            foundReports={reports
              .filter((report) => report.report_type === "found")
              .map((report) => ({ id: report.id, item_name: report.item_name }))}
            reviewsState={data.candidateReviewsState}
          />
        )
      ) : null}

      {section === "reports" ? (
        <ReportsSection reports={reports} filter={filter} error={data.loadError} t={t} locale={locale} />
      ) : null}

      {section === "monitoring" ? (
        <div id="monitoring" className="scroll-mt-6">
          {data.monitoring.ok ? (
            <MonitoringPanel
              snapshot={data.monitoring.snapshot}
              reviewNeeded={
                data.monitoringDemo
                  ? data.monitoring.snapshot.pairs.possible
                  : data.matchesError || !verificationsLoaded
                    ? null
                    : data.monitoring.reviewNeeded
              }
              demo={data.monitoringDemo}
            />
          ) : (
            <Notice tone="error" role="alert">
              {t.errorMonitoring}
            </Notice>
          )}
        </div>
      ) : null}
    </AdminShell>
  );
}
