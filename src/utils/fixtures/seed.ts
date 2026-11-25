import { createHash } from "node:crypto";
import { TABLE_ORDER, type Row, type TableName } from "@/utils/db/local";
import { FIXTURE_MODEL } from "@/utils/fixtures/mode";
import { manualCandidateInsert } from "@/utils/matching/candidates";

// Fictional campus lost-and-found data for development fixture mode. Every
// name, description, place, and answer here is invented. Times are relative to
// when the dev server first uses the data, spread over the last two weeks.

/** Builds an obviously fake 43-character submission credential. */
function credential(slug: string) {
  const base = `fixture-${slug}-`;
  return base + "0".repeat(43 - base.length);
}

/**
 * Private tracking credentials, documented in docs/local-fixtures.md.
 * Open http://localhost:3100/report/track#<credential>.
 */
export const FIXTURE_CREDENTIALS = {
  // (a) Just submitted: matching has not run yet. The page checks for a few seconds.
  checking: credential("lost-a-checking"),
  // (b) Every pair checked, nothing similar.
  noMatch: credential("lost-b-no-match"),
  // (c) Possible match; two ownership questions waiting.
  questions: credential("lost-c-questions"),
  // (c2) Possible match; questions are prepared (by the fake Gemini) on first visit.
  newMatch: credential("lost-c2-new-match"),
  // (d) Answers sent; waiting for staff.
  answersSent: credential("lost-d-answers-sent"),
  // (e) Staff asked a follow-up question that is waiting for an answer.
  followup: credential("lost-e-followup"),
  // (f) Staff approved the claim.
  approved: credential("lost-f-approved"),
  // (g) Staff rejected the claim.
  rejected: credential("lost-g-rejected"),
  // A found report. The tracking page is for lost reports, so it says the link does not work.
  found: credential("found-h-umbrella"),
} as const;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** Fixed, valid v4-shaped UUIDs so fixture rows are easy to recognise. */
function fid(group: number, n: number) {
  return `00000000-0000-4000-8000-${String(group * 1000 + n).padStart(12, "0")}`;
}

type ReportSeed = {
  key: string;
  type: "lost" | "found";
  item: string;
  description: string;
  location: string;
  // Hours before seeding.
  hoursAgo: number;
  credential?: string;
};

const LONG_SCARF_DESCRIPTION = [
  "A long grey wool scarf, roughly two metres, hand-knitted in a ribbed pattern by my grandmother.",
  "Both ends have hand-stitched tassels, and near one end there is a small embroidered olive branch in dark green thread, about the size of a thumb.",
  "One of the tassels on the other end is shorter than the rest because it came loose last winter and I tied it back myself with a slightly darker grey yarn.",
  "There is a faint coffee stain close to the middle that did not wash out completely.",
  "I wore it to the statistics lecture on Sunday and I think I left it on the back of my seat in the last rows when I rushed out to catch the bus;",
  "I came back about an hour later and it was gone.",
  "It is not expensive, but it means a lot to me because it was a gift, so I would be very grateful if anyone has seen it.",
  "I can describe the pattern, the embroidery, and the repaired tassel in more detail if needed, and I am happy to come to the lost-and-found desk any weekday after 2 pm.",
  "If it was handed to security instead, please let me know which office to visit.",
].join(" ");

