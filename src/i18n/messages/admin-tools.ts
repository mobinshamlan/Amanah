import type { Catalogue } from "@/i18n/config";
import type { ScoreBandKey } from "@/utils/monitoring/snapshot";

// Staff tools: potential candidates, ownership decisions, the manual matching
// run, and the Monitoring dashboard. Also the result messages the server
// actions in src/app/admin/actions.ts return.
//
// Arabic first: short, natural, slightly more formal than the public pages
// because staff read these all day. English is equally direct.

/** English count with a regular plural: "1 report", "4 reports". */
function enCount(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Arabic count: 1 and 2 use the noun's own forms, 3–10 take the plural with
 * the number, 11 and up (and 0) take the singular with the number.
 */
function arCount(n: number, forms: { one: string; two: string; few: string; many: string }) {
  if (n === 1) {
    return forms.one;
  }
  if (n === 2) {
    return forms.two;
  }
  if (n >= 3 && n <= 10) {
    return `${n} ${forms.few}`;
  }
  return `${n} ${forms.many}`;
}

const AR = {
  report: { one: "بلاغ واحد", two: "بلاغان", few: "بلاغات", many: "بلاغ" },
  pair: { one: "زوج واحد", two: "زوجان", few: "أزواج", many: "زوج" },
  check: { one: "فحص واحد", two: "فحصان", few: "فحوصات", many: "فحص" },
  comparison: { one: "مقارنة واحدة", two: "مقارنتان", few: "مقارنات", many: "مقارنة" },
  claim: { one: "طلب واحد", two: "طلبان", few: "طلبات", many: "طلب" },
  decision: { one: "قرار واحد", two: "قراران", few: "قرارات", many: "قرار" },
  day: { one: "يوم واحد", two: "يومان", few: "أيام", many: "يوم" },
  hour: { one: "ساعة واحدة", two: "ساعتان", few: "ساعات", many: "ساعة" },
  minute: { one: "دقيقة واحدة", two: "دقيقتان", few: "دقائق", many: "دقيقة" },
  candidate: { one: "مرشّح واحد", two: "مرشّحان", few: "مرشّحين", many: "مرشّح" },
};

const en = {
  shared: {
    optional: "optional",
    cancel: "Cancel",
    saving: "Saving…",
    lost: "Lost report",
    found: "Found report",
    foundPrivate: "Found report · private",
    locationLabel: "Where",
    characters: (used: number, max: number) => `${used}/${max} characters`,
  },

  candidates: {
    queueCount: (n: number, unreviewed: number) =>
      n === 0
        ? "Nothing to review"
        : `Open pairs: ${n}, ${unreviewed === 0 ? "all reviewed" : `${unreviewed} not reviewed yet`}`,
    queueIntro:
      "Compare both reports, then save a note for the next staff member. Nothing saved here reaches the owner.",
    addToggle: "Add a pair yourself",
    addClose: "Close the form",
    empty:
      "No pairs to review right now. A pair appears here when the saved result says there is not enough information, the item types match, and the reports share a real clue.",
    dismissedTitle: (n: number) => `Marked “not the same item” (${n})`,
    reviewedTitle: (n: number) => `Marked worth ownership review (${n})`,
    notReviewed: "Not reviewed yet",
    reviewPair: "Review pair",
    moreDifferences: (n: number) => `(+${n} more)`,
    notSetUp:
      "The candidate list works, but saving a review needs the report_candidate_reviews migration applied locally.",
    loadError: "Earlier candidate reviews could not be loaded. Refresh to try again.",

    /** Joins the two item names; each name is bidi-isolated by the page. */
    pairJoin: " and ",
    staffAdded: "Added by staff, not by the AI.",
    notScored: "No AI score.",
    score: (score: number) => `AI similarity ${score} of 100. A low score can still be a candidate.`,
    whatThisIs:
      "A candidate, not a confirmed match. The owner's tracking page does not mention it.",

    sharedClues: "Shared clues",
    differences: "Differences",
    unknown: "Only one side says",
    noShared: "No shared clue recorded.",
    noDifferences: "No difference recorded.",
    noUnknown: "Nothing left one-sided in the saved result.",
    savedResult: "Saved AI result",
    staffNote: "Staff note",

    reviewedWorth: "Marked worth ownership review.",
    reviewedDismissed: "Marked not the same item.",
    reviewNoteLabel: "Note",
    reviewLogged: "A new review is added to the log; earlier ones stay.",

    noteLabel: "Note for the next staff member",
    notePlaceholder: "What should they check or know?",
    actionsLegend: "Save a staff review",
    actionsHelp:
      "Saves a note for staff only. The owner is not told, their tracking page does not change, and no ownership questions start.",
    worth: "Worth ownership review",
    dismiss: "Not the same item",
    howTitle: "How ownership questions start",
    howVerificationStarts:
      "Ownership questions start only from an AI “possible match” when the owner opens their tracking link, and staff decide on the answers under Claims. This pair is saved as “not enough information”, so a review here cannot start that.",
    savedWorth: "Saved: worth ownership review. Staff only; the owner was not told.",
    savedDismissed: "Saved: not the same item. Staff only; the owner was not told.",
    saveFailed: "The review could not be saved. Please try again.",

    addTitle: "Add a pair yourself",
    addIntro:
      "Pick a lost report and a found report the AI did not pair. It is saved as “not enough information” for staff to review. The owner's page does not change.",
    addLost: "Lost report",
    addFound: "Found report",
    chooseLost: "Choose a lost report",
    chooseFound: "Choose a found report",
    addNote: "Why is this pair worth a look?",
    addSubmit: "Save as a candidate",
    addNeeds: "Adding a pair needs at least one lost report and one found report.",
    addPickBoth: "Choose both a lost report and a found report.",
    addSaved: "Candidate saved. It is now in the list below.",
    addFailed: "The candidate could not be saved. Please try again.",
  },

  ownership: {
    approve: "Approve for ownership follow-up",
    reject: "Reject this claim",
    decisionHelp:
      "The owner sees the decision on their tracking page. Approval does not return the item. Either decision can be reset later.",
    approveTitle: "Approve this claim?",
    rejectTitle: "Reject this claim?",
    approveConsequence:
      "The owner's tracking page will say staff will continue ownership follow-up. It does not return the item or close the claim.",
    rejectConsequence:
      "The owner's tracking page will say staff could not confirm this match. The found report stays private.",
    noteLabel: "Note for staff",
    confirmApprove: "Confirm approval",
    confirmReject: "Confirm rejection",
    decisionFailed: "The decision could not be saved. Please try again.",
    approvedSaved:
      "Approved for ownership follow-up. The owner's tracking page now says staff will continue ownership follow-up.",
    rejectedSaved:
      "Claim rejected. The owner's tracking page now says staff could not confirm this match.",
    resetSaved: "Back to pending review. The earlier decision stays in the history.",

    reset: "Reset to pending review",
    resetTitle: "Reset to pending review?",
    resetConsequence:
      "The owner stops seeing the decision; their page goes back to its earlier state. This decision stays in the history, and staff can decide again.",
    resetReason: "Reason",
    confirmReset: "Confirm reset",
    resetting: "Resetting…",
    resetFailed: "The decision could not be reset. Please try again.",

    followupOpen: "Ask the owner a follow-up question",
    followupHelp:
      "Optional. Only one question is allowed per claim, and it cannot be changed. You can also decide without one.",
    followupTitle: "Ask a follow-up question",
    followupLabel: "Question for the owner",
    followupHint:
      "Plain words, one thing at a time. Do not include anything from the found report. The owner answers once on their private tracking page.",
    followupEmpty: "Write a question first.",
    followupTooLong: (max: number) => `Keep the question under ${max} characters.`,
    followupReview: "Review and send",
    followupPreviewTitle: "Send this question to the owner?",
    followupPreviewHelp:
      "Does this question reveal a detail the claimant hasn't given? If so, ask neutrally, for example: \"Describe any distinctive details you remember.\" The owner will see exactly this on their tracking page. One question only; it cannot be edited or withdrawn once sent. Sending does not approve or reject the claim.",
    followupSend: "Send to the owner",
    followupEdit: "Edit the question",
    sending: "Sending…",
    followupFailed: "The follow-up question could not be saved. Please try again.",

    retry: "Retry AI assessment",
    retrying: "Assessing…",
    retryHelp: "A recommendation for staff only. The owner's answers are already saved.",
    retryFailed: "The AI assessment did not finish. The answers are saved. You can try again.",
  },

  run: {
    button: "Check for matches",
    running: "Checking…",
    help: "Checks the next 4 unchecked lost–found pairs with Gemini, newest first. Run again to continue; finished checks are remembered. Gemini has a daily limit, so runs can pause.",
    failed: "The matching run failed. Nothing more was checked.",
    idle: "No run yet in this session.",
    partialFailure: "Partial result.",
    keptAfterFailure:
      "Suggestions saved before the error were kept, and the failed pair stays unchecked, never “no match”.",
    stoppedForTime:
      "Partial result. The run stopped after 30 seconds to avoid a long wait. Unchecked pairs were not counted as “no match”. Run again to continue.",
    batchDone: "Batch finished. Run again to check the next pairs.",
    allDone: "All current pairs have been checked.",
    checked: "Pairs checked",
    matched: "New possible matches",
    uncertain: "New “not enough information”",
    remaining: "Still unchecked",
    noMatch: "Not a match (not saved)",
    alreadySaved: "Already saved (skipped)",
    failedCount: "Failed",
    showDetails: "Show run details",
    hideDetails: "Hide run details",
    detailsNote:
      "Every finished comparison, including “not a match”, is recorded and not sent to Gemini again. Failed comparisons are not recorded, so they are retried next run. New reports are included automatically.",
    failures: {
      quota:
        "Gemini's free-tier limit was reached. Quota errors are not retried. Wait a minute, or until the daily quota resets, then run again.",
      usage_limit: "Amanah is paused because today's usage limit was reached. Try again later.",
      timeout: "Gemini did not answer within 20 seconds.",
      api: "Gemini was unavailable or returned an error, including after one retry for a temporary server error.",
      invalid_response: "Gemini returned a result that did not pass validation.",
      config: "Gemini is not configured on the server.",
      save: "A suggestion could not be saved to the database.",
    },
  },

  monitoring: {
    demoTitle: "Demo data",
    demoBody:
      "Synthetic figures for local layout checks. Nothing was read from or written to the database, and Gemini was not called.",
    demoShowReal: "Show real data",
    devOnly: "Local development only.",
    demoPreview: "Preview with demo data",

    health: {
      not_configured: {
        title: "Matching is not configured",
        body: "GEMINI_API_KEY is missing from .env.local, so no pairs can be checked. Add it and restart the dev server.",
      },
      history_unavailable: {
        title: "Run history is not available",
        body: "Recorded checks could not be read, so failures and early stops are not shown. Pair counts and comparisons below still work.",
      },
      nothing_to_check: {
        title: "Nothing to compare yet",
        body: "Matching needs at least one lost report and one found report.",
      },
      never_run: {
        title: "No checks have run yet",
        body: "Run “Check for matches” from Possible matches to start.",
      },
      no_recorded_checks: {
        title: "No checks recorded since run history began",
        body: "Their results are counted below. New checks will appear in Recent checks.",
      },
      last_run_failed: { title: "The last check did not finish", body: "" },
      last_run_partial: { title: "The last check stopped early", body: "" },
      working: { title: "Matching is working", body: "" },
    },
    lastComparisonBefore: (ago: string, at: string) =>
      `The last completed comparison was ${ago} (${at}), before run history was recording.`,
    earlierComparisons: "Earlier comparisons predate run history.",
    lastFailed: (source: string, ago: string, reason: string) => `${source} ${ago}: ${reason}.`,
    lastPartial: (source: string, ago: string) => `${source} ${ago} reached the 30-second limit.`,
    lastWorking: (source: string, ago: string, pairs: string) =>
      `${source} ${ago} completed and checked ${pairs}.`,
    notNoMatch:
      "Unfinished pairs stay unchecked and are retried; they are never counted as “no match”.",
    remainingUnchecked: (n: number) =>
      `${enCount(n, "report pair is", "report pairs are")} not checked yet.`,
    allChecked: "All current report pairs are checked.",
    failed: "failed",

    geminiKey: "Gemini key",
    setupDetails: "Setup details",
    keyPresent: "Present (a key is set; this does not show the service works)",
    keyMissing: "Missing",
    model: "Model",
    runHistory: "Run history",
    historyNotAvailable: "Not available",
    historyNone: "No checks recorded yet",
    historySince: (n: number, day: string) => `${enCount(n, "check", "checks")} since ${day}`,
    lastSuccessful: "Last successful check",
    lastSuccessfulValue: (at: string, took: string) => `${at} · took ${took}`,
    noneRecorded: "None recorded",
    noFailed: "No failed checks recorded.",
    recentFailed: "Recent failed checks",
    demoExcludedNone: "Records marked DEMO are left out of these figures. None found.",
    demoExcluded: (parts: string) =>
      `Left out of every figure here as marked DEMO data: ${parts}. Nothing was deleted.`,
    excludedReports: (n: number) => enCount(n, "report", "reports"),
    excludedComparisons: (n: number) => enCount(n, "comparison", "comparisons"),
    excludedRuns: (n: number) => enCount(n, "check", "checks"),
    excludedClaims: (n: number) => enCount(n, "claim", "claims"),

    kpiUnchecked: "Pairs not compared yet",
    kpiUncheckedDetail: (checked: number, total: number, lost: number, found: number) =>
      `${checked} of ${enCount(total, "possible pair", "possible pairs")} compared (${lost} lost × ${found} found). A failed comparison stays here; it is never “no match”.`,
    progressLabel: "Share of possible pairs compared",
    kpiProblems: (days: number) => `Check problems, last ${days} days`,
    kpiProblemsNone: "No checks",
    kpiProblemsNoHistory: "Run history is not available.",
    kpiProblemsEmpty: "None recorded in this period.",
    kpiProblemsDetail: (checks: number, completed: number, failed: number, stopped: number, truncated: boolean) =>
      `${enCount(checks, "check", "checks")}: ${completed} completed, ${failed} failed, ${stopped} stopped early${truncated ? " (latest checks only)" : ""}.`,
    kpiReview: "Possible matches that need your decision",
    kpiReviewDetail: (open: number, ownerNext: number) =>
      `${enCount(open, "open suggestion", "open suggestions")} in all; ${ownerNext} ${ownerNext === 1 ? "waits" : "wait"} on the owner.`,
    kpiReviewUnavailable: "Possible matches could not be loaded.",
    reviewMatches: "Review matches",
    kpiClaims: "Claims without a decision",
    kpiClaimsNone: "None waiting for staff right now.",
    kpiClaimsOldest: (age: string) => `Oldest waiting for staff: ${age}.`,
    kpiClaimsRetry: (n: number) => `${n} ${n === 1 ? "needs" : "need"} an AI assessment retry.`,
    kpiClaimsUnavailable: "Ownership data is not available.",
    openClaims: "Open claims",

    approvalTitle: "Staff approval rate",
    approvalIntro:
      "The share of decided ownership claims that staff approved. A staff-decision signal on AI-suggested matches, not verified AI accuracy.",
    approvalNone: "No reviewed claims yet",
    approved: "Approved",
    rejected: "Rejected",
    reviewed: "Reviewed",
    smallSample: (n: number) =>
      `Small sample: only ${enCount(n, "decision", "decisions")} so far. Do not read a trend into this yet.`,
    bandsTitle: "By AI similarity score",
    bandsIntro: "Bands group the AI's similarity scores. They are not calibrated confidence levels.",
    band: (label: string) => `Score ${label}`,
    bandLabels: { "85-100": "85–100", "70-84": "70–84", "below-70": "below 70" } as Record<ScoreBandKey, string>,
    bandNone: "No reviewed claims",
    bandEmpty: "No data in this band.",
    bandDetail: (approved: number, rejected: number, reviewed: number) =>
      `${approved} approved, ${rejected} rejected · ${enCount(reviewed, "decision", "decisions")}`,
    bandSmall: (min: number) => `Small sample (under ${min}). Not a trend.`,
    approvalFootnote: (unscored: number) =>
      `Counts only claims with a current approved or rejected decision. Pending claims, claims reset to pending${
        unscored > 0
          ? `, and ${enCount(unscored, "decided claim", "decided claims")} with no similarity score (in the total, not in a band)`
          : ", and unscored claims"
      } are left out of the bands. Staff decisions can be wrong, and rejected claims may still be the right item.`,
    ownershipUnavailable: "Ownership data is not available. Check that its migration is applied.",

    reportsTitle: "Reports per day",
    reportsIntro: (days: number) => `Lost and found reports saved in the last ${days} days.`,
    reportsFootnote: "Counts reports that still exist, by the day they were saved.",
    comparisonsTitle: "Comparison results per day",
    comparisonsIntro: (days: number) => `Completed comparisons by AI result in the last ${days} days.`,
    comparisonsFootnote:
      "Only completed comparisons are stored per pair. Failed comparisons appear in Recent checks, never as “no match”.",
    seriesNone: (unit: string, days: number) => `No ${unit} in the last ${days} days.`,
    seriesSummary: (total: string, days: string, range: string) => `${total} on ${days} (${range}).`,
    seriesRange: (first: string, last: string) => `${first} to ${last}`,
    seriesTooFew: "Too few days to read a trend yet.",
    nothingToChart: "Nothing to chart for this period.",
    reports: (n: number) => enCount(n, "report", "reports"),
    reportsPlural: "reports",
    comparisons: (n: number) => enCount(n, "comparison", "comparisons"),
    comparisonsPlural: "comparisons",
    listSeparator: ", ",
    days: (n: number) => enCount(n, "day", "days"),
    lost: "Lost",
    found: "Found",
    possibleMatch: "Possible match",
    notEnoughInfo: "Not enough information",
    noMatch: "No match",

    recentTitle: "Recent checks",
    moreChecks: (n: number) => `Show ${n} earlier ${n === 1 ? "check" : "checks"}`,
    recentUnavailable: "Run history could not be read, so failures and early stops cannot be shown.",
    recentNever: "No checks have run yet.",
    recentNoneSince:
      "No checks recorded since run history began. Comparisons from before then are counted in the pair totals and the comparison chart.",
    windowSummary: (days: number, checks: number, completed: number, failed: number, stopped: number) =>
      `Last ${days} days: ${enCount(checks, "check", "checks")}, ${completed} completed, ${failed} failed, ${stopped} stopped early.`,
    windowFailures: (list: string) => `Failures: ${list}.`,
    tableLabel: "Recent checks table",
    tableCaption: "Recent matching checks, newest first",
    colFinished: "Finished",
    colSource: "Source",
    colResult: "Result",
    colChecked: "Checked",
    colPossible: "Possible",
    colUncertain: "Not enough info",
    colNoMatch: "No match",
    colFailed: "Failed",
    colRemaining: "Left unchecked",
    colTime: "Time",
    resultFailed: (reason: string) => `Failed: ${reason}`,
    resultStopped: "Stopped early (30-second limit)",
    resultCompleted: "Completed",
    recentFootnote: (n: number) =>
      `Newest ${enCount(n, "check", "checks")}. An automatic check covers only the new report's pairs, so its “Left unchecked” counts those pairs alone.`,
    lastCompleted: (at: string) => `Last check that completed: ${at}.`,

    claimsTitle: "Ownership claims",
    claimsAwaiting: "No staff decision yet",
    claimsRetry: "AI assessment needs a retry",
    claimsAnswers: "Waiting for owner answers",
    claimsNoQuestions: "Staff review without questions",
    claimsApproved: "Approved for ownership follow-up",
    claimsRejected: "Rejected",
    claimsFootnote: (n: number) =>
      `Current state of ${enCount(n, "claim", "claims")}. Decision counts are not a measure of AI accuracy.`,

    sources: { admin: "Staff check", auto: "Automatic check" },
    failureKinds: {
      quota: "Gemini rate limit",
      usage_limit: "App usage limit",
      timeout: "Gemini timed out",
      api: "Gemini error",
      invalid_response: "AI answer failed validation",
      config: "Gemini not configured",
      save: "Could not save a result",
      load: "Could not load reports",
    },
    justNow: "just now",
    underMinute: "under a minute",
    minutes: (n: number) => enCount(n, "minute", "minutes"),
    hours: (n: number) => enCount(n, "hour", "hours"),
    daysAge: (n: number) => enCount(n, "day", "days"),
    ms: (n: string) => `${n} ms`,
    seconds: (n: string) => `${n} s`,
    pairs: (n: number) => enCount(n, "pair", "pairs"),
  },

  chart: {
    legend: (title: string) => `${title} legend`,
    group: (title: string, days: number) => `${title}, last ${days} days`,
    describe: (day: string, count: string, parts: string) =>
      parts ? `${day}: ${count} (${parts})` : `${day}: ${count}`,
    part: (value: number, label: string) => `${value} ${label.toLowerCase()}`,
    tooltip: (day: string, count: string) => `${day} · ${count}`,
    showTable: "Show as table",
    hideTable: "Hide table",
    tableCaption: (title: string) => `${title}, days with activity`,
    day: "Day",
    total: "Total",
    otherDaysNone: (days: number) => `Every other day in the last ${days} days had none.`,
    oldest: "Oldest",
    newest: "Newest",
  },

  // Returned by server actions. Validation, limits and access checks live in
  // actions.ts; only the words live here.
  actions: {
    notAvailable: "Not available.",
    runInProgress: "A matching run is already in progress. Wait for it to finish, then run again.",
    geminiNotConfigured:
      "Gemini is not configured. Add GEMINI_API_KEY to .env.local, then restart the dev server.",
    adminNotConfigured:
      "Admin is not configured. Add SUPABASE_SECRET_KEY to .env.local, then restart the dev server.",
    adminNotConfiguredShort: "Admin is not configured.",
    loadFailed: "Could not load reports. Nothing was checked.",
    unknownVerification: "Unknown verification.",
    retry: {
      busy: "Amanah is busy right now. The answers are saved. Please try again later.",
      failed: "The AI assessment did not finish. The answers are saved. You can try again.",
      unavailable:
        "The AI assessment is not available. Check GEMINI_API_KEY and that the ownership migration is applied.",
      not_ready: "The owner has not answered every question yet.",
    },
    decision: {
      already_decided: "This claim already has a decision. Reset it to pending review first.",
      not_decided: "This claim is already pending review.",
      changed:
        "Another staff action was saved for this claim first. The page has been refreshed; check it and try again.",
      failed: "The decision could not be saved. Please try again.",
    },
    decisionInvalid: (max: number) =>
      `Choose approve or reject, and keep the note under ${max} characters.`,
    resetInvalid: (max: number) => `Keep the reason under ${max} characters.`,
    followup: {
      already_asked: "A follow-up question was already asked on this claim. Only one is allowed.",
      already_decided: "This claim already has a decision, so a follow-up can no longer be asked.",
      not_set_up:
        "Follow-up questions are not set up yet. Apply the ownership_followups migration, then refresh.",
      failed: "The follow-up question could not be saved. Please try again.",
    },
    followupInvalid: (max: number) => `Write a question of up to ${max} characters.`,
    candidateNotListed: "That pair is not in the candidate list.",
    candidateAction: "Choose “worth ownership review” or “not the same item”.",
    candidateNoteTooLong: (max: number) => `Keep the note under ${max} characters.`,
    candidateReviewFailed: "The review could not be saved. Please try again.",
    candidateReviewsNotSetUp:
      "Candidate reviews are not set up yet. Apply the report_candidate_reviews migration locally, then refresh.",
    candidateChooseBoth: "Choose one lost report and one found report.",
    candidateCreateFailed: "The candidate could not be saved. Please try again.",
    candidateDuplicate: "This pair is already saved.",
  },
};

const ar: typeof en = {
  shared: {
    optional: "اختياري",
    cancel: "إلغاء",
    saving: "جاري الحفظ…",
    lost: "بلاغ المفقود",
    found: "بلاغ الملقى",
    foundPrivate: "بلاغ الملقى · خاص",
    locationLabel: "المكان",
    characters: (used, max) => `${used}/${max} حرف`,
  },

  candidates: {
    queueCount: (n, unreviewed) =>
      n === 0
        ? "ما فيه شي للمراجعة"
        : `الأزواج المفتوحة: ${n}، ${unreviewed === 0 ? "كلها تمت مراجعتها" : `منها ${unreviewed} بدون مراجعة`}`,
    queueIntro: "قارن البلاغين، ثم احفظ ملاحظة للموظف اللي بعدك. ولا شي يُحفظ هنا يوصل للمالك.",
    addToggle: "أضف زوجًا بنفسك",
    addClose: "إغلاق النموذج",
    empty:
      "ما فيه أزواج للمراجعة الآن. الزوج يظهر هنا لما تكون النتيجة المحفوظة «معلومات غير كافية»، ونوع الغرض متطابق، وبين البلاغين قرينة حقيقية مشتركة.",
    dismissedTitle: (n) => `مؤشَّر عليها «ليس نفس الغرض» (${n})`,
    reviewedTitle: (n) => `مؤشَّر عليها: تستاهل مراجعة ملكية (${n})`,
    notReviewed: "ما تمت مراجعته بعد",
    reviewPair: "راجع الزوج",
    moreDifferences: (n) => `(+${n} غيره)`,
    notSetUp:
      "قائمة المرشّحات تعمل، لكن حفظ المراجعة يحتاج تطبيق ترحيل report_candidate_reviews محليًا.",
    loadError: "ما قدرنا نحمّل المراجعات السابقة. حدّث الصفحة وجرّب مرة ثانية.",

    pairJoin: " و ",
    staffAdded: "أضافه موظف، ليس الذكاء الاصطناعي.",
    notScored: "بدون درجة تشابه.",
    score: (score) => `درجة التشابه ${score} من 100. الدرجة المنخفضة ما تمنع أن يكون مرشّحًا.`,
    whatThisIs: "مرشّح فقط، ليس تطابقًا مؤكدًا. صفحة متابعة المالك ما تذكره.",

    sharedClues: "قرائن مشتركة",
    differences: "اختلافات",
    unknown: "ذكره طرف واحد فقط",
    noShared: "ما سُجّلت قرينة مشتركة.",
    noDifferences: "ما سُجّل اختلاف.",
    noUnknown: "ما بقي شي من طرف واحد في النتيجة المحفوظة.",
    savedResult: "نتيجة الذكاء الاصطناعي المحفوظة",
    staffNote: "ملاحظة الموظف",

    reviewedWorth: "مؤشَّر عليه: يستاهل مراجعة ملكية.",
    reviewedDismissed: "مؤشَّر عليه: ليس نفس الغرض.",
    reviewNoteLabel: "ملاحظة",
    reviewLogged: "المراجعة الجديدة تُضاف للسجل، والسابقة تبقى.",

    noteLabel: "ملاحظة للموظف التالي",
    notePlaceholder: "وش اللي يحتاج يتحقق منه أو يعرفه؟",
    actionsLegend: "حفظ مراجعة الموظف",
    actionsHelp:
      "تُحفظ كملاحظة للموظفين فقط. المالك ما يُبلَّغ، وصفحة متابعته ما تتغير، ولا تبدأ أي أسئلة ملكية.",
    worth: "يستاهل مراجعة ملكية",
    dismiss: "ليس نفس الغرض",
    howTitle: "كيف تبدأ أسئلة الملكية",
    howVerificationStarts:
      "أسئلة الملكية تبدأ فقط من نتيجة «تطابق محتمل» للذكاء الاصطناعي عندما يفتح المالك رابط المتابعة، والموظف يقرر على الإجابات في قسم الطلبات. هذا الزوج محفوظ كـ«معلومات غير كافية»، فالمراجعة هنا ما تبدأ ذلك.",
    savedWorth: "تم الحفظ: يستاهل مراجعة ملكية. للموظفين فقط؛ المالك ما أُبلغ.",
    savedDismissed: "تم الحفظ: ليس نفس الغرض. للموظفين فقط؛ المالك ما أُبلغ.",
    saveFailed: "ما انحفظت المراجعة. جرّب مرة ثانية.",

    addTitle: "أضف زوجًا بنفسك",
    addIntro:
      "اختر بلاغ مفقود وبلاغ ملقى ما جمعهما الذكاء الاصطناعي. يُحفظ كـ«معلومات غير كافية» ليراجعه الموظفون. صفحة المالك ما تتغير.",
    addLost: "بلاغ المفقود",
    addFound: "بلاغ الملقى",
    chooseLost: "اختر بلاغ مفقود",
    chooseFound: "اختر بلاغ ملقى",
    addNote: "لماذا يستاهل هذا الزوج نظرة؟",
    addSubmit: "احفظه كمرشّح",
    addNeeds: "إضافة زوج تحتاج بلاغ مفقود واحدًا على الأقل وبلاغ ملقى واحدًا.",
    addPickBoth: "اختر بلاغ مفقود وبلاغ ملقى.",
    addSaved: "انحفظ المرشّح، وتلقاه الآن في القائمة تحت.",
    addFailed: "ما انحفظ المرشّح. جرّب مرة ثانية.",
  },

  ownership: {
    approve: "اعتماد متابعة الملكية",
    reject: "رفض الطلب",
    decisionHelp:
      "المالك يشوف القرار في صفحة متابعته. الاعتماد ما يرجّع الغرض. وأي قرار يمكن إرجاعه للمراجعة لاحقًا.",
    approveTitle: "تعتمد هذا الطلب؟",
    rejectTitle: "ترفض هذا الطلب؟",
    approveConsequence:
      "صفحة متابعة المالك ستقول إن الموظفين سيواصلون متابعة الملكية. هذا ما يرجّع الغرض ولا يقفل الطلب.",
    rejectConsequence:
      "صفحة متابعة المالك ستقول إن الموظفين ما قدروا يؤكدون هذا التطابق. بلاغ الملقى يبقى خاصًا.",
    noteLabel: "ملاحظة للموظفين",
    confirmApprove: "تأكيد الاعتماد",
    confirmReject: "تأكيد الرفض",
    decisionFailed: "ما انحفظ القرار. جرّب مرة ثانية.",
    approvedSaved: "تم الاعتماد لمتابعة الملكية. صفحة متابعة المالك صارت تقول إن الموظفين سيواصلون متابعة الملكية.",
    rejectedSaved: "تم رفض الطلب. صفحة متابعة المالك صارت تقول إن الموظفين ما قدروا يؤكدون هذا التطابق.",
    resetSaved: "رجع الطلب للمراجعة. القرار السابق باقي في السجل.",

    reset: "إرجاع للمراجعة",
    resetTitle: "ترجّع الطلب للمراجعة؟",
    resetConsequence:
      "المالك يوقف يشوف القرار، وصفحته ترجع لحالتها السابقة. هذا القرار يبقى في السجل، ويمكن للموظفين القرار من جديد.",
    resetReason: "السبب",
    confirmReset: "تأكيد الإرجاع",
    resetting: "جاري الإرجاع…",
    resetFailed: "ما قدرنا نرجّع القرار. جرّب مرة ثانية.",

    followupOpen: "اسأل المالك سؤالًا إضافيًا",
    followupHelp: "اختياري. سؤال واحد فقط لكل طلب، وما يمكن تعديله. وتقدر تقرر بدونه.",
    followupTitle: "سؤال إضافي",
    followupLabel: "السؤال للمالك",
    followupHint:
      "بكلمات واضحة، وشي واحد في كل مرة. لا تذكر أي تفصيل من بلاغ الملقى. المالك يجيب مرة واحدة في صفحة متابعته الخاصة.",
    followupEmpty: "اكتب السؤال أولًا.",
    followupTooLong: (max) => `خلّ السؤال أقل من ${max} حرف.`,
    followupReview: "راجع وأرسل",
    followupPreviewTitle: "ترسل هذا السؤال للمالك؟",
    followupPreviewHelp:
      "هل يكشف السؤال تفصيلًا ما ذكره صاحب الطلب؟ إذا كذا، اسأل بصيغة محايدة، مثل: «اوصف أي تفاصيل مميزة تتذكرها.» المالك بيشوف هذا النص بالضبط في صفحة متابعته. سؤال واحد فقط، وما يمكن تعديله أو سحبه بعد الإرسال. الإرسال لا يعتمد الطلب ولا يرفضه.",
    followupSend: "أرسل للمالك",
    followupEdit: "عدّل السؤال",
    sending: "جاري الإرسال…",
    followupFailed: "ما انحفظ السؤال الإضافي. جرّب مرة ثانية.",

    retry: "أعد تقييم الذكاء الاصطناعي",
    retrying: "جاري التقييم…",
    retryHelp: "توصية للموظفين فقط. إجابات المالك محفوظة أصلًا.",
    retryFailed: "ما اكتمل تقييم الذكاء الاصطناعي. الإجابات محفوظة، وتقدر تعيد المحاولة.",
  },

  run: {
    button: "ابحث عن تطابقات",
    running: "جاري الفحص…",
    help: "يفحص عبر Gemini أقرب 4 أزواج (مفقود–ملقى) لم تُفحص، الأحدث أولًا. شغّله مرة ثانية للمتابعة؛ الفحوصات المكتملة محفوظة. لـ Gemini حد يومي، فقد يتوقف الفحص مؤقتًا.",
    failed: "فشل تشغيل المطابقة. ما فُحص شي إضافي.",
    idle: "ما فيه تشغيل بعد في هذه الجلسة.",
    partialFailure: "نتيجة جزئية.",
    keptAfterFailure:
      "الاقتراحات المحفوظة قبل الخطأ بقيت، والزوج الذي فشل يبقى غير مفحوص، وليس «لا تطابق».",
    stoppedForTime:
      "نتيجة جزئية. توقف التشغيل بعد 30 ثانية حتى لا يطول الانتظار. الأزواج غير المفحوصة لم تُحسب «لا تطابق». شغّله مرة ثانية للمتابعة.",
    batchDone: "انتهت الدفعة. شغّله مرة ثانية لفحص الأزواج التالية.",
    allDone: "كل الأزواج الحالية مفحوصة.",
    checked: "أزواج فُحصت",
    matched: "تطابقات محتملة جديدة",
    uncertain: "«معلومات غير كافية» جديدة",
    remaining: "لم تُفحص بعد",
    noMatch: "لا تطابق (لا يُحفظ)",
    alreadySaved: "محفوظ سابقًا (تم تجاوزه)",
    failedCount: "فشل",
    showDetails: "عرض تفاصيل التشغيل",
    hideDetails: "إخفاء التفاصيل",
    detailsNote:
      "كل مقارنة مكتملة، حتى «لا تطابق»، تُسجَّل ولا تُرسل إلى Gemini مرة ثانية. المقارنات التي فشلت لا تُسجَّل، فتُعاد في التشغيل التالي. البلاغات الجديدة تُضاف تلقائيًا.",
    failures: {
      quota:
        "وصل Gemini لحد الاستخدام المجاني. أخطاء الحد لا تُعاد. انتظر دقيقة، أو حتى تتجدد الحصة اليومية، ثم شغّله مرة ثانية.",
      usage_limit: "أمانة متوقفة مؤقتًا لأن حد الاستخدام اليومي اكتمل. جرّب لاحقًا.",
      timeout: "ما ردّ Gemini خلال 20 ثانية.",
      api: "Gemini غير متاح أو أعاد خطأ، حتى بعد إعادة محاولة واحدة لخطأ مؤقت في الخادم.",
      invalid_response: "أعاد Gemini نتيجة لم تجتز التحقق.",
      config: "Gemini غير مهيّأ على الخادم.",
      save: "ما قدرنا نحفظ اقتراحًا في قاعدة البيانات.",
    },
  },

  monitoring: {
    demoTitle: "بيانات تجريبية",
    demoBody:
      "أرقام وهمية لفحص التخطيط محليًا. ما قُرئ شي من قاعدة البيانات ولا كُتب فيها، ولم يُستدعَ Gemini.",
    demoShowReal: "اعرض البيانات الحقيقية",
    devOnly: "للتطوير المحلي فقط.",
    demoPreview: "استعرض ببيانات تجريبية",

    health: {
      not_configured: {
        title: "المطابقة غير مهيّأة",
        body: "GEMINI_API_KEY غير موجود في .env.local، فلا يمكن فحص أي زوج. أضفه وأعد تشغيل خادم التطوير.",
      },
      history_unavailable: {
        title: "سجل التشغيل غير متاح",
        body: "ما قدرنا نقرأ الفحوصات المسجّلة، فالأخطاء والتوقفات المبكرة لا تظهر. أعداد الأزواج والمقارنات أدناه تعمل.",
      },
      nothing_to_check: {
        title: "ما فيه شي للمقارنة بعد",
        body: "المطابقة تحتاج بلاغ مفقود واحدًا على الأقل وبلاغ ملقى واحدًا.",
      },
      never_run: {
        title: "ما جرى أي فحص بعد",
        body: "شغّل «ابحث عن تطابقات» من قسم التطابقات المحتملة للبدء.",
      },
      no_recorded_checks: {
        title: "لا فحوصات مسجّلة منذ بدء سجل التشغيل",
        body: "نتائجها محسوبة أدناه. الفحوصات الجديدة ستظهر في «آخر الفحوصات».",
      },
      last_run_failed: { title: "آخر فحص لم يكتمل", body: "" },
      last_run_partial: { title: "آخر فحص توقف مبكرًا", body: "" },
      working: { title: "المطابقة تعمل", body: "" },
    },
    lastComparisonBefore: (ago, at) => `آخر مقارنة مكتملة كانت ${ago} (${at})، قبل بدء سجل التشغيل.`,
    earlierComparisons: "المقارنات السابقة تسبق سجل التشغيل.",
    lastFailed: (source, ago, reason) => `${source} ${ago}: ${reason}.`,
    lastPartial: (source, ago) => `${source} ${ago} وصل لحد الـ30 ثانية.`,
    lastWorking: (source, ago, pairs) => `${source} ${ago} اكتمل وفحص ${pairs}.`,
    notNoMatch: "الأزواج غير المكتملة تبقى غير مفحوصة وتُعاد لاحقًا؛ ولا تُحسب أبدًا «لا تطابق».",
    remainingUnchecked: (n) => `${arCount(n, AR.pair)} من البلاغات لم تُفحص بعد.`,
    allChecked: "كل أزواج البلاغات الحالية مفحوصة.",
    failed: "فشل",

    geminiKey: "مفتاح Gemini",
    setupDetails: "تفاصيل الإعداد",
    keyPresent: "موجود (المفتاح مضبوط فقط؛ هذا لا يثبت أن الخدمة تعمل)",
    keyMissing: "غير موجود",
    model: "النموذج",
    runHistory: "سجل التشغيل",
    historyNotAvailable: "غير متاح",
    historyNone: "لا فحوصات مسجّلة بعد",
    historySince: (n, day) => `${arCount(n, AR.check)} منذ ${day}`,
    lastSuccessful: "آخر فحص ناجح",
    lastSuccessfulValue: (at, took) => `${at} · استغرق ${took}`,
    noneRecorded: "لا شي مسجّل",
    noFailed: "ما فيه فحوصات فاشلة مسجّلة.",
    recentFailed: "آخر الفحوصات الفاشلة",
    demoExcludedNone: "السجلات المؤشَّر عليها DEMO مستبعدة من هذه الأرقام. لم يوجد منها شي.",
    demoExcluded: (parts) => `مستبعد من كل الأرقام هنا كبيانات مؤشَّر عليها DEMO: ${parts}. لم يُحذف شي.`,
    excludedReports: (n) => arCount(n, AR.report),
    excludedComparisons: (n) => arCount(n, AR.comparison),
    excludedRuns: (n) => arCount(n, AR.check),
    excludedClaims: (n) => arCount(n, AR.claim),

    kpiUnchecked: "أزواج لم تُقارن بعد",
    kpiUncheckedDetail: (checked, total, lost, found) =>
      `قورن ${checked} من ${arCount(total, AR.pair)} ممكنة (${lost} مفقود × ${found} ملقى). المقارنة الفاشلة تبقى هنا، ولا تُحسب «لا تطابق».`,
    progressLabel: "نسبة الأزواج الممكنة التي قورنت",
    kpiProblems: (days) => `مشكلات الفحص، آخر ${days} يومًا`,
    kpiProblemsNone: "لا فحوصات",
    kpiProblemsNoHistory: "سجل التشغيل غير متاح.",
    kpiProblemsEmpty: "لا شي مسجّل في هذه الفترة.",
    kpiProblemsDetail: (checks, completed, failed, stopped, truncated) =>
      `${arCount(checks, AR.check)}: ${completed} اكتمل، ${failed} فشل، ${stopped} توقف مبكرًا${truncated ? " (آخر الفحوصات فقط)" : ""}.`,
    kpiReview: "تطابقات محتملة تنتظر قرارك",
    kpiReviewDetail: (open, ownerNext) => `الاقتراحات المفتوحة كلها: ${open}، منها ${ownerNext} تنتظر المالك.`,
    kpiReviewUnavailable: "ما قدرنا نحمّل التطابقات المحتملة.",
    reviewMatches: "راجع التطابقات",
    kpiClaims: "طلبات بلا قرار",
    kpiClaimsNone: "ما فيه طلب ينتظر الموظفين الآن.",
    kpiClaimsOldest: (age) => `أقدم طلب ينتظر الموظفين: ${age}.`,
    kpiClaimsRetry: (n) => `${n} يحتاج إعادة تقييم الذكاء الاصطناعي.`,
    kpiClaimsUnavailable: "بيانات الملكية غير متاحة.",
    openClaims: "افتح الطلبات",

    approvalTitle: "نسبة اعتماد الموظفين",
    approvalIntro:
      "نسبة طلبات الملكية المحسومة التي اعتمدها الموظفون. إشارة لقرارات الموظفين على تطابقات اقترحها الذكاء الاصطناعي، وليست دقة مُتحقَّقًا منها.",
    approvalNone: "لا طلبات مراجَعة بعد",
    approved: "معتمد",
    rejected: "مرفوض",
    reviewed: "مراجَع",
    smallSample: (n) => `عينة صغيرة: ${arCount(n, AR.decision)} فقط حتى الآن. لا تقرأ منها اتجاهًا بعد.`,
    bandsTitle: "حسب درجة التشابه",
    bandsIntro: "النطاقات تجمّع درجات التشابه. وهي ليست مستويات ثقة معيّرة.",
    band: (label) => `الدرجة ${label}`,
    bandLabels: { "85-100": "85–100", "70-84": "70–84", "below-70": "أقل من 70" },
    bandNone: "لا طلبات مراجَعة",
    bandEmpty: "لا بيانات في هذا النطاق.",
    bandDetail: (approved, rejected, reviewed) =>
      `${approved} معتمد، ${rejected} مرفوض · ${arCount(reviewed, AR.decision)}`,
    bandSmall: (min) => `عينة صغيرة (أقل من ${min}). ليست اتجاهًا.`,
    approvalFootnote: (unscored) =>
      `تُحسب فقط الطلبات التي لها قرار اعتماد أو رفض حالي. الطلبات المعلّقة، والمرجَعة للمراجعة${
        unscored > 0
          ? `، و${arCount(unscored, AR.claim)} محسومة بلا درجة تشابه (في الإجمالي، لا في نطاق)`
          : "، والطلبات بلا درجة"
      } مستبعدة من النطاقات. قرارات الموظفين قد تكون خاطئة، والطلب المرفوض قد يكون الغرض الصحيح.`,
    ownershipUnavailable: "بيانات الملكية غير متاحة. تأكد من تطبيق ترحيلها.",

    reportsTitle: "البلاغات يوميًا",
    reportsIntro: (days) => `بلاغات المفقود والملقى المحفوظة في آخر ${days} يومًا.`,
    reportsFootnote: "تُحسب البلاغات الموجودة حاليًا، حسب يوم حفظها.",
    comparisonsTitle: "نتائج المقارنة يوميًا",
    comparisonsIntro: (days) => `المقارنات المكتملة حسب نتيجة الذكاء الاصطناعي في آخر ${days} يومًا.`,
    comparisonsFootnote:
      "تُحفظ المقارنات المكتملة فقط لكل زوج. المقارنات الفاشلة تظهر في «آخر الفحوصات»، وليس «لا تطابق».",
    seriesNone: (unit, days) => `لا ${unit} في آخر ${days} يومًا.`,
    seriesSummary: (total, days, range) => `${total} خلال ${days} (${range}).`,
    seriesRange: (first, last) => `من ${first} إلى ${last}`,
    seriesTooFew: "الأيام قليلة لقراءة اتجاه بعد.",
    nothingToChart: "ما فيه شي يُرسم لهذه الفترة.",
    reports: (n) => arCount(n, AR.report),
    reportsPlural: "بلاغات",
    comparisons: (n) => arCount(n, AR.comparison),
    comparisonsPlural: "مقارنات",
    listSeparator: "، ",
    days: (n) => arCount(n, AR.day),
    lost: "مفقود",
    found: "ملقى",
    possibleMatch: "تطابق محتمل",
    notEnoughInfo: "معلومات غير كافية",
    noMatch: "لا تطابق",

    recentTitle: "آخر الفحوصات",
    moreChecks: (n) => (n === 1 ? "اعرض فحصًا سابقًا" : n === 2 ? "اعرض فحصين سابقين" : n <= 10 ? `اعرض ${n} فحوصات سابقة` : `اعرض ${n} فحصًا سابقًا`),
    recentUnavailable: "ما قدرنا نقرأ سجل التشغيل، فلا يمكن عرض الأخطاء والتوقفات المبكرة.",
    recentNever: "ما جرى أي فحص بعد.",
    recentNoneSince:
      "لا فحوصات مسجّلة منذ بدء سجل التشغيل. المقارنات التي سبقته محسوبة في إجمالي الأزواج ورسم المقارنات.",
    windowSummary: (days, checks, completed, failed, stopped) =>
      `آخر ${days} يومًا: ${arCount(checks, AR.check)}، ${completed} اكتمل، ${failed} فشل، ${stopped} توقف مبكرًا.`,
    windowFailures: (list) => `الأخطاء: ${list}.`,
    tableLabel: "جدول آخر الفحوصات",
    tableCaption: "آخر فحوصات المطابقة، الأحدث أولًا",
    colFinished: "انتهى",
    colSource: "المصدر",
    colResult: "النتيجة",
    colChecked: "فُحص",
    colPossible: "محتمل",
    colUncertain: "غير كافية",
    colNoMatch: "لا تطابق",
    colFailed: "فشل",
    colRemaining: "بقي بلا فحص",
    colTime: "المدة",
    resultFailed: (reason) => `فشل: ${reason}`,
    resultStopped: "توقف مبكرًا (حد الـ30 ثانية)",
    resultCompleted: "اكتمل",
    recentFootnote: (n) =>
      `أحدث ${arCount(n, AR.check)}. الفحص التلقائي يغطي أزواج البلاغ الجديد فقط، فعمود «بقي بلا فحص» يحسب تلك الأزواج وحدها.`,
    lastCompleted: (at) => `آخر فحص اكتمل: ${at}.`,

    claimsTitle: "طلبات الملكية",
    claimsAwaiting: "بلا قرار من الموظف بعد",
    claimsRetry: "تحتاج إعادة تقييم الذكاء الاصطناعي",
    claimsAnswers: "تنتظر إجابات المالك",
    claimsNoQuestions: "مراجعة موظف بدون أسئلة",
    claimsApproved: "معتمد لمتابعة الملكية",
    claimsRejected: "مرفوض",
    claimsFootnote: (n) =>
      `الحالة الحالية لـ${arCount(n, AR.claim)}. أعداد القرارات ليست مقياسًا لدقة الذكاء الاصطناعي.`,

    sources: { admin: "فحص موظف", auto: "فحص تلقائي" },
    failureKinds: {
      quota: "حد معدل Gemini",
      usage_limit: "حد استخدام التطبيق",
      timeout: "انتهت مهلة Gemini",
      api: "خطأ من Gemini",
      invalid_response: "إجابة الذكاء الاصطناعي لم تجتز التحقق",
      config: "Gemini غير مهيّأ",
      save: "ما قدرنا نحفظ نتيجة",
      load: "ما قدرنا نحمّل البلاغات",
    },
    justNow: "الآن",
    underMinute: "أقل من دقيقة",
    minutes: (n) => arCount(n, AR.minute),
    hours: (n) => arCount(n, AR.hour),
    daysAge: (n) => arCount(n, AR.day),
    ms: (n) => `${n} م.ث`,
    seconds: (n) => `${n} ث`,
    pairs: (n) => arCount(n, AR.pair),
  },

  chart: {
    legend: (title) => `مفتاح ${title}`,
    group: (title, days) => `${title}، آخر ${days} يومًا`,
    describe: (day, count, parts) => (parts ? `${day}: ${count} (${parts})` : `${day}: ${count}`),
    part: (value, label) => `${value} ${label}`,
    tooltip: (day, count) => `${day} · ${count}`,
    showTable: "اعرض كجدول",
    hideTable: "أخفِ الجدول",
    tableCaption: (title) => `${title}، الأيام التي فيها نشاط`,
    day: "اليوم",
    total: "الإجمالي",
    otherDaysNone: (days) => `بقية الأيام في آخر ${days} يومًا بلا شي.`,
    oldest: "الأقدم",
    newest: "الأحدث",
  },

  actions: {
    notAvailable: "غير متاح.",
    runInProgress: "فيه تشغيل مطابقة جارٍ الآن. انتظر حتى ينتهي ثم شغّله مرة ثانية.",
    geminiNotConfigured: "Gemini غير مهيّأ. أضف GEMINI_API_KEY إلى .env.local ثم أعد تشغيل خادم التطوير.",
    adminNotConfigured:
      "لوحة الموظفين غير مهيّأة. أضف SUPABASE_SECRET_KEY إلى .env.local ثم أعد تشغيل خادم التطوير.",
    adminNotConfiguredShort: "لوحة الموظفين غير مهيّأة.",
    loadFailed: "ما قدرنا نحمّل البلاغات. ما فُحص شي.",
    unknownVerification: "طلب تحقق غير معروف.",
    retry: {
      busy: "أمانة مشغولة الآن. الإجابات محفوظة. جرّب لاحقًا.",
      failed: "ما اكتمل تقييم الذكاء الاصطناعي. الإجابات محفوظة، وتقدر تعيد المحاولة.",
      unavailable:
        "تقييم الذكاء الاصطناعي غير متاح. تأكد من GEMINI_API_KEY ومن تطبيق ترحيل الملكية.",
      not_ready: "المالك ما أجاب عن كل الأسئلة بعد.",
    },
    decision: {
      already_decided: "هذا الطلب له قرار أصلًا. أرجعه للمراجعة أولًا.",
      not_decided: "هذا الطلب تحت المراجعة أصلًا.",
      changed: "حُفظ إجراء آخر لهذا الطلب قبلك. تم تحديث الصفحة؛ راجعها وجرّب مرة ثانية.",
      failed: "ما انحفظ القرار. جرّب مرة ثانية.",
    },
    decisionInvalid: (max) => `اختر الاعتماد أو الرفض، وخلّ الملاحظة أقل من ${max} حرف.`,
    resetInvalid: (max) => `خلّ السبب أقل من ${max} حرف.`,
    followup: {
      already_asked: "سبق أن سُئل سؤال إضافي في هذا الطلب. يُسمح بسؤال واحد فقط.",
      already_decided: "هذا الطلب له قرار أصلًا، فما يمكن إضافة سؤال.",
      not_set_up: "الأسئلة الإضافية غير مهيّأة بعد. طبّق ترحيل ownership_followups ثم حدّث الصفحة.",
      failed: "ما انحفظ السؤال الإضافي. جرّب مرة ثانية.",
    },
    followupInvalid: (max) => `اكتب سؤالًا بحد أقصى ${max} حرف.`,
    candidateNotListed: "هذا الزوج ليس في قائمة المرشّحات.",
    candidateAction: "اختر «يستاهل مراجعة ملكية» أو «ليس نفس الغرض».",
    candidateNoteTooLong: (max) => `خلّ الملاحظة أقل من ${max} حرف.`,
    candidateReviewFailed: "ما انحفظت المراجعة. جرّب مرة ثانية.",
    candidateReviewsNotSetUp:
      "مراجعات المرشّحات غير مهيّأة بعد. طبّق ترحيل report_candidate_reviews محليًا ثم حدّث الصفحة.",
    candidateChooseBoth: "اختر بلاغ مفقود واحدًا وبلاغ ملقى واحدًا.",
    candidateCreateFailed: "ما انحفظ المرشّح. جرّب مرة ثانية.",
    candidateDuplicate: "هذا الزوج محفوظ أصلًا.",
  },
};

export const adminTools: Catalogue<typeof en> = { en, ar };
export type AdminToolsMessages = typeof en;
