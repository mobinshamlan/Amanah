// Staff-only review of plausible low-confidence pairs.
// This reads stored report text and the saved AI result. It never calls Gemini,
// never confirms ownership, and never approves a handover.

export const CANDIDATE_NOTE_MAX = 500;
export const STAFF_CANDIDATE_MODEL = "staff";

export type CandidateReviewAction = "ownership_review" | "dismissed";

export type CandidateReport = {
  item_name: string;
  description: string;
  location: string;
};

export type StoredPairResult = {
  ai_decision: "match" | "insufficient_information";
  ai_similarity_score: number | null;
  supporting_details: string[];
  contradictions: string[];
  missing_information: string[];
  model: string;
};

export type StaffComparison = {
  plausible: boolean;
  overlap: string[];
  differences: string[];
  unknown: string[];
};

export type StoredMatch = {
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
  lost: CandidateReport | null;
  found: CandidateReport | null;
};

export type CandidateReview = {
  lost_report_id: string;
  found_report_id: string;
  action: string;
  note: string | null;
  created_at: string;
};

export type CandidateListItem = {
  id: string;
  lostReportId: string;
  foundReportId: string;
  explanation: string;
  model: string;
  createdAt: string;
  score: number | null;
  lost: CandidateReport;
  found: CandidateReport;
  comparison: StaffComparison;
  review: { action: CandidateReviewAction; note: string | null } | null;
};

const COLORS = new Set([
  "beige",
  "black",
  "blue",
  "brown",
  "gold",
  "gray",
  "green",
  "grey",
  "navy",
  "orange",
  "pink",
  "purple",
  "red",
  "silver",
  "white",
  "yellow",
]);

const TYPE_WORDS: Record<string, string> = {
  backpack: "backpack",
  bottle: "bottle",
  charger: "charger",
  coat: "jacket",
  earbud: "earbuds",
  earbuds: "earbuds",
  flask: "bottle",
  glasses: "glasses",
  headphone: "headphones",
  headphones: "headphones",
  jacket: "jacket",
  key: "keys",
  keys: "keys",
  laptop: "laptop",
  notebook: "notebook",
  passport: "passport",
  phone: "phone",
  purse: "wallet",
  rucksack: "backpack",
  scarf: "scarf",
  thermos: "bottle",
  umbrella: "umbrella",
  wallet: "wallet",
  wallets: "wallet",
  watch: "watch",
};

const TYPE_TOKENS = new Set(Object.keys(TYPE_WORDS));

const STOP = new Set([
  "about",
  "after",
  "again",
  "along",
  "also",
  "around",
  "because",
  "been",
  "before",
  "being",
  "beside",
  "between",
  "both",
  "building",
  "campus",
  "college",
  "color",
  "colour",
  "common",
  "could",
  "describe",
  "described",
  "detail",
  "details",
  "empty",
  "enough",
  "entrance",
  "every",
  "floor",
  "found",
  "from",
  "front",
  "have",
  "information",
  "inside",
  "item",
  "items",
  "large",
  "left",
  "maybe",
  "mention",
  "mentions",
  "might",
  "mine",
  "missing",
  "morning",
  "near",
  "only",
  "other",
  "outside",
  "place",
  "plain",
  "please",
  "report",
  "reports",
  "right",
  "room",
  "same",
  "side",
  "similar",
  "small",
  "some",
  "someone",
  "something",
  "somewhere",
  "still",
  "student",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "today",
  "tomorrow",
  "under",
  "university",
  "unknown",
  "very",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "yesterday",
  "your",
]);

// Contents the finder may know and the owner may not have written down.
const CONTENTS = new Set([
  "card",
  "cash",
  "coin",
  "coins",
  "license",
  "money",
  "passport",
  "photo",
  "receipt",
  "sim",
  "sticker",
]);

const DETAIL_LIMIT = 5;
const DETAIL_CHARS = 240;

function tokens(text: string) {
  return text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? [];
}

function canonicalType(token: string) {
  return TYPE_WORDS[token] ?? TYPE_WORDS[token.replace(/s$/, "")] ?? null;
}

function detectTypeIn(text: string) {
  for (const token of tokens(text)) {
    const type = canonicalType(token);
    if (type) {
      return type;
    }
  }
  return null;
}

function typesIn(text: string) {
  const found = new Set<string>();
  for (const token of tokens(text)) {
    const type = canonicalType(token);
    if (type) {
      found.add(type);
    }
  }
  return [...found];
}