const REPORTS: ReportSeed[] = [
  // Lost reports
  {
    key: "L1",
    type: "lost",
    item: "مظلة سوداء قابلة للطي",
    description: "مظلة سوداء صغيرة قابلة للطي، مقبضها بلاستيك. نسيتها بعد المطر عند مدخل المبنى.",
    location: "مبنى 3 — المدخل الشمالي",
    hoursAgo: 2,
    credential: FIXTURE_CREDENTIALS.checking,
  },
  {
    key: "L2",
    type: "lost",
    item: "Casio scientific calculator",
    description: "Grey Casio fx-991ES calculator. My name is written on the back cover in marker.",
    location: "Engineering building, lab 2",
    hoursAgo: 6 * 24 + 3,
    credential: FIXTURE_CREDENTIALS.noMatch,
  },
  {
    key: "L3",
    type: "lost",
    item: "مطارة ماء زرقاء عليها ملصق",
    description: "مطارة ماء معدنية زرقاء عليها ملصق، تركتها على الطاولة بعد المحاضرة.",
    location: "المكتبة المركزية — الدور الثاني",
    hoursAgo: 3 * 24 + 5,
    credential: FIXTURE_CREDENTIALS.questions,
  },
  {
    key: "L4",
    type: "lost",
    item: "AirPods Pro case",
    description: "White AirPods Pro charging case, lost after the morning lecture. The lid has a small crack.",
    location: "Building 6, Hall 104",
    hoursAgo: 5 * 24 + 2,
    credential: FIXTURE_CREDENTIALS.answersSent,
  },
  {
    key: "L5",
    type: "lost",
    item: "سلسلة مفاتيح فيها مفتاح سيارة",
    description: "سلسلة مفاتيح فيها مفتاح سيارة ومفتاحين صغار للبيت. ضاعت مني في مواقف السيارات.",
    location: "مواقف الطلاب — البوابة 2",
    hoursAgo: 8 * 24 + 4,
    credential: FIXTURE_CREDENTIALS.followup,
  },
  {
    key: "L6",
    type: "lost",
    item: "Black backpack",
    description:
      "Black backpack with a laptop sleeve, two notebooks and a pencil case inside. A small camel keychain hangs on the zipper.",
    location: "Student center, ground floor",
    hoursAgo: 12 * 24 + 6,
    credential: FIXTURE_CREDENTIALS.approved,
  },
  {
    key: "L7",
    type: "lost",
    item: "ساعة يد فضية",
    description: "ساعة يد فضية بسوار معدني، على ظهرها تاريخ محفور.",
    location: "الصالة الرياضية — غرف الملابس",
    hoursAgo: 9 * 24 + 1,
    credential: FIXTURE_CREDENTIALS.rejected,
  },
  {
    key: "L8",
    type: "lost",
    item: "Spiral notebook",
    description: "A5 spiral notebook with a green cover, full of chemistry notes. My name is on the first page.",
    location: "Chemistry building, lab 3",
    hoursAgo: 11 * 24 + 2,
  },
  {
    key: "L9",
    type: "lost",
    item: "حامل بطاقة جامعية",
    description: "حامل بطاقة شفاف بشريط أحمر، فيه بطاقتي الجامعية وبطاقة الصراف.",
    location: "الكافتيريا الرئيسية",
    hoursAgo: 4 * 24 + 3,
    credential: FIXTURE_CREDENTIALS.newMatch,
  },
  {
    key: "L10",
    type: "lost",
    item:
      "Grey wool scarf with hand-stitched tassels and a small embroidered olive branch near one end (a gift from my grandmother)",
    description: LONG_SCARF_DESCRIPTION,
    location: "Lecture hall B, back rows",
    hoursAgo: 7 * 24 + 5,
  },
  {
    key: "L11",
    type: "lost",
    item: "Laptop charger",
    description: "Dell 65W USB-C laptop charger with a white cable. There is a strip of blue tape on the plug.",
    location: "Computer lab 1",
    hoursAgo: 6 * 24 + 8,
  },
  {
    key: "L12",
    type: "lost",
    item: "نظارة طبية",
    description: "نظارة طبية بعدسات رقيقة داخل علبة.",
    location: "قاعة 12 — مبنى 4",
    hoursAgo: 2 * 24 + 4,
  },
  {
    key: "L13",
    type: "lost",
    item: "Navy jacket",
    description: "Navy zip-up jacket, size M, with a university logo on the chest.",
    location: "Sports hall entrance",
    hoursAgo: 26,
  },
  // Found reports
  {
    key: "F1",
    type: "found",
    item: "مطارة زرقاء",
    description: "مطارة معدنية زرقاء ماركة Hydro Flask، عليها ملصق ناسا، وخدش على الغطاء.",
    location: "المكتبة المركزية",
    hoursAgo: 3 * 24 + 2,
  },
  {
    key: "F2",
    type: "found",
    item: "AirPods case with initials",
    description:
      "White AirPods Pro case with the initials R.K. engraved on the front. Small crack on the lid. In a clear silicone cover.",
    location: "Building 6 corridor",
    hoursAgo: 4 * 24 + 20,
  },
  {
    key: "F3",
    type: "found",
    item: "مفاتيح سيارة مع ميدالية",
    description: "مفتاح سيارة تويوتا ومعه مفتاحان صغيران، في ميدالية جلد بنية عليها حرف M.",
    location: "مواقف الطلاب",
    hoursAgo: 8 * 24 + 1,
  },
  {
    key: "F4",
    type: "found",
    item: "Black JanSport backpack",
    description:
      "Black JanSport backpack. Inside: a laptop sleeve, two notebooks, a pencil case, and a parking permit card.",
    location: "Student center, prayer room shelf",
    hoursAgo: 12 * 24 + 1,
  },
  {
    key: "F5",
    type: "found",
    item: "ساعة كاسيو فضية",
    description: "ساعة كاسيو فضية بسوار معدني، على ظهرها نقش 2019 وخدوش على الزجاج.",
    location: "الصالة الرياضية",
    hoursAgo: 8 * 24 + 22,
  },
  {
    key: "F6",
    type: "found",
    item: "Green spiral notebook",
    description: "Green A5 spiral notebook with chemistry notes and a timetable taped inside the back cover.",
    location: "Chemistry building",
    hoursAgo: 10 * 24 + 20,
  },
  {
    key: "F7",
    type: "found",
    item: "ID card holder with red lanyard",
    description:
      "Clear card holder on a red lanyard with a university ID and a bank card. The lanyard has a small enamel pin of a falcon.",
    location: "Main cafeteria",
    hoursAgo: 4 * 24,
  },
  {
    key: "F8",
    type: "found",
    item: "Grey scarf",
    description: "Grey knitted scarf with tassels, found folded on a chair.",
    location: "Lecture hall B",
    hoursAgo: 6 * 24 + 22,
  },
  {
    key: "F9",
    type: "found",
    item: "USB-C laptop charger",
    description: "Dell 65W USB-C charger with blue tape on the plug. The cable is slightly frayed near the brick.",
    location: "Computer lab 1",
    hoursAgo: 6 * 24 + 1,
  },
  {
    key: "F10",
    type: "found",
    item: "نظارة طبية بإطار أسود",
    description: "نظارة طبية بإطار أسود داخل علبة زرقاء.",
    location: "مبنى 4",
    hoursAgo: 2 * 24 + 1,
  },
  {
    key: "F11",
    type: "found",
    item: "Blue hoodie",
    description: "Dark blue hoodie with a logo on the chest, size M.",
    location: "Sports hall",
    hoursAgo: 22,
  },
  {
    key: "F12",
    type: "found",
    item: "Black backpack",
    description: "Plain black Adidas backpack with a water bottle in the side pocket.",
    location: "Bus stop by gate 1",
    hoursAgo: 10 * 24 + 3,
  },
  {
    key: "F13",
    type: "found",
    item: "مظلة سوداء",
    description: "مظلة سوداء كبيرة بمقبض خشبي منحني، وجدتها معلقة على الدرج.",
    location: "مبنى 3 — الدرج الشمالي",
    hoursAgo: 1,
    credential: FIXTURE_CREDENTIALS.found,
  },
];

