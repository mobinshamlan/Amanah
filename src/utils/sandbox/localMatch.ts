import { GeminiApiError, GeminiInvalidResponseError } from "@/utils/gemini/compareReports";
import type { ComparisonDetails, ReportPair } from "@/utils/matching/runMatchingBatch";

// Test mode only: a plain word comparison used when Gemini is busy, so a
// visitor's run still finishes with an honest result instead of failing.
// Deterministic and offline. It understands the vocabulary of the sample
// reports and the lost-form examples in Arabic and English; anything else is
// compared word for word. It is far weaker than Gemini, so every result says
// it was made without AI.

export const LOCAL_FALLBACK_MODEL = "local-fallback";
export const LOCAL_FALLBACK_REASON =
  "Compared without AI because the AI service was busy (test version).";

/**
 * Gemini was overloaded, timed out, or hit its own per-minute quota (after the
 * retries). Amanah's usage limits and setup problems are other errors and still fail.
 */
export function isBusyGeminiError(error: unknown) {
  return error instanceof GeminiApiError || error instanceof GeminiInvalidResponseError;
}

type Concept = { id: string; kind?: boolean; colour?: boolean; words: string[] };

// Item kinds first, then colours, then other details. Words are written
// naturally and normalized below, so "مظلة" also matches "مظله".
const CONCEPTS: Concept[] = [
  { id: "umbrella", kind: true, words: ["umbrella", "brolly", "مظلة", "شمسية"] },
  { id: "wallet", kind: true, words: ["wallet", "purse", "billfold", "محفظة", "بوك"] },
  { id: "keys", kind: true, words: ["key", "keys", "مفتاح", "مفاتيح"] },
  {
    id: "phone",
    kind: true,
    words: ["phone", "mobile", "smartphone", "iphone", "جوال", "هاتف", "موبايل", "ايفون", "تلفون"],
  },
  { id: "backpack", kind: true, words: ["backpack", "rucksack", "bag", "شنطة", "حقيبة"] },
  {
    id: "earbuds",
    kind: true,
    words: ["airpods", "earbuds", "earphones", "headphones", "سماعات", "سماعة", "ايربودز"],
  },
  { id: "bottle", kind: true, words: ["bottle", "flask", "thermos", "مطارة", "قارورة", "زمزمية", "ترمس"] },
  {
    id: "glasses",
    kind: true,
    words: ["glasses", "spectacles", "sunglasses", "eyeglasses", "نظارة", "نظارات"],
  },
  { id: "laptop", kind: true, words: ["laptop", "لابتوب"] },
  { id: "watch", kind: true, words: ["watch", "ساعة"] },

  { id: "blue", colour: true, words: ["blue", "navy", "ازرق", "زرقاء", "زرقا", "كحلي"] },
  { id: "yellow", colour: true, words: ["yellow", "اصفر", "صفراء", "صفرا"] },
  { id: "brown", colour: true, words: ["brown", "بني"] },
  { id: "black", colour: true, words: ["black", "اسود", "سوداء", "سودا"] },
  { id: "white", colour: true, words: ["white", "ابيض", "بيضاء", "بيضا"] },
  { id: "grey", colour: true, words: ["grey", "gray", "رمادي"] },
  { id: "green", colour: true, words: ["green", "اخضر", "خضراء", "خضرا"] },
  { id: "red", colour: true, words: ["red", "احمر", "حمراء", "حمرا"] },
  { id: "pink", colour: true, words: ["pink", "وردي", "زهري"] },
  { id: "gold", colour: true, words: ["gold", "golden", "ذهبي"] },
  { id: "silver", colour: true, words: ["silver", "فضي"] },
  { id: "orange", colour: true, words: ["orange", "برتقالي"] },
  { id: "purple", colour: true, words: ["purple", "بنفسجي"] },

  { id: "leather", words: ["leather", "جلد", "جلدي"] },
  { id: "steel", words: ["steel", "stainless", "ستيل", "حديد"] },
  { id: "metal", words: ["metal", "metallic", "معدن", "معدني"] },
  { id: "silicone", words: ["silicone", "silicon", "سيليكون"] },
  { id: "plastic", words: ["plastic", "بلاستيك"] },
  { id: "bamboo", words: ["bamboo", "خيزران", "بامبو"] },
  { id: "transparent", words: ["transparent", "clear", "شفاف"] },
  { id: "folding", words: ["folding", "foldable", "fold", "طي"] },
  { id: "folded", words: ["folded", "مطوي"] },
  { id: "handle", words: ["handle", "مقبض"] },
  { id: "curved", words: ["curved", "منحني", "معكوف"] },
  { id: "bent", words: ["bent", "معوج", "مثني"] },
  { id: "sticker", words: ["sticker", "ملصق", "استيكر", "ستيكر"] },
  { id: "star", words: ["star", "نجمة"] },
  { id: "rib", words: ["rib", "سلك", "اسلاك"] },
  { id: "card", words: ["card", "id", "بطاقة", "كرت"] },
  { id: "university", words: ["university", "college", "جامعي", "جامعة"] },
  { id: "bank", words: ["bank", "credit", "بنكي", "بنك"] },
  { id: "receipt", words: ["receipt", "ايصال", "فاتورة"] },
  { id: "pocket", words: ["pocket", "جيب"] },
  { id: "corner", words: ["corner", "طرف", "زاوية"] },
  { id: "scratch", words: ["scratch", "scratched", "scuffed", "scuff", "خدش", "خدوش", "مخدوش"] },
  { id: "ring", words: ["ring", "keyring", "حلقة"] },
  { id: "tag", words: ["tag", "keychain", "fob", "ميدالية", "تعليقة"] },
  { id: "engraved", words: ["engraved", "محفور"] },
  { id: "letter", words: ["letter", "letters", "حرف", "حروف"] },
  { id: "car", words: ["car", "سيارة"] },
  { id: "toyota", words: ["toyota", "تويوتا"] },
  { id: "three", words: ["three", "3", "ثلاث", "ثلاثة"] },
  { id: "samsung", words: ["samsung", "سامسونج"] },
  { id: "apple", words: ["apple", "ابل"] },
  { id: "cover", words: ["case", "cover", "lid", "cap", "غطاء", "غطا", "كفر", "جراب"] },
  { id: "sleeve", words: ["sleeve", "غلاف"] },
  { id: "screen", words: ["screen", "شاشة"] },
  { id: "crack", words: ["crack", "cracked", "broken", "كسر", "مكسور"] },
  { id: "cat", words: ["cat", "قطة", "قطوة"] },
  { id: "photo", words: ["photo", "picture", "صورة"] },
  { id: "notebook", words: ["notebook", "دفتر"] },
  { id: "calculator", words: ["calculator", "حاسبة"] },
  { id: "charger", words: ["charger", "شاحن"] },
  { id: "jansport", words: ["jansport", "جانسبورت"] },
  { id: "palm", words: ["palm", "نخلة"] },
  { id: "zipper", words: ["zip", "zipper", "سحاب"] },
  { id: "bus", words: ["bus", "باص"] },
  { id: "cash", words: ["cash", "money", "كاش", "فلوس", "نقود"] },
  { id: "water", words: ["water", "ماء", "موية", "مويا"] },
  { id: "mountain", words: ["mountain", "جبل"] },
  { id: "dent", words: ["dent", "dented", "طعجة", "بعجة"] },
  { id: "reading", words: ["reading", "قراءة"] },
  { id: "frame", words: ["frame", "اطار", "برواز"] },
  { id: "magnetic", words: ["magnetic", "magnet", "مغناطيس", "مغناطيسي"] },
  { id: "cloth", words: ["cloth", "قماشة", "منديل"] },
  { id: "owl", words: ["owl", "بومة"] },
];