function detectType(report: CandidateReport) {
  return detectTypeIn(report.item_name) ?? detectTypeIn(report.description);
}

function normalizeColor(token: string) {
  return token === "grey" ? "gray" : token;
}

function colorsIn(text: string) {
  const found = new Set<string>();
  for (const token of tokens(text)) {
    if (COLORS.has(token)) {
      found.add(normalizeColor(token));
    }
  }
  return found;
}

function reportText(report: CandidateReport) {
  return `${report.item_name} ${report.description} ${report.location}`;
}

function distinctive(text: string) {
  const found = new Set<string>();
  for (const token of tokens(text)) {
    if (token.length < 5 || STOP.has(token) || COLORS.has(token) || TYPE_TOKENS.has(token)) {
      continue;
    }
    found.add(token);
  }
  return found;
}

function label(token: string) {
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function shared(left: Set<string>, right: Set<string>) {
  return [...left].filter((token) => right.has(token)).sort();
}

function onlyIn(left: Set<string>, right: Set<string>) {
  return [...left].filter((token) => !right.has(token)).sort();
}

function colorConflict(lost: CandidateReport, found: CandidateReport) {
  const lostColors = colorsIn(reportText(lost));
  const foundColors = colorsIn(reportText(found));
  return lostColors.size > 0 && foundColors.size > 0 && shared(lostColors, foundColors).length === 0;
}

function pushUnique(items: string[], line: string) {
  const text = line.trim();
  if (text && !items.some((item) => item.toLowerCase() === text.toLowerCase())) {
    items.push(text);
  }
}

/**
 * Compares two reports from their saved text and saved AI lists.
 * A low score does not matter. A pair is plausible only when the AI said
 * there was not enough information, the item types match, and the reports
 * share a color or another specific clue. Different item types that only
 * share a color are not candidates. Details only the finder wrote down are
 * unknown, not a reason to drop the pair. A staff-added pair stays reviewable.
 */
export function compareForStaff(
  lost: CandidateReport,
  found: CandidateReport,
  stored: StoredPairResult,
): StaffComparison {
  const supportTypes = typesIn(stored.supporting_details.join(" "));
  let lostType = detectType(lost);
  let foundType = detectType(found);
  // The saved AI line can name the item when a report title does not.
  // A type already written on a report is never replaced.
  if (!lostType && !foundType && supportTypes.length === 1) {
    lostType = supportTypes[0];
    foundType = supportTypes[0];
  } else if (lostType && !foundType && supportTypes.length === 1 && supportTypes[0] === lostType) {
    foundType = lostType;
  } else if (foundType && !lostType && supportTypes.length === 1 && supportTypes[0] === foundType) {
    lostType = foundType;
  }
  const sameType = Boolean(lostType && foundType && lostType === foundType);
  const lostColors = colorsIn(reportText(lost));
  const foundColors = colorsIn(reportText(found));
  const sharedColors = shared(lostColors, foundColors);
  const sharedTokens = shared(distinctive(reportText(lost)), distinctive(reportText(found)));

  const overlap: string[] = [];
  if (sameType && lostType) {
    pushUnique(overlap, `Same item type: ${lostType}`);
  }
  for (const color of sharedColors) {
    pushUnique(overlap, `Shared color: ${color}`);
  }
  for (const token of sharedTokens) {
    pushUnique(overlap, `Shared detail: ${label(token)}`);
  }
  for (const detail of stored.supporting_details) {
    pushUnique(overlap, detail);
  }

  const differences: string[] = [];
  if (lostType && foundType && lostType !== foundType) {
    pushUnique(differences, `Item types differ: ${lostType} and ${foundType}`);
  }
  for (const color of onlyIn(lostColors, foundColors)) {
    pushUnique(differences, `Color only on the lost report: ${color}`);
  }
  for (const color of onlyIn(foundColors, lostColors)) {
    pushUnique(differences, `Color only on the found report: ${color}`);
  }
  for (const detail of stored.contradictions) {
    pushUnique(differences, detail);
  }

  const unknown: string[] = [];
  for (const detail of stored.missing_information) {
    pushUnique(unknown, detail);
  }
  const lostTokens = new Set(tokens(reportText(lost)));
  const foundTokens = new Set(tokens(reportText(found)));
  for (const token of foundTokens) {
    if (!CONTENTS.has(token) || lostTokens.has(token) || token === lostType || token === foundType) {
      continue;
    }
    pushUnique(unknown, `Only the found report mentions: ${token}`);
  }

  const staffAdded = stored.model === STAFF_CANDIDATE_MODEL;
  const hasClue = sharedColors.length > 0 || sharedTokens.length > 0;
  const plausible =
    staffAdded ||
    (stored.ai_decision === "insufficient_information" &&
      sameType &&
      !colorConflict(lost, found) &&
      hasClue);

  return { plausible, overlap, differences, unknown };
}

export function isPotentialCandidate(
  lost: CandidateReport,
  found: CandidateReport,
  stored: StoredPairResult,
) {
  return compareForStaff(lost, found, stored).plausible;
}

export function clipStaffDetails(items: string[]) {
  const clipped: string[] = [];
  for (const item of items) {
    const text = item.trim().slice(0, DETAIL_CHARS);
    if (!text || clipped.includes(text)) {
      continue;
    }
    clipped.push(text);
    if (clipped.length === DETAIL_LIMIT) {
      break;
    }
  }
  return clipped;
}

export function candidateNote(value: unknown): { ok: true; note: string | null } | { ok: false } {
  if (value == null) {
    return { ok: true, note: null };
  }
  if (typeof value !== "string") {
    return { ok: false };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, note: null };
  }
  if (trimmed.length > CANDIDATE_NOTE_MAX) {
    return { ok: false };
  }
  return { ok: true, note: trimmed };
}