type MatchSeed = {
  n: number;
  lost: string;
  found: string;
  decision: "match" | "insufficient_information";
  score: number;
  explanation: string;
  supporting: string[];
  contradictions?: string[];
  missing?: string[];
  // Hours after the newer report.
  afterHours?: number;
};

const MATCHES: MatchSeed[] = [
  {
    n: 1,
    lost: "L3",
    found: "F1",
    decision: "match",
    score: 88,
    explanation: "كلا البلاغين يصفان مطارة معدنية زرقاء عليها ملصق، في المكتبة المركزية، دون أي تعارض.",
    supporting: ["مطارة معدنية زرقاء", "عليها ملصق"],
    missing: ["بلاغ العثور فقط يذكر الماركة", "بلاغ العثور فقط يذكر خدشاً على الغطاء"],
  },
  {
    n: 2,
    lost: "L4",
    found: "F2",
    decision: "match",
    score: 81,
    explanation: "Both describe a white AirPods Pro case with a small crack on the lid.",
    supporting: ["White AirPods Pro case", "Small crack on the lid"],
    missing: ["Only the found report mentions engraved initials", "Only the found report mentions a silicone cover"],
  },
  {
    n: 3,
    lost: "L5",
    found: "F3",
    decision: "match",
    score: 74,
    explanation: "البلاغان يذكران مفتاح سيارة مع مفتاحين صغيرين في مواقف الطلاب.",
    supporting: ["مفتاح سيارة", "مفتاحان صغيران"],
    missing: ["بلاغ العثور فقط يذكر نوع السيارة", "بلاغ العثور فقط يذكر الميدالية"],
  },
  {
    n: 4,
    lost: "L6",
    found: "F4",
    decision: "match",
    score: 69,
    explanation: "Both describe a black backpack with a laptop sleeve, two notebooks, and a pencil case.",
    supporting: ["Laptop sleeve", "Two notebooks", "Pencil case"],
    missing: ["Only the found report names a brand", "Only the lost report mentions a camel keychain"],
  },
  {
    n: 5,
    lost: "L7",
    found: "F5",
    decision: "match",
    score: 77,
    explanation: "البلاغان يصفان ساعة يد فضية بسوار معدني وعلى ظهرها كتابة.",
    supporting: ["ساعة فضية بسوار معدني", "كتابة على ظهر الساعة"],
    missing: ["بلاغ العثور فقط يذكر الماركة"],
  },
  {
    n: 6,
    lost: "L8",
    found: "F6",
    decision: "match",
    score: 63,
    explanation: "Both describe a green A5 spiral notebook with chemistry notes.",
    supporting: ["Green A5 spiral notebook", "Chemistry notes"],
    missing: ["Only the found report mentions a taped timetable", "Only the lost report mentions a name"],
  },
  {
    n: 7,
    lost: "L9",
    found: "F7",
    decision: "match",
    score: 85,
    explanation: "يصف البلاغان حامل بطاقة شفافاً بشريط أحمر فيه بطاقة جامعية وبطاقة بنكية.",
    supporting: ["حامل بطاقة شفاف", "شريط أحمر", "بطاقة جامعية وبطاقة بنكية"],
    missing: ["بلاغ العثور فقط يذكر دبوساً على الشريط"],
  },
  {
    n: 8,
    lost: "L10",
    found: "F8",
    decision: "insufficient_information",
    score: 42,
    explanation: "Both mention a grey scarf with tassels, but tassels are common and the embroidery is not mentioned by the finder.",
    supporting: ["Grey scarf", "Tassels"],
    missing: ["Only the lost report mentions an embroidered olive branch", "Only the lost report mentions a repaired tassel"],
  },
  {
    n: 9,
    lost: "L11",
    found: "F9",
    decision: "match",
    score: 72,
    explanation: "Both describe a Dell 65W USB-C charger with blue tape on the plug.",
    supporting: ["Dell 65W USB-C charger", "Blue tape on the plug"],
    missing: ["Only the found report mentions a frayed cable"],
  },
  {
    n: 10,
    lost: "L12",
    found: "F10",
    decision: "match",
    score: 66,
    explanation: "البلاغان يصفان نظارة طبية داخل علبة في مبنى 4.",
    supporting: ["نظارة طبية داخل علبة"],
    missing: ["بلاغ العثور فقط يذكر لون الإطار ولون العلبة"],
  },
  {
    n: 11,
    lost: "L6",
    found: "F12",
    decision: "insufficient_information",
    score: 38,
    explanation: "Both are black backpacks, but nothing more specific is shared.",
    supporting: ["Black backpack"],
    missing: ["Only the found report names a brand", "Only the lost report lists the contents"],
  },
];