// Words that say nothing about which item it is.
const STOPWORDS = [
  "a", "an", "the", "with", "and", "or", "in", "on", "of", "my", "was", "is", "it", "its", "i",
  "to", "for", "at", "by", "from", "this", "that", "one", "some", "little", "small", "set", "near",
  "inside", "there", "has", "have", "had", "very", "slightly", "few", "back", "side", "bottom",
  "printed", "hard", "thin", "both", "two",
  "في", "مع", "على", "من", "عن", "الى", "او", "ثم", "كان", "كانت", "فيه", "فيها", "عليه", "عليها",
  "معه", "معها", "ومعها", "وفيها", "قرب", "عند", "هذا", "هذي", "اللي", "حق", "شوية", "صغير",
  "قليل", "قليلا", "واحد", "واحدة", "بس", "كمان", "قابلة", "ظهر", "شكل", "داخل", "داخلها",
  "داخلي", "وراه", "خلف", "بقلم", "مكتوب", "ايمن", "حول",
];

/** Arabic: no diacritics or tatweel, one alef, ة→ه, ى→ي, no hamza; Latin lowercase; no punctuation. */
export function normalizeForMatch(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const CONCEPT_BY_WORD = new Map<string, Concept>();
for (const concept of CONCEPTS) {
  for (const word of concept.words) {
    CONCEPT_BY_WORD.set(normalizeForMatch(word), concept);
  }
}
const STOPWORD_SET = new Set(STOPWORDS.map(normalizeForMatch));

const PREFIXES = ["وال", "بال", "فال", "كال", "لل", "ال", "و", "ب", "ل", "ف", "ك"];

// Spellings of one word to look up: as written, without a possessive or
// feminine ending, without a joined prefix (و، ب، ال…), and English singular.
function variants(token: string) {
  const bases = [token];
  for (const prefix of PREFIXES) {
    if (token.startsWith(prefix) && token.length - prefix.length >= 2) {
      bases.push(token.slice(prefix.length));
    }
  }
  const out: string[] = [];
  for (const base of bases) {
    out.push(base);
    const ending = base.match(/^(.{2,}?)(تها|ته|تي)$/);
    if (ending) out.push(`${ending[1]}ه`);
    const suffix = base.match(/^(.{2,}?)(ها|ه|ي|ات)$/);
    if (suffix) out.push(suffix[1]);
    if (/^[a-z]{3,}s$/.test(base)) out.push(base.slice(0, base.endsWith("es") ? -2 : -1), base.slice(0, -1));
  }
  return out;
}

type Term = { id: string; kind: boolean; colour: boolean; word: string };

/** The meaningful words of a text, each mapped to a shared concept when one is known. */
function terms(text: string): Term[] {
  const out: Term[] = [];
  for (const token of normalizeForMatch(text).split(" ")) {
    if (!token) continue;
    const forms = variants(token);
    if (forms.some((form) => STOPWORD_SET.has(form))) continue;
    const concept = forms.map((form) => CONCEPT_BY_WORD.get(form)).find(Boolean);
    if (concept) {
      out.push({ id: concept.id, kind: Boolean(concept.kind), colour: Boolean(concept.colour), word: token });
      continue;
    }
    // Unknown word: compare it as written, without "ال" or a feminine ending.
    const stripped = token.replace(/^(وال|بال|ال)(?=..)/, "").replace(/(?<=..)ه$/, "");
    if (stripped.length >= 2) {
      out.push({ id: `word:${stripped}`, kind: false, colour: false, word: token });
    }
  }
  return out;
}

type Profile = { kinds: Set<string>; nameDetails: Set<string>; details: Set<string>; colours: Set<string> };

function profile(itemName: string, description: string): Profile {
  const nameTerms = terms(itemName);
  const allTerms = [...nameTerms, ...terms(description)];
  let kinds = new Set(nameTerms.filter((term) => term.kind).map((term) => term.id));
  if (kinds.size === 0) {
    // No known kind in the name: the description's kind, else the name's own words.
    kinds = new Set(allTerms.filter((term) => term.kind).map((term) => term.id));
  }
  if (kinds.size === 0) {
    kinds = new Set(nameTerms.filter((term) => !term.colour).map((term) => term.id));
  }
  const isDetail = (term: Term) => !term.kind && !kinds.has(term.id);
  return {
    kinds,
    nameDetails: new Set(nameTerms.filter(isDetail).map((term) => term.id)),
    details: new Set(allTerms.filter(isDetail).map((term) => term.id)),
    colours: new Set(allTerms.filter((term) => term.colour).map((term) => term.id)),
  };
}

const KIND_POINTS = 40;
// A shared detail named in the lost report's item name counts most.
const NAME_DETAIL_POINTS = 10;
const DETAIL_POINTS = 7;
const DETAIL_POINTS_MAX = 60;
const COLOUR_CONFLICT_PENALTY = 25;
export const LOCAL_MATCH_MIN = 70;
export const LOCAL_INSUFFICIENT_MIN = 40;

function label(id: string) {
  return id.startsWith("word:") ? id.slice(5) : id;
}

/** Compares one lost report with one found report, word by word. */
export function compareLocally(
  lost: { item_name: string; description: string },
  found: { item_name: string; description: string },
): ComparisonDetails {
  const a = profile(lost.item_name, lost.description);
  const b = profile(found.item_name, found.description);
  const sameKind = [...a.kinds].some((kind) => b.kinds.has(kind));
  const shared = [...a.details].filter((id) => b.details.has(id));
  const detailPoints = Math.min(
    DETAIL_POINTS_MAX,
    shared.reduce((sum, id) => sum + (a.nameDetails.has(id) ? NAME_DETAIL_POINTS : DETAIL_POINTS), 0),
  );
  const colourConflict =
    a.colours.size > 0 && b.colours.size > 0 && ![...a.colours].some((colour) => b.colours.has(colour));

  let score: number;
  if (sameKind) {
    score = KIND_POINTS + detailPoints - (colourConflict ? COLOUR_CONFLICT_PENALTY : 0);
  } else {
    // A different kind of item is never a match, however many words are shared.
    score = Math.min(LOCAL_INSUFFICIENT_MIN - 10, Math.round(detailPoints / 3));
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const decision: ComparisonDetails["decision"] =
    sameKind && score >= LOCAL_MATCH_MIN
      ? "match"
      : sameKind && score >= LOCAL_INSUFFICIENT_MIN
        ? "insufficient_information"
        : "no_match";

  const supportingDetails: string[] = [];
  if (sameKind) supportingDetails.push("Same kind of item.");
  if (shared.length > 0) supportingDetails.push(`Shared details: ${shared.slice(0, 8).map(label).join(", ")}.`);
  const contradictions: string[] = [];
  if (!sameKind) contradictions.push("Different kinds of item.");
  if (colourConflict) contradictions.push("The colours differ.");

  return {
    decision,
    reason: LOCAL_FALLBACK_REASON,
    supportingDetails,
    contradictions,
    missingInformation: [],
    similarityScore: score,
    model: LOCAL_FALLBACK_MODEL,
  };
}

/** Local results for a batch, in the batch's order. */
export function compareBatchLocally(batch: ReportPair[]): ComparisonDetails[] {
  return batch.map((pair) => compareLocally(pair.lost, pair.found));
}

/** The found report's colour words as written, for a local ownership question. */
export function colourWords(text: string) {
  return [...new Set(terms(text).filter((term) => term.colour).map((term) => term.word))];
}