export function staffReviewGate(enabled: boolean): { ok: false; message: string } | { ok: true } {
  if (!enabled) {
    return { ok: false, message: "Not available." };
  }
  return { ok: true };
}

const MANUAL_EXPLANATION = "Staff added this pair for review. This is not a confirmed match.";

/** Fields for a staff-created suggestion. The AI decision stays "not enough information". */
export function manualCandidateInsert(lost: CandidateReport, found: CandidateReport, note: string | null) {
  const comparison = compareForStaff(lost, found, {
    ai_decision: "insufficient_information",
    ai_similarity_score: null,
    supporting_details: [],
    contradictions: [],
    missing_information: [],
    model: STAFF_CANDIDATE_MODEL,
  });
  return {
    explanation: note ?? MANUAL_EXPLANATION,
    model: STAFF_CANDIDATE_MODEL,
    ai_decision: "insufficient_information" as const,
    supporting_details: clipStaffDetails(comparison.overlap),
    contradictions: clipStaffDetails(comparison.differences),
    missing_information: clipStaffDetails(comparison.unknown),
  };
}

function pairKey(lostId: string, foundId: string) {
  return `${lostId}:${foundId}`;
}

function latestReviews(reviews: CandidateReview[]) {
  const sorted = [...reviews].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  const map = new Map<string, { action: CandidateReviewAction; note: string | null }>();
  for (const review of sorted) {
    if (review.action !== "ownership_review" && review.action !== "dismissed") {
      continue;
    }
    const key = pairKey(review.lost_report_id, review.found_report_id);
    if (!map.has(key)) {
      map.set(key, { action: review.action, note: review.note });
    }
  }
  return map;
}

function toListItem(
  match: StoredMatch,
  lost: CandidateReport,
  found: CandidateReport,
  review: { action: CandidateReviewAction; note: string | null } | null,
): CandidateListItem {
  return {
    id: match.id,
    lostReportId: match.lost_report_id,
    foundReportId: match.found_report_id,
    explanation: match.explanation,
    model: match.model,
    createdAt: match.created_at,
    score: match.ai_similarity_score,
    lost,
    found,
    comparison: compareForStaff(lost, found, match),
    review,
  };
}

/** Open candidates still need a look. Dismissed pairs stay in the audit list. */
export function buildCandidateQueues(matches: StoredMatch[], reviews: CandidateReview[]) {
  const latest = latestReviews(reviews);
  const open: CandidateListItem[] = [];
  const dismissed: CandidateListItem[] = [];

  for (const match of matches) {
    if (!match.lost || !match.found) {
      continue;
    }
    const comparison = compareForStaff(match.lost, match.found, match);
    const staffAdded = match.model === STAFF_CANDIDATE_MODEL;
    if (!staffAdded && (match.ai_decision !== "insufficient_information" || !comparison.plausible)) {
      continue;
    }
    const review = latest.get(pairKey(match.lost_report_id, match.found_report_id)) ?? null;
    const item = toListItem(match, match.lost, match.found, review);
    if (review?.action === "dismissed") {
      dismissed.push(item);
    } else {
      open.push(item);
    }
  }

  const byNewest = (a: CandidateListItem, b: CandidateListItem) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
  open.sort(byNewest);
  dismissed.sort(byNewest);
  return { open, dismissed };
}