// Pairs left unchecked so the checking state and "Check new reports" have work.
const UNCHECKED = new Set([
  ...REPORTS.filter((report) => report.type === "found").map((report) => `L1:${report.key}`),
  "L12:F13",
  "L13:F12",
  "L13:F13",
]);

type VerificationSeed = {
  n: number;
  lost: string;
  match: number;
  hoursAgo: number;
  questions: string[];
  expected: string[];
  answers?: { text: string; hoursAgo: number }[];
  assessment?: { value: "supports" | "unclear" | "conflicts"; explanation: string; hoursAgo: number };
  followup?: { question: string; hoursAgo: number; answer?: { text: string; hoursAgo: number } };
  decisions?: { decision: "approved" | "rejected" | "pending_review"; note: string | null; hoursAgo: number }[];
};

const VERIFICATIONS: VerificationSeed[] = [
  // (c) Questions waiting for the owner.
  {
    n: 3,
    lost: "L3",
    match: 1,
    hoursAgo: 30,
    questions: [
      "ما الشركة المصنّعة أو العلامة التجارية للمطارة؟",
      "هل فيها أي أثر استعمال أو تلف تتذكره؟ صِفه.",
    ],
    expected: ["ماركة Hydro Flask", "خدش على الغطاء"],
  },
  // (d) Answered, AI supports, waiting for staff.
  {
    n: 4,
    lost: "L4",
    match: 2,
    hoursAgo: 4 * 24,
    questions: [
      "Does it have any writing, engraving, or personal markings? Please describe them.",
      "Is it kept inside anything that protects it? Please describe it.",
    ],
    expected: ["The initials R.K. engraved on the front", "In a clear silicone cover"],
    answers: [
      { text: "My initials, R.K., are engraved on the front.", hoursAgo: 3 * 24 + 20 },
      { text: "It is in a clear silicone cover.", hoursAgo: 3 * 24 + 19 },
    ],
    assessment: {
      value: "supports",
      explanation: "Answer 1 names the engraved initials. Answer 2 describes the clear silicone cover. Both agree with the found report.",
      hoursAgo: 3 * 24 + 19,
    },
  },
  // (e) Unclear answers; staff follow-up waiting for the owner.
  {
    n: 5,
    lost: "L5",
    match: 3,
    hoursAgo: 7 * 24,
    questions: ["ما نوع السيارة التي يفتحها المفتاح؟", "هل في السلسلة شيء مميز غير المفاتيح؟ صِفه."],
    expected: ["مفتاح سيارة تويوتا", "ميدالية جلد بنية عليها حرف M"],
    answers: [
      { text: "ما أتذكر بالضبط، السيارة لأهلي.", hoursAgo: 6 * 24 + 22 },
      { text: "فيها ميدالية.", hoursAgo: 6 * 24 + 21 },
    ],
    assessment: {
      value: "unclear",
      explanation: "Answer 1 does not name the car make. Answer 2 mentions a keychain but gives no material, colour, or letter.",
      hoursAgo: 6 * 24 + 21,
    },
    followup: { question: "ما لون الميدالية، وما المكتوب عليها؟", hoursAgo: 5 * 24 },
  },
  // (f) Approved.
  {
    n: 6,
    lost: "L6",
    match: 4,
    hoursAgo: 11 * 24,
    questions: [
      "Which brand is the backpack?",
      "Apart from the notebooks and the laptop sleeve, is there anything else inside? Please describe it.",
    ],
    expected: ["JanSport", "A parking permit card"],
    answers: [
      { text: "It's a JanSport.", hoursAgo: 10 * 24 + 20 },
      { text: "My parking permit card is in the front pocket.", hoursAgo: 10 * 24 + 19 },
    ],
    assessment: {
      value: "supports",
      explanation: "Answer 1 names the brand. Answer 2 names the parking permit card. Both agree with the found report.",
      hoursAgo: 10 * 24 + 19,
    },
    decisions: [
      { decision: "approved", note: "Student ID checked at the desk. Backpack handed over.", hoursAgo: 9 * 24 },
    ],
  },
  // (g) Conflicting answers; rejected.
  {
    n: 7,
    lost: "L7",
    match: 5,
    hoursAgo: 8 * 24,
    questions: ["ما الشركة المصنّعة للساعة؟", "ماذا يوجد على ظهر الساعة بالضبط؟"],
    expected: ["ساعة كاسيو", "نقش 2019"],
    answers: [
      { text: "سيكو", hoursAgo: 7 * 24 + 20 },
      { text: "اسمي محفور على الظهر.", hoursAgo: 7 * 24 + 19 },
    ],
    assessment: {
      value: "conflicts",
      explanation: "Answer 1 names a different brand. Answer 2 describes a name, not the engraved year.",
      hoursAgo: 7 * 24 + 19,
    },
    decisions: [
      { decision: "rejected", note: "Brand and engraving do not match the found watch.", hoursAgo: 6 * 24 },
    ],
  },
  // Follow-up answered; approved, then reset to pending review.
  {
    n: 8,
    lost: "L8",
    match: 6,
    hoursAgo: 10 * 24,
    questions: ["Is there anything attached inside the notebook? Please describe it."],
    expected: ["A timetable taped inside the back cover"],
    answers: [{ text: "My class schedule is stuck in it somewhere.", hoursAgo: 9 * 24 + 20 }],
    assessment: {
      value: "unclear",
      explanation: "Answer 1 mentions a schedule but not where it is or how it is attached.",
      hoursAgo: 9 * 24 + 20,
    },
    followup: {
      question: "Where exactly in the notebook is the schedule, and how is it attached?",
      hoursAgo: 9 * 24,
      answer: { text: "Taped inside the back cover with clear tape.", hoursAgo: 8 * 24 + 18 },
    },
    decisions: [
      { decision: "approved", note: null, hoursAgo: 3 * 24 },
      {
        decision: "pending_review",
        note: "Reset: the owner has not shown a student ID yet.",
        hoursAgo: 2 * 24,
      },
    ],
  },
  // All answers in, AI assessment missing (staff can retry it).
  {
    n: 11,
    lost: "L11",
    match: 9,
    hoursAgo: 5 * 24,
    questions: ["Is there any wear or damage you remember? Please describe it."],
    expected: ["The cable is slightly frayed near the brick"],
    answers: [{ text: "The cable is a bit frayed close to the power brick.", hoursAgo: 4 * 24 + 20 }],
  },
  // No useful private detail: staff review without questions.
  {
    n: 12,
    lost: "L12",
    match: 10,
    hoursAgo: 30,
    questions: [],
    expected: [],
  },
];

