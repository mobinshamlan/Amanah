import type { Catalogue } from "@/i18n/config";

// The staff workspace shell and its main sections (possible matches, claims,
// reports). The tools agent's catalogue (admin-tools.ts) covers the controls.
// Arabic is short, slightly formal Saudi Arabic for staff; English is direct.

type SectionKey = "matches" | "candidates" | "claims" | "reports" | "monitoring";
type Filter = "all" | "lost" | "found";
type Decision = "approved" | "rejected" | "pending_review";
type Assessment = "supports" | "unclear" | "conflicts";

/** Arabic counts: 0, 1, 2, 3–10 and 11+ take different forms. */
function arCount(
  n: number,
  forms: { zero: string; one: string; two: string; few: string; many: string },
) {
  if (n === 0) return forms.zero;
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  if (n <= 10) return `${n} ${forms.few}`;
  return `${n} ${forms.many}`;
}

function enCount(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

const en = {
  // Shell
  workspace: "Staff workspace",
  metaTitle: "Staff workspace | AMANAH",
  skipToContent: "Skip to content",
  navLabel: "Workspace sections",
  homeLabel: "AMANAH, home",
  backHome: "Back to the site",
  localNote: "Local workspace. It runs only on this machine and is never published.",
  staffDecide: "AI suggestions are never a decision. Staff decide every claim.",
  loading: "Loading the staff workspace…",
  notConfigured:
    "The workspace is not configured. Add SUPABASE_SECRET_KEY to .env.local, then restart the dev server.",
  section: {
    matches: "Possible matches",
    candidates: "Potential candidates",
    claims: "Ownership claims",
    reports: "All reports",
    monitoring: "Monitoring",
  } satisfies Record<SectionKey, string>,
  // Screen-reader noun after a count badge.
  navCount: {
    matches: (n: number) => enCount(n, "suggestion needs review", "suggestions need review"),
    candidates: (n: number) => enCount(n, "candidate to look at", "candidates to look at"),
    claims: (n: number) => enCount(n, "claim ready for your decision", "claims ready for your decision"),
  },
  alertLastRunFailed: "Last check failed",
  alertNotConfigured: "Matching is not configured",

  // Phone section picker and the first-load summary of staff work.
  sectionPicker: "Section",
  needsYou: {
    title: "Needs you now",
    claims: (n: number) => `${enCount(n, "claim", "claims")} ready for your decision`,
    matches: (n: number) => `${enCount(n, "possible match", "possible matches")} to review`,
    candidates: (n: number) => `${enCount(n, "candidate pair", "candidate pairs")} to look at`,
    retries: (n: number) => `${enCount(n, "AI assessment", "AI assessments")} to retry`,
    owners: (n: number) => `${enCount(n, "claim waits", "claims wait")} on the owner`,
    nothing: "Nothing needs you right now. New work shows up here.",
  },
  openNextClaim: "Open the next claim",

  // Section sublines: the finding first, then one sentence on what the list is.
  intro: {
    matches: (n: number) =>
      n === 0
        ? "Nothing needs review. The AI ranks report pairs that may describe the same item; it never proves ownership."
        : `${enCount(n, "suggestion needs", "suggestions need")} review. The AI ranks report pairs that may describe the same item; it never proves ownership.`,
    matchesError: "The AI ranks report pairs that may describe the same item; it never proves ownership.",
    candidates: (n: number) =>
      n === 0
        ? "No pairs to look at. Plausible pairs the AI could not confirm; a low score can still appear here."
        : `${enCount(n, "pair needs", "pairs need")} a look. Plausible pairs the AI could not confirm; a low score can still appear here.`,
    candidatesError: "Plausible pairs the AI could not confirm; a low score can still appear here.",
    claims: (ready: number, waiting: number) => {
      if (ready === 0 && waiting === 0) {
        return "No claim is waiting. Owners answer private questions through their tracking link; staff make every decision.";
      }
      const parts = [];
      if (ready > 0) parts.push(`${enCount(ready, "claim is", "claims are")} ready for your decision`);
      if (waiting > 0) parts.push(`${enCount(waiting, "is", "are")} waiting on the owner`);
      return `${parts.join("; ")}. Staff make every decision.`;
    },
    claimsError: "Owners answer private questions through their tracking link; staff make every decision.",
    reports: (n: number, filter: Filter) =>
      filter === "all"
        ? `${enCount(n, "report", "reports")}, newest first.`
        : `${enCount(n, filter === "lost" ? "lost report" : "found report", filter === "lost" ? "lost reports" : "found reports")}, newest first.`,
    reportsError: "Every saved report, newest first.",
    monitoring:
      "Whether matching is set up and working, what is left to check, and which claims need staff. Counts and times only.",
  },

  // Errors
  errorMatches: "Could not load possible matches. Please try again.",
  errorCandidates: "Could not load potential candidates. Please try again.",
  errorClaims: "Could not load ownership claims. Please try again.",
  errorClaimsNotSetUp:
    "Ownership verification is not set up yet. Apply the ownership_verification migration, then refresh.",
  errorReports: "Could not load reports. Please try again.",
  errorMonitoring: "Could not load monitoring information. Please try again.",

  // Shared row pieces
  kindLost: "Lost",
  kindFound: "Found",
  foundPrivate: "Found (private)",
  reportUnavailable: "Report unavailable",
  location: "Location",
  showDetails: "Details",
  hideDetails: "Hide details",
  aiSimilarity: "AI similarity",
  notScored: "Not scored",
  outOf100: "/100",
  scoreHelp: "A ranking aid, not proof.",
  suggestedAt: (date: string, model: string) => `Suggested ${date} · ${model}`,
  savedAt: (date: string) => `Saved ${date}`,

  // Possible matches
  needsReview: "Needs review",
  reviewedGroup: (n: number) => `Reviewed (${n})`,
  uncertainGroup: (n: number) => `AI: not enough information (${n})`,
  uncertainHelp:
    "The reports might describe the same item, but the details are too common or too thin to say. Pairs with the same item type and a real shared clue are under Potential candidates.",
  emptyMatchesTitle: "Nothing needs review",
  emptyMatches: "New suggestions appear here after a check. Run one from the Matching panel when new reports come in.",
  contradictionsChip: (n: number) => enCount(n, "difference noted", "differences noted"),
  reportsCompared: "The two reports",
  whatTheAiSaw: "What the AI compared",
  sharedClues: "Shared clues",
  differences: "Differences",
  unknowns: "Unknowns",
  emptyShared: "No detail agrees in both reports.",
  emptyDifferences: "No conflict noted.",
  emptyUnknowns: "Nothing left unknown.",
  notRecorded:
    "Shared clues, differences and unknowns were not recorded for this suggestion (saved before they were collected).",
  aiSummary: "AI summary",
  matchingPanel: "Matching",
  matchingHelp: "Unchecked pairs, past checks and failures are listed under Monitoring.",

  // Ownership verification state inside a match
  verificationTitle: "Ownership verification",
  verificationNotStarted:
    "Not started. Questions are prepared when the owner opens their tracking link. Staff cannot start this step; marking a pair worth ownership review only saves a note.",
  verificationElsewhere:
    "Questions were prepared for another suggestion for this lost report. Only one verification exists per lost report.",
  verificationNoQuestions: "No useful private detail to ask about. Staff review the claim directly.",
  goToClaim: "Open the claim",
  staffDecideNote: "Staff always decide. An AI score or assessment never proves ownership.",

  // Claims
  readyGroup: "Ready for your decision",
  waitingGroup: "Waiting on the owner",
  decidedGroup: "Decided",
  emptyClaimsTitle: "No ownership claims yet",
  emptyClaims:
    "A claim starts when an owner opens their tracking link after a possible match and answers the questions.",
  emptyReadyTitle: "Nothing is ready for a decision",
  emptyReady: "Claims appear here once the owner has answered every question.",
  waitingOn: "Waiting on",
  waitingOwner: (answered: number, total: number) => `the owner (${answered} of ${total} answered)`,
  waitingOwnerFollowup: "the owner (follow-up question)",
  waitingStaff: "staff",
  waitingNobody: "nobody; decided",
  status: {
    staffReviewRequired: "Staff review required",
    awaitingAnswer: (answered: number, total: number) => `Awaiting answer (${answered}/${total})`,
    awaitingFollowup: "Awaiting follow-up answer",
    readyForDecision: "Ready for decision",
    pendingReview: "Pending staff review",
    noQuestions: "No questions needed",
    answersReceived: "Answers received",
    followupAnswered: "Follow-up answered",
    assessmentMissing: "AI assessment needs a retry",
  },
  decision: {
    approved: "Approved for ownership follow-up",
    rejected: "Rejected",
    pending_review: "Reset to pending review",
  } satisfies Record<Decision, string>,
  assessment: {
    supports: "Answers support the claim",
    unclear: "Answers are unclear",
    conflicts: "Answers conflict with the found report",
  } satisfies Record<Assessment, string>,
  questionsAndAnswers: "Questions, answers and AI assessment",
  aiSuggests: (assessment: string) => `AI suggests: ${assessment}`,
  recentlyDecidedGroup: "Just decided",
  recentlyDecidedHelp: "Decisions from the last 30 minutes stay here so you can check or reset them.",
  olderDecidedGroup: (n: number) => `Earlier decisions (${n})`,
  openClaim: "Open the claim and decide",
  changeDecision: "Change this decision",
  nextDecision: "Next decision",
  question: (n: number) => `Question ${n}`,
  ownerAnswer: "Owner's answer",
  awaitingAnswer: "Awaiting answer",
  expectedPrivate: "Expected (staff only)",
  expectedHelp: "Taken from the found report. The owner never sees it.",
  aiAssessment: "AI assessment",
  recommendationOnly: "Recommendation only",
  assessmentFooter: (date: string, model: string) =>
    `${date} · ${model}. The assessment never approves or rejects a claim.`,
  assessmentDidNotFinish:
    "The AI assessment did not finish. The owner's answers are saved. This is not a “no match” result.",
  assessmentRunsAfter: "The AI assessment runs after the owner answers every question.",
  questionsPrepared: (date: string, model: string) => `Questions prepared ${date} · ${model}`,
  otherSuggestions: (n: number) => `Other suggestions for this lost report (${n})`,
  noOtherSuggestions: "No other suggestions for this lost report.",
  aiPossibleMatch: "AI: possible match",
  aiNotEnough: "AI: not enough information",
  staffDecision: "Staff decision",
  decisionNote: "Note",
  approvalNoReturn: "Approval does not return the item automatically. Staff continue the hand-over in person.",
  decisionHistory: (n: number) => `Decision history (${n})`,
  followupTitle: "Follow-up question",
  followupAwaiting: "Awaiting answer",
  followupAnswered: "Answered",
  followupOwnerSees: "The owner sees this on their tracking page. You can decide without waiting for an answer.",
  followupAsked: (date: string) => `Asked ${date} · Only one follow-up is allowed per claim.`,
  followupNotSetUp: "Follow-up questions are not set up yet. Apply the ownership_followups migration, then refresh.",
  privacyNote:
    "Owners never see the found report, the expected answers, the score or the AI assessment.",

  // Reports
  filterLabel: "Filter reports",
  filter: {
    all: "All",
    lost: "Lost",
    found: "Found",
  } satisfies Record<Filter, string>,
  columns: {
    item: "Item",
    type: "Type",
    description: "Description",
    location: "Location",
    saved: "Saved",
  },
  reportsRegion: "Saved reports",
  reportsCaption: "Saved reports, newest first",
  emptyReportsTitle: "No reports yet",
  emptyReports: "Reports appear here as soon as someone saves one.",
  emptyFilteredTitle: (filter: Filter): string =>
    filter === "lost" ? "No lost reports" : "No found reports",
  emptyFiltered: "Try the other filter, or show all reports.",
  showAll: "Show all reports",
};

const ar: typeof en = {
  workspace: "مساحة عمل الموظفين",
  metaTitle: "مساحة عمل الموظفين | أمانة",
  skipToContent: "انتقل للمحتوى",
  navLabel: "أقسام مساحة العمل",
  homeLabel: "أمانة، الصفحة الرئيسية",
  backHome: "رجوع للموقع",
  localNote: "مساحة محلية. تشتغل على هذا الجهاز فقط وما تُنشر أبدًا.",
  staffDecide: "اقتراح الذكاء الاصطناعي ما هو قرار. الموظف يقرر في كل طلب.",
  loading: "جاري تحميل مساحة العمل…",
  notConfigured:
    "مساحة العمل غير مهيّأة. أضف SUPABASE_SECRET_KEY في ملف .env.local ثم أعد تشغيل خادم التطوير.",
  section: {
    matches: "احتمالات التطابق",
    candidates: "مرشّحات محتملة",
    claims: "طلبات الاستلام",
    reports: "كل البلاغات",
    monitoring: "المراقبة",
  },
  navCount: {
    matches: (n) =>
      arCount(n, {
        zero: "ما فيه اقتراحات تحتاج مراجعة",
        one: "اقتراح واحد يحتاج مراجعة",
        two: "اقتراحين يحتاجان مراجعة",
        few: "اقتراحات تحتاج مراجعة",
        many: "اقتراحًا يحتاج مراجعة",
      }),
    candidates: (n) =>
      arCount(n, {
        zero: "ما فيه مرشّحات للمراجعة",
        one: "مرشّح واحد للمراجعة",
        two: "مرشّحين للمراجعة",
        few: "مرشّحات للمراجعة",
        many: "مرشّحًا للمراجعة",
      }),
    claims: (n) =>
      arCount(n, {
        zero: "ما فيه طلبات تنتظر قرار",
        one: "طلب واحد جاهز لقرارك",
        two: "طلبين جاهزين لقرارك",
        few: "طلبات جاهزة لقرارك",
        many: "طلبًا جاهزًا لقرارك",
      }),
  },
  alertLastRunFailed: "آخر فحص فشل",
  alertNotConfigured: "المطابقة غير مهيّأة",

  sectionPicker: "القسم",
  needsYou: {
    title: "يحتاجك الحين",
    claims: (n) =>
      arCount(n, {
        zero: "ما فيه طلبات جاهزة لقرارك",
        one: "طلب واحد جاهز لقرارك",
        two: "طلبين جاهزين لقرارك",
        few: "طلبات جاهزة لقرارك",
        many: "طلبًا جاهزًا لقرارك",
      }),
    matches: (n) =>
      arCount(n, {
        zero: "ما فيه احتمالات تطابق للمراجعة",
        one: "احتمال تطابق واحد للمراجعة",
        two: "احتمالين تطابق للمراجعة",
        few: "احتمالات تطابق للمراجعة",
        many: "احتمال تطابق للمراجعة",
      }),
    candidates: (n) =>
      arCount(n, {
        zero: "ما فيه أزواج مرشّحة",
        one: "زوج مرشّح واحد يحتاج نظرة",
        two: "زوجين مرشّحين يحتاجان نظرة",
        few: "أزواج مرشّحة تحتاج نظرة",
        many: "زوجًا مرشّحًا يحتاج نظرة",
      }),
    retries: (n) =>
      arCount(n, {
        zero: "ما فيه تقييمات تحتاج إعادة",
        one: "تقييم ذكاء اصطناعي واحد يحتاج إعادة",
        two: "تقييمين يحتاجان إعادة",
        few: "تقييمات تحتاج إعادة",
        many: "تقييمًا يحتاج إعادة",
      }),
    owners: (n) =>
      arCount(n, {
        zero: "ما فيه طلبات تنتظر صاحب الغرض",
        one: "طلب واحد ينتظر صاحب الغرض",
        two: "طلبين ينتظران صاحب الغرض",
        few: "طلبات تنتظر صاحب الغرض",
        many: "طلبًا ينتظر صاحب الغرض",
      }),
    nothing: "ما فيه شي يحتاجك الحين. الشغل الجديد يظهر هنا.",
  },
  openNextClaim: "افتح الطلب التالي",

  intro: {
    matches: (n) =>
      n === 0
        ? "ما فيه شي يحتاج مراجعة. الذكاء الاصطناعي يرتّب أزواج البلاغات اللي يمكن تصف نفس الغرض، وما يثبت الملكية."
        : `${arCount(n, {
            zero: "",
            one: "اقتراح واحد يحتاج",
            two: "اقتراحين يحتاجان",
            few: "اقتراحات تحتاج",
            many: "اقتراحًا يحتاج",
          })} مراجعة. الذكاء الاصطناعي يرتّب أزواج البلاغات اللي يمكن تصف نفس الغرض، وما يثبت الملكية.`,
    matchesError:
      "الذكاء الاصطناعي يرتّب أزواج البلاغات اللي يمكن تصف نفس الغرض، وما يثبت الملكية.",
    candidates: (n) =>
      n === 0
        ? "ما فيه أزواج تحتاج نظرة. أزواج معقولة ما قدر الذكاء الاصطناعي يؤكدها، وقد تظهر هنا حتى لو كانت الدرجة منخفضة."
        : `${arCount(n, {
            zero: "",
            one: "زوج واحد يحتاج",
            two: "زوجين يحتاجان",
            few: "أزواج تحتاج",
            many: "زوجًا يحتاج",
          })} نظرة. أزواج معقولة ما قدر الذكاء الاصطناعي يؤكدها، وقد تظهر هنا حتى لو كانت الدرجة منخفضة.`,
    candidatesError:
      "أزواج معقولة ما قدر الذكاء الاصطناعي يؤكدها، وقد تظهر هنا حتى لو كانت الدرجة منخفضة.",
    claims: (ready, waiting) => {
      if (ready === 0 && waiting === 0) {
        return "ما فيه طلب ينتظر. صاحب الغرض يجاوب على أسئلة خاصة من رابطه، والموظف يتخذ كل قرار.";
      }
      const parts = [];
      if (ready > 0) {
        parts.push(
          arCount(ready, {
            zero: "",
            one: "طلب واحد جاهز لقرارك",
            two: "طلبين جاهزين لقرارك",
            few: "طلبات جاهزة لقرارك",
            many: "طلبًا جاهزًا لقرارك",
          }),
        );
      }
      if (waiting > 0) {
        parts.push(
          arCount(waiting, {
            zero: "",
            one: "طلب واحد ينتظر صاحب الغرض",
            two: "طلبين ينتظران صاحب الغرض",
            few: "طلبات تنتظر صاحب الغرض",
            many: "طلبًا ينتظر صاحب الغرض",
          }),
        );
      }
      return `${parts.join("، و")}. الموظف يتخذ كل قرار.`;
    },
    claimsError: "صاحب الغرض يجاوب على أسئلة خاصة من رابطه، والموظف يتخذ كل قرار.",
    reports: (n, filter) => {
      const forms =
        filter === "all"
          ? { zero: "ما فيه بلاغات", one: "بلاغ واحد", two: "بلاغين", few: "بلاغات", many: "بلاغًا" }
          : filter === "lost"
            ? {
                zero: "ما فيه بلاغات عن مفقودات",
                one: "بلاغ مفقود واحد",
                two: "بلاغين عن مفقودات",
                few: "بلاغات عن مفقودات",
                many: "بلاغًا عن مفقودات",
              }
            : {
                zero: "ما فيه بلاغات عن أغراض لُقيت",
                one: "بلاغ واحد عن غرض لُقي",
                two: "بلاغين عن أغراض لُقيت",
                few: "بلاغات عن أغراض لُقيت",
                many: "بلاغًا عن أغراض لُقيت",
              };
      return `${arCount(n, forms)}، الأحدث أولًا.`;
    },
    reportsError: "كل البلاغات المحفوظة، الأحدث أولًا.",
    monitoring:
      "هل المطابقة مهيّأة وتشتغل، وما الباقي للفحص، وأي طلبات تحتاج الموظف. أعداد وأوقات فقط.",
  },

  errorMatches: "ما قدرنا نحمّل احتمالات التطابق. حاول مرة ثانية.",
  errorCandidates: "ما قدرنا نحمّل المرشّحات. حاول مرة ثانية.",
  errorClaims: "ما قدرنا نحمّل طلبات الاستلام. حاول مرة ثانية.",
  errorClaimsNotSetUp:
    "التحقق من الملكية غير مُفعّل بعد. طبّق ترحيل ownership_verification ثم حدّث الصفحة.",
  errorReports: "ما قدرنا نحمّل البلاغات. حاول مرة ثانية.",
  errorMonitoring: "ما قدرنا نحمّل معلومات المراقبة. حاول مرة ثانية.",

  kindLost: "مفقود",
  kindFound: "ملقى",
  foundPrivate: "ملقى (خاص)",
  reportUnavailable: "البلاغ غير متاح",
  location: "المكان",
  showDetails: "التفاصيل",
  hideDetails: "إخفاء التفاصيل",
  aiSimilarity: "درجة التشابه",
  notScored: "بدون درجة",
  outOf100: "/100",
  scoreHelp: "للترتيب فقط، ما هي دليل.",
  suggestedAt: (date, model) => `اقتُرح ${date} · ${model}`,
  savedAt: (date) => `حُفظ ${date}`,

  needsReview: "يحتاج مراجعة",
  reviewedGroup: (n) => `تمت مراجعته (${n})`,
  uncertainGroup: (n) => `الذكاء الاصطناعي: التفاصيل ما تكفي (${n})`,
  uncertainHelp:
    "قد يصف البلاغان نفس الغرض، لكن التفاصيل عامة أو قليلة. الأزواج اللي لها نفس نوع الغرض ودليل مشترك حقيقي تجدها في «مرشّحات محتملة».",
  emptyMatchesTitle: "ما فيه شي يحتاج مراجعة",
  emptyMatches: "الاقتراحات الجديدة تظهر هنا بعد الفحص. شغّل فحصًا من لوحة المطابقة عند وصول بلاغات جديدة.",
  contradictionsChip: (n) =>
    arCount(n, {
      zero: "",
      one: "اختلاف واحد مسجّل",
      two: "اختلافان مسجّلان",
      few: "اختلافات مسجّلة",
      many: "اختلافًا مسجّلًا",
    }),
  reportsCompared: "البلاغان",
  whatTheAiSaw: "ما قارنه الذكاء الاصطناعي",
  sharedClues: "أدلة مشتركة",
  differences: "اختلافات",
  unknowns: "غير معروف",
  emptyShared: "ما فيه تفصيل متفق عليه في البلاغين.",
  emptyDifferences: "ما سُجّل أي تعارض.",
  emptyUnknowns: "ما بقي شي غير معروف.",
  notRecorded:
    "الأدلة المشتركة والاختلافات وغير المعروف ما سُجّلت لهذا الاقتراح (حُفظ قبل أن تُجمع).",
  aiSummary: "ملخص الذكاء الاصطناعي",
  matchingPanel: "المطابقة",
  matchingHelp: "الأزواج غير المفحوصة والفحوصات السابقة والأعطال تجدها في «المراقبة».",

  verificationTitle: "التحقق من الملكية",
  verificationNotStarted:
    "لم يبدأ. الأسئلة تُجهَّز عندما يفتح صاحب الغرض رابط المتابعة. الموظف ما يقدر يبدأ هذه الخطوة؛ تعليم الزوج «يستاهل مراجعة ملكية» يحفظ ملاحظة فقط.",
  verificationElsewhere:
    "الأسئلة جُهّزت لاقتراح آخر لنفس بلاغ المفقود. كل بلاغ مفقود له تحقق واحد فقط.",
  verificationNoQuestions: "ما فيه تفصيل خاص مفيد نسأل عنه. الموظف يراجع الطلب مباشرة.",
  goToClaim: "افتح الطلب",
  staffDecideNote: "الموظف يقرر دائمًا. درجة أو تقييم الذكاء الاصطناعي ما يثبت الملكية.",

  readyGroup: "جاهز لقرارك",
  waitingGroup: "بانتظار صاحب الغرض",
  decidedGroup: "تم القرار",
  emptyClaimsTitle: "ما فيه طلبات استلام بعد",
  emptyClaims:
    "الطلب يبدأ عندما يفتح صاحب الغرض رابط المتابعة بعد احتمال تطابق ويجاوب على الأسئلة.",
  emptyReadyTitle: "ما فيه شي جاهز للقرار",
  emptyReady: "الطلبات تظهر هنا بعد أن يجاوب صاحب الغرض على كل الأسئلة.",
  waitingOn: "بانتظار",
  waitingOwner: (answered, total) => `صاحب الغرض (جاوب على ${answered} من ${total})`,
  waitingOwnerFollowup: "صاحب الغرض (سؤال المتابعة)",
  waitingStaff: "الموظف",
  waitingNobody: "لا أحد؛ تم القرار",
  status: {
    staffReviewRequired: "يحتاج مراجعة الموظف",
    awaitingAnswer: (answered, total) => `بانتظار الجواب (${answered}/${total})`,
    awaitingFollowup: "بانتظار جواب المتابعة",
    readyForDecision: "جاهز للقرار",
    pendingReview: "بانتظار مراجعة الموظف",
    noQuestions: "ما يحتاج أسئلة",
    answersReceived: "وصلت الأجوبة",
    followupAnswered: "تمت الإجابة على المتابعة",
    assessmentMissing: "تقييم الذكاء الاصطناعي يحتاج إعادة",
  },
  decision: {
    approved: "مقبول لمتابعة الاستلام",
    rejected: "مرفوض",
    pending_review: "أُعيد إلى قيد المراجعة",
  },
  assessment: {
    supports: "الأجوبة تدعم الطلب",
    unclear: "الأجوبة غير واضحة",
    conflicts: "الأجوبة تتعارض مع بلاغ الملقى",
  },
  questionsAndAnswers: "الأسئلة والأجوبة وتقييم الذكاء الاصطناعي",
  aiSuggests: (assessment) => `اقتراح الذكاء الاصطناعي: ${assessment}`,
  recentlyDecidedGroup: "قرارات للتو",
  recentlyDecidedHelp: "قرارات آخر 30 دقيقة تبقى هنا عشان تراجعها أو ترجعها.",
  olderDecidedGroup: (n) => `قرارات سابقة (${n})`,
  openClaim: "افتح الطلب وقرّر",
  changeDecision: "غيّر هذا القرار",
  nextDecision: "القرار التالي",
  question: (n) => `السؤال ${n}`,
  ownerAnswer: "جواب صاحب الغرض",
  awaitingAnswer: "بانتظار الجواب",
  expectedPrivate: "المتوقع (للموظف فقط)",
  expectedHelp: "مأخوذ من بلاغ الملقى. صاحب الغرض ما يشوفه أبدًا.",
  aiAssessment: "تقييم الذكاء الاصطناعي",
  recommendationOnly: "توصية فقط",
  assessmentFooter: (date, model) => `${date} · ${model}. التقييم ما يقبل ولا يرفض أي طلب.`,
  assessmentDidNotFinish:
    "تقييم الذكاء الاصطناعي ما اكتمل. أجوبة صاحب الغرض محفوظة. هذا ما يعني «ما فيه تطابق».",
  assessmentRunsAfter: "تقييم الذكاء الاصطناعي يشتغل بعد أن يجاوب صاحب الغرض على كل الأسئلة.",
  questionsPrepared: (date, model) => `جُهّزت الأسئلة ${date} · ${model}`,
  otherSuggestions: (n) => `اقتراحات أخرى لهذا البلاغ (${n})`,
  noOtherSuggestions: "ما فيه اقتراحات أخرى لهذا البلاغ.",
  aiPossibleMatch: "الذكاء الاصطناعي: احتمال تطابق",
  aiNotEnough: "الذكاء الاصطناعي: التفاصيل ما تكفي",
  staffDecision: "قرار الموظف",
  decisionNote: "ملاحظة",
  approvalNoReturn: "القبول ما يرجّع الغرض تلقائيًا. الموظف يكمل التسليم حضوريًا.",
  decisionHistory: (n) => `سجل القرارات (${n})`,
  followupTitle: "سؤال المتابعة",
  followupAwaiting: "بانتظار الجواب",
  followupAnswered: "تمت الإجابة",
  followupOwnerSees: "صاحب الغرض يشوف هذا السؤال في صفحة المتابعة. تقدر تقرر بدون انتظار الجواب.",
  followupAsked: (date) => `سُئل ${date} · يُسمح بسؤال متابعة واحد فقط لكل طلب.`,
  followupNotSetUp: "أسئلة المتابعة غير مُفعّلة بعد. طبّق ترحيل ownership_followups ثم حدّث الصفحة.",
  privacyNote: "صاحب الغرض ما يشوف بلاغ الملقى ولا الأجوبة المتوقعة ولا الدرجة ولا تقييم الذكاء الاصطناعي.",

  filterLabel: "تصفية البلاغات",
  filter: {
    all: "الكل",
    lost: "مفقود",
    found: "ملقى",
  },
  columns: {
    item: "الغرض",
    type: "النوع",
    description: "الوصف",
    location: "المكان",
    saved: "تاريخ الحفظ",
  },
  reportsRegion: "البلاغات المحفوظة",
  reportsCaption: "البلاغات المحفوظة، الأحدث أولًا",
  emptyReportsTitle: "ما فيه بلاغات بعد",
  emptyReports: "البلاغات تظهر هنا أول ما يحفظ أحد بلاغًا.",
  emptyFilteredTitle: (filter) => (filter === "lost" ? "ما فيه بلاغات عن مفقودات" : "ما فيه بلاغات عن أغراض لُقيت"),
  emptyFiltered: "جرّب التصفية الثانية، أو اعرض كل البلاغات.",
  showAll: "اعرض كل البلاغات",
};

export type AdminMessages = typeof en;
export const admin: Catalogue<typeof en> = { en, ar };