type RunSeed = {
  hoursAgo: number;
  source: "auto" | "admin";
  checked: number;
  matched?: number;
  uncertain?: number;
  failure?: "quota" | "timeout" | "api" | "usage_limit" | "invalid_response";
  remaining?: number;
  durationMs: number;
  requests?: number;
};

const RUNS: RunSeed[] = [
  { hoursAgo: 13 * 24 + 5, source: "auto", checked: 6, durationMs: 1840 },
  { hoursAgo: 12 * 24 + 6, source: "auto", checked: 9, matched: 1, uncertain: 1, durationMs: 2310 },
  { hoursAgo: 12 * 24 + 1, source: "admin", checked: 4, durationMs: 5120, requests: 4 },
  { hoursAgo: 11 * 24 + 2, source: "auto", checked: 10, matched: 1, durationMs: 2620 },
  { hoursAgo: 10 * 24 + 20, source: "auto", checked: 11, durationMs: 2480 },
  { hoursAgo: 10 * 24 + 3, source: "auto", checked: 0, failure: "quota", remaining: 12, durationMs: 940 },
  { hoursAgo: 10 * 24 + 2, source: "auto", checked: 12, uncertain: 1, durationMs: 2750 },
  { hoursAgo: 9 * 24 + 1, source: "auto", checked: 11, matched: 1, durationMs: 2390 },
  { hoursAgo: 8 * 24 + 22, source: "auto", checked: 12, matched: 1, durationMs: 2900 },
  { hoursAgo: 8 * 24 + 1, source: "auto", checked: 12, durationMs: 2210 },
  { hoursAgo: 7 * 24 + 5, source: "auto", checked: 0, failure: "timeout", remaining: 12, durationMs: 30_400 },
  { hoursAgo: 7 * 24 + 4, source: "admin", checked: 4, uncertain: 1, durationMs: 6010, requests: 4 },
  { hoursAgo: 6 * 24 + 22, source: "auto", checked: 12, uncertain: 1, durationMs: 2580 },
  { hoursAgo: 6 * 24 + 8, source: "auto", checked: 12, durationMs: 2440 },
  { hoursAgo: 6 * 24 + 1, source: "auto", checked: 12, matched: 1, durationMs: 2700 },
  { hoursAgo: 5 * 24 + 2, source: "auto", checked: 12, matched: 1, durationMs: 2530 },
  { hoursAgo: 4 * 24 + 20, source: "auto", checked: 12, durationMs: 2350 },
  { hoursAgo: 4 * 24 + 3, source: "auto", checked: 0, failure: "usage_limit", remaining: 12, durationMs: 120 },
  { hoursAgo: 4 * 24, source: "auto", checked: 12, matched: 1, durationMs: 2610 },
  { hoursAgo: 3 * 24 + 5, source: "admin", checked: 4, durationMs: 4870, requests: 4 },
  { hoursAgo: 3 * 24 + 2, source: "auto", checked: 13, matched: 1, durationMs: 2820 },
  { hoursAgo: 2 * 24 + 4, source: "auto", checked: 0, failure: "api", remaining: 13, durationMs: 2050 },
  { hoursAgo: 2 * 24 + 1, source: "auto", checked: 12, matched: 1, durationMs: 2480 },
  { hoursAgo: 22, source: "auto", checked: 12, durationMs: 2390 },
];

const CANDIDATE_REVIEWS: {
  n: number;
  lost: string;
  found: string;
  action: "ownership_review" | "dismissed";
  note: string | null;
  hoursAgo: number;
}[] = [
  {
    n: 1,
    lost: "L10",
    found: "F8",
    action: "ownership_review",
    note: "Owner mentions tassels; ask about the embroidery before a handover.",
    hoursAgo: 5 * 24,
  },
  {
    n: 2,
    lost: "L6",
    found: "F12",
    action: "dismissed",
    note: "Different brand; the owner's bag was found separately.",
    hoursAgo: 9 * 24 + 2,
  },
];

export type FixtureDb = { tables: Record<TableName, Row[]> };

function createEmptyDb(): FixtureDb {
  return {
    tables: Object.fromEntries(TABLE_ORDER.map((name) => [name, [] as Row[]])) as FixtureDb["tables"],
  };
}

/** Builds every fixture row, table by table. `now` anchors all relative times. */
export function seedFixtureDb(now = new Date()): FixtureDb {
  const db = createEmptyDb();
  const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3_600_000).toISOString();
  const later = (iso: string, hours: number) =>
    new Date(Math.min(Date.parse(iso) + hours * 3_600_000, now.getTime() - 60_000)).toISOString();
  const push = (table: TableName, row: Row) => db.tables[table].push(row);

  const reports = new Map<string, Row & { id: string; created_at: string }>();
  REPORTS.forEach((seed, index) => {
    const row = {
      id: fid(seed.type === "lost" ? 1 : 2, Number(seed.key.slice(1))),
      report_type: seed.type,
      item_name: seed.item,
      description: seed.description,
      location: seed.location,
      created_at: at(seed.hoursAgo),
    };
    reports.set(seed.key, row);
    push("reports", row);
    push("report_submissions", {
      report_id: row.id,
      token_hash: hash(seed.credential ?? `fixture-unpublished-${index}`),
      processing_until: null,
      created_at: row.created_at,
    });
  });
  const report = (key: string) => {
    const row = reports.get(key);
    if (!row) {
      throw new Error(`Unknown fixture report ${key}`);
    }
    return row;
  };
  const newer = (a: string, b: string) => (report(a).created_at > report(b).created_at ? a : b);

  const matchIds = new Map<number, string>();
  for (const seed of MATCHES) {
    const id = fid(3, seed.n);
    matchIds.set(seed.n, id);
    const createdAt = later(report(newer(seed.lost, seed.found)).created_at, seed.afterHours ?? 0.05);
    push("report_matches", {
      id,
      lost_report_id: report(seed.lost).id,
      lost_report_type: "lost",
      found_report_id: report(seed.found).id,
      found_report_type: "found",
      explanation: seed.explanation,
      model: FIXTURE_MODEL,
      created_at: createdAt,
      ai_decision: seed.decision,
      supporting_details: seed.supporting,
      contradictions: seed.contradictions ?? [],
      missing_information: seed.missing ?? [],
      status: "pending_review",
      ai_similarity_score: seed.score,
    });
  }

  // A pair staff added by hand, built the same way the admin action builds it.
  const manualLost = report("L13");
  const manualFound = report("F11");
  push("report_matches", {
    id: fid(3, 50),
    lost_report_id: manualLost.id,
    lost_report_type: "lost",
    found_report_id: manualFound.id,
    found_report_type: "found",
    created_at: later(manualLost.created_at, 3),
    status: "pending_review",
    ai_similarity_score: null,
    ...manualCandidateInsert(
      {
        item_name: manualLost.item_name as string,
        description: manualLost.description as string,
        location: manualLost.location as string,
      },
      {
        item_name: manualFound.item_name as string,
        description: manualFound.description as string,
        location: manualFound.location as string,
      },
      "Same size and a chest logo; the colour may be described differently.",
    ),
  });

  // Every completed comparison, including no_match, except the pairs left for checking.
  const savedPairs = new Map(MATCHES.map((seed) => [`${seed.lost}:${seed.found}`, seed.decision]));
  for (const lost of REPORTS.filter((seed) => seed.type === "lost")) {
    for (const found of REPORTS.filter((seed) => seed.type === "found")) {
      const key = `${lost.key}:${found.key}`;
      if (UNCHECKED.has(key) || key === "L13:F11") {
        continue;
      }
      push("report_pair_checks", {
        lost_report_id: report(lost.key).id,
        lost_report_type: "lost",
        found_report_id: report(found.key).id,
        found_report_type: "found",
        ai_decision: savedPairs.get(key) ?? "no_match",
        model: FIXTURE_MODEL,
        checked_at: later(report(newer(lost.key, found.key)).created_at, 0.05),
      });
    }
  }

  for (const seed of VERIFICATIONS) {
    const id = fid(4, seed.n);
    const lost = report(seed.lost);
    push("ownership_verifications", {
      id,
      lost_report_id: lost.id,
      report_match_id: matchIds.get(seed.match),
      match_ai_decision: "match",
      questions: seed.questions,
      expected_details: seed.expected,
      model: FIXTURE_MODEL,
      created_at: at(seed.hoursAgo),
    });
    seed.answers?.forEach((answer, index) =>
      push("ownership_answers", {
        verification_id: id,
        question_number: index + 1,
        answer: answer.text,
        created_at: at(answer.hoursAgo),
      }),
    );
    if (seed.assessment) {
      push("ownership_assessments", {
        verification_id: id,
        assessment: seed.assessment.value,
        explanation: seed.assessment.explanation,
        model: FIXTURE_MODEL,
        created_at: at(seed.assessment.hoursAgo),
      });
    }
    if (seed.followup) {
      push("ownership_followups", {
        verification_id: id,
        question: seed.followup.question,
        created_at: at(seed.followup.hoursAgo),
      });
      if (seed.followup.answer) {
        push("ownership_followup_answers", {
          verification_id: id,
          answer: seed.followup.answer.text,
          created_at: at(seed.followup.answer.hoursAgo),
        });
      }
    }
    let previous: { id: string; decision: string } | null = null;
    seed.decisions?.forEach((entry, index) => {
      const decisionId = fid(5, seed.n * 10 + index);
      push("ownership_decisions", {
        id: decisionId,
        verification_id: id,
        decision: entry.decision,
        note: entry.note,
        previous_decision_id: previous?.id ?? null,
        previous_decision: previous?.decision ?? null,
        created_at: at(entry.hoursAgo),
      });
      previous = { id: decisionId, decision: entry.decision };
    });
  }

  for (const seed of CANDIDATE_REVIEWS) {
    push("report_candidate_reviews", {
      id: fid(6, seed.n),
      lost_report_id: report(seed.lost).id,
      lost_report_type: "lost",
      found_report_id: report(seed.found).id,
      found_report_type: "found",
      action: seed.action,
      note: seed.note,
      created_at: at(seed.hoursAgo),
    });
  }

  RUNS.forEach((seed, index) => {
    const matched = seed.matched ?? 0;
    const uncertain = seed.uncertain ?? 0;
    push("matching_runs", {
      id: fid(7, index + 1),
      source: seed.source,
      finished_at: at(seed.hoursAgo),
      duration_ms: seed.durationMs,
      requests: seed.requests ?? (seed.checked > 0 || seed.failure ? 1 : 0),
      checked: seed.checked,
      matched,
      uncertain,
      no_match: Math.max(0, seed.checked - matched - uncertain),
      failed: seed.failure ? 1 : 0,
      already_saved: 0,
      remaining: seed.remaining ?? 0,
      failure: seed.failure ?? null,
      stopped_for_time: seed.failure === "timeout",
      model: FIXTURE_MODEL,
    });
  });

  return db;
}
