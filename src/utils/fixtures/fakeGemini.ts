// Deterministic stand-in for Gemini in development fixture mode. It never opens a
// network connection. It answers the four structured requests the app makes
// (single comparison, batch comparison, ownership questions, ownership
// assessment) with a simple Arabic + English word-overlap heuristic, so results
// look plausible and always pass the app's own validators.
//
// It is not a model and makes no claim about real matching quality.

type ReportData = { item_name: string; description: string; location: string };

type ComparisonJson = {
  decision: "match" | "no_match" | "insufficient_information";
  reason: string;
  supporting_details: string[];
  contradictions: string[];
  missing_information: string[];
  similarity_score: number;
};

// ---------------------------------------------------------------------------
// Text handling

/** Same normalisation as normalizeText in ownershipVerification.ts. */
function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Looser form for comparing words: unifies alef, taa marbuta, and alef maqsura. */
function foldArabic(word: string) {
  return word.replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
}

const ARABIC = /[؀-ۿ]/;

function isArabic(text: string) {
  return ARABIC.test(text);
}

function stem(word: string) {
  let token = foldArabic(word);
  if (ARABIC.test(token)) {
    for (const prefix of ["وال", "بال", "فال", "كال"]) {
      if (token.startsWith(prefix) && token.length >= 6) {
        return token.slice(prefix.length);
      }
    }
    if (token.startsWith("لل") && token.length >= 5) {
      return token.slice(2);
    }
    if (token.startsWith("ال") && token.length >= 5) {
      return token.slice(2);
    }
    return token;
  }
  token = token.replace(/'s$/, "");
  if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) {
    token = token.slice(0, -1);
  }
  return token;
}

function isKnownWord(key: string) {
  return Boolean(
    TYPES[key] || COLOURS[key] || BRANDS[key] || MARKINGS.has(key) || DAMAGE.has(key) || STOP.has(key),
  );
}

/** Comparable form of one word; drops a joined Arabic و / ب / ف / ل before a known word. */
function wordKey(word: string) {
  const key = stem(word);
  if (!isKnownWord(key) && /^[وبفل]/.test(word) && word.length >= 4) {
    const shorter = stem(word.slice(1));
    if (isKnownWord(shorter)) {
      return shorter;
    }
  }
  return key;
}

/** Original words with their comparable form, in order. */
function words(text: string) {
  return normalizeText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 2)
    .map((word) => ({ word, key: wordKey(word) }));
}

const TYPES: Record<string, string> = {};
function addType(type: string, forms: string[]) {
  for (const form of forms) {
    TYPES[stem(normalizeText(form))] = type;
  }
}
// Checked in this order, so an accessory wins over the device it belongs to.
const TYPE_PRIORITY = [
  "charger",
  "earbuds",
  "keys",
  "card holder",
  "umbrella",
  "glasses",
  "bottle",
  "watch",
  "notebook",
  "calculator",
  "backpack",
  "jacket",
  "scarf",
  "wallet",
  "phone",
  "laptop",
];
addType("charger", ["charger", "شاحن"]);
addType("earbuds", ["airpods", "earbuds", "earphones", "headphones", "سماعة", "سماعات", "ايربودز"]);
addType("keys", ["key", "keys", "keychain", "مفتاح", "مفاتيح"]);
addType("card holder", ["holder", "cardholder", "lanyard", "حامل"]);
addType("umbrella", ["umbrella", "مظلة", "شمسية"]);
addType("glasses", ["glasses", "sunglasses", "spectacles", "نظارة", "نظارات"]);
addType("bottle", ["bottle", "flask", "thermos", "tumbler", "مطارة", "قارورة", "زجاجة", "ترمس"]);
addType("watch", ["watch", "ساعة"]);
addType("notebook", ["notebook", "دفتر", "كراسة"]);
addType("calculator", ["calculator", "حاسبة"]);
addType("backpack", ["backpack", "rucksack", "bag", "حقيبة", "شنطة"]);
addType("jacket", ["jacket", "hoodie", "coat", "جاكيت", "جاكت", "هودي", "معطف"]);
addType("scarf", ["scarf", "شال", "وشاح"]);
addType("wallet", ["wallet", "purse", "محفظة"]);
addType("phone", ["phone", "iphone", "جوال", "هاتف"]);
addType("laptop", ["laptop", "لابتوب"]);

const COLOURS: Record<string, string> = {};
function addColour(colour: string, forms: string[]) {
  for (const form of forms) {
    COLOURS[stem(normalizeText(form))] = colour;
  }
}
addColour("blue", ["blue", "أزرق", "زرقاء", "زرقا"]);
addColour("black", ["black", "أسود", "سوداء", "سودا"]);
addColour("white", ["white", "أبيض", "بيضاء", "بيضا"]);
addColour("red", ["red", "أحمر", "حمراء", "حمرا"]);
addColour("green", ["green", "أخضر", "خضراء", "خضرا"]);
addColour("silver", ["silver", "فضي", "فضية"]);
addColour("gold", ["gold", "golden", "ذهبي", "ذهبية"]);
addColour("brown", ["brown", "بني", "بنية"]);
addColour("grey", ["grey", "gray", "رمادي", "رمادية"]);
addColour("pink", ["pink", "وردي", "وردية"]);
addColour("navy", ["navy", "كحلي", "كحلية"]);
addColour("yellow", ["yellow", "أصفر", "صفراء"]);
addColour("purple", ["purple", "بنفسجي"]);
addColour("orange", ["orange", "برتقالي"]);

const BRANDS: Record<string, string> = {};
function addBrand(brand: string, forms: string[]) {
  for (const form of forms) {
    BRANDS[stem(normalizeText(form))] = brand;
  }
}
addBrand("Apple", ["apple", "ابل"]);
addBrand("Samsung", ["samsung", "سامسونج"]);
addBrand("Casio", ["casio", "كاسيو"]);
addBrand("Seiko", ["seiko", "سيكو"]);
addBrand("JanSport", ["jansport", "جانسبورت"]);
addBrand("Adidas", ["adidas", "اديداس"]);
addBrand("Nike", ["nike", "نايكي"]);
addBrand("Toyota", ["toyota", "تويوتا"]);
addBrand("Hyundai", ["hyundai", "هيونداي"]);
addBrand("Hydro Flask", ["hydro", "هيدرو"]);
addBrand("Stanley", ["stanley", "ستانلي"]);
addBrand("Dell", ["dell", "ديل"]);
addBrand("Lenovo", ["lenovo", "لينوفو"]);
addBrand("Anker", ["anker", "انكر"]);

const MARKINGS = new Set(
  [
    "sticker",
    "stickers",
    "engraved",
    "engraving",
    "initials",
    "name",
    "letter",
    "letters",
    "logo",
    "pin",
    "badge",
    "keyring",
    "ملصق",
    "ملصقات",
    "محفور",
    "نقش",
    "حرف",
    "حروف",
    "اسم",
    "شعار",
    "ميدالية",
    "دبوس",
  ].map((form) => stem(normalizeText(form))),
);

const DAMAGE = new Set(
  [
    "scratch",
    "scratches",
    "scratched",
    "crack",
    "cracked",
    "dent",
    "dented",
    "torn",
    "frayed",
    "broken",
    "chipped",
    "tape",
    "خدش",
    "خدوش",
    "كسر",
    "مكسور",
    "شرخ",
    "ممزق",
    "مقطوع",
    "طعجة",
  ].map((form) => stem(normalizeText(form))),
);

const STOP = new Set(
  [
    // English
    "the", "and", "with", "for", "was", "were", "has", "have", "had", "its", "it's", "this", "that",
    "from", "into", "onto", "near", "after", "before", "inside", "outside", "front", "back", "side",
    "left", "right", "small", "large", "big", "little", "one", "two", "some", "any", "very", "just",
    "found", "lost", "item", "items", "think", "maybe", "probably", "around", "about", "there",
    "under", "over", "next", "on", "in", "at", "of", "to", "by", "my", "our", "your", "his", "her",
    "a", "an", "is", "are", "be", "been", "it", "not", "no", "yes", "or", "but", "also", "still",
    "campus", "building", "floor", "room", "hall", "lab", "library", "cafeteria", "lecture",
    "class", "corridor", "entrance", "gate", "parking", "university", "college", "student",
    "students", "morning", "evening", "yesterday", "today", "plain", "empty", "full", "colour",
    "color", "please", "someone", "left", "chair", "table", "desk", "ground", "second", "first",
    "third", "only", "other",
    // Arabic
    "في", "من", "على", "عليه", "عليها", "مع", "عند", "إلى", "الى", "عن", "هذا", "هذه", "ذلك",
    "التي", "الذي", "كان", "كانت", "فيه", "فيها", "لونه", "لونها", "بعد", "قبل", "داخل", "جنب",
    "قرب", "يوم", "أمس", "امس", "اليوم", "أو", "او", "لكن", "ثم", "كل", "بعض", "صغير", "صغيرة",
    "كبير", "كبيرة", "تركته", "تركتها", "نسيته", "نسيتها", "وجدته", "وجدتها", "لقيته", "لقيتها",
    "ضاع", "ضاعت", "مني", "لي", "حقي", "حقتي", "شي", "شيء", "غرض", "المبنى", "مبنى", "الدور",
    "الطابق", "القاعة", "قاعة", "المكتبة", "مكتبة", "الكافتيريا", "المحاضرة", "محاضرة", "المدخل",
    "مدخل", "البوابة", "بوابة", "مواقف", "الجامعة", "الجامعية", "جامعية", "الطلاب", "الطاولة",
    "طاولة", "الثاني", "الأول", "فيه", "بها", "به", "وهي", "وهو", "هو", "هي", "انا", "أنا",
  ].map((form) => stem(normalizeText(form))),
);

// ---------------------------------------------------------------------------
// Report features

type Features = {
  type: string | null;
  colours: Set<string>;
  brands: Set<string>;
  // Distinctive words: comparable key -> original word.
  distinctive: Map<string, string>;
  keys: Set<string>;
};

function detectType(text: string) {
  const present = new Set(
    words(text)
      .map((item) => TYPES[item.key])
      .filter(Boolean),
  );
  return TYPE_PRIORITY.find((type) => present.has(type)) ?? null;
}

function features(report: ReportData): Features {
  const body = `${report.item_name} ${report.description}`;
  const colours = new Set<string>();
  const brands = new Set<string>();
  const distinctive = new Map<string, string>();
  const keys = new Set<string>();
  for (const { word, key } of words(body)) {
    keys.add(key);
    if (COLOURS[key]) {
      colours.add(COLOURS[key]);
      continue;
    }
    if (BRANDS[key]) {
      brands.add(BRANDS[key]);
    }
    if (TYPES[key] || STOP.has(key) || key.length < 3 || /^\d+$/.test(key)) {
      continue;
    }
    if (!distinctive.has(key)) {
      distinctive.set(key, word);
    }
  }
  return {
    type: detectType(report.item_name) ?? detectType(report.description),
    colours,
    brands,
    distinctive,
    keys,
  };
}

/** Small stable number from text, so scores vary a little but never change between runs. */
function jitter(text: string, range: number) {
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % (range + 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function quoted(word: string, arabic: boolean) {
  return arabic ? `«${word}»` : `"${word}"`;
}

const TYPE_NAMES_AR: Record<string, string> = {
  charger: "شاحن",
  earbuds: "سماعات",
  keys: "مفاتيح",
  "card holder": "حامل بطاقات",
  umbrella: "مظلة",
  glasses: "نظارة",
  bottle: "مطارة",
  watch: "ساعة",
  notebook: "دفتر",
  calculator: "آلة حاسبة",
  backpack: "حقيبة",
  jacket: "جاكيت",
  scarf: "وشاح",
  wallet: "محفظة",
  phone: "جوال",
  laptop: "لابتوب",
};

/** Compares one lost report with one found report. */
export function compareFixtureReports(lost: ReportData, found: ReportData): ComparisonJson {
  const arabic = isArabic(`${lost.item_name} ${lost.description}`);
  const a = features(lost);
  const b = features(found);
  const seed = `${lost.item_name}|${found.item_name}|${found.description}`;
  const typeName = (type: string) => (arabic ? (TYPE_NAMES_AR[type] ?? type) : type);

  const contradictions: string[] = [];
  if (a.type && b.type && a.type !== b.type) {
    contradictions.push(
      arabic
        ? `نوع الغرض مختلف: ${typeName(a.type)} و${typeName(b.type)}`
        : `Different item types: ${a.type} and ${b.type}`,
    );
  }
  const sharedColours = [...a.colours].filter((colour) => b.colours.has(colour));
  if (a.colours.size > 0 && b.colours.size > 0 && sharedColours.length === 0) {
    contradictions.push(
      arabic
        ? `اللون مختلف بين البلاغين`
        : `Different colours: ${[...a.colours].join(", ")} and ${[...b.colours].join(", ")}`,
    );
  }
  if (a.brands.size > 0 && b.brands.size > 0 && ![...a.brands].some((brand) => b.brands.has(brand))) {
    contradictions.push(
      arabic
        ? `العلامة التجارية مختلفة: ${[...a.brands].join("، ")} و${[...b.brands].join("، ")}`
        : `Different brands: ${[...a.brands].join(", ")} and ${[...b.brands].join(", ")}`,
    );
  }

  const shared = [...a.distinctive.keys()].filter((key) => b.distinctive.has(key));
  const onlyFound = [...b.distinctive.entries()].filter(([key]) => !a.keys.has(key)).slice(0, 3);
  const missing = onlyFound.map(([, word]) =>
    arabic ? `بلاغ العثور فقط يذكر ${quoted(word, true)}` : `Only the found report mentions ${quoted(word, false)}`,
  );
  const sameType = Boolean(a.type && b.type && a.type === b.type);

  if (contradictions.length > 0 || (!sameType && shared.length === 0 && sharedColours.length === 0)) {
    if (contradictions.length === 0) {
      contradictions.push(
        arabic ? "لا توجد تفاصيل مشتركة؛ يبدو أنهما غرضان مختلفان" : "No shared details; these look like different items",
      );
    }
    return {
      decision: "no_match",
      reason: arabic
        ? "البلاغان يصفان غرضين مختلفين على الأرجح."
        : "The two reports most likely describe different items.",
      supporting_details: [],
      contradictions: contradictions.slice(0, 5),
      missing_information: [],
      similarity_score: clamp(2 + jitter(seed, 12), 0, 15),
    };
  }

  const supporting = shared
    .slice(0, 4)
    .map((key) =>
      arabic
        ? `البلاغان يذكران ${quoted(b.distinctive.get(key) ?? key, true)}`
        : `Both mention ${quoted(b.distinctive.get(key) ?? key, false)}`,
    );
  if (sharedColours.length > 0 && supporting.length < 5) {
    supporting.push(arabic ? "اللون نفسه في البلاغين" : `Same colour: ${sharedColours.join(", ")}`);
  }

  const strong = (sameType || !a.type || !b.type) && (shared.length >= 2 || (shared.length >= 1 && sameType && sharedColours.length > 0));
  if (strong) {
    return {
      decision: "match",
      reason: arabic
        ? `يتفق البلاغان في تفاصيل مميزة (${shared.length}) دون أي تعارض.`
        : `Both reports share ${shared.length} specific detail${shared.length === 1 ? "" : "s"} and nothing conflicts.`,
      supporting_details: supporting,
      contradictions: [],
      missing_information: missing,
      similarity_score: clamp(
        58 + 9 * shared.length + (sharedColours.length ? 5 : 0) + (sameType ? 4 : 0) + jitter(seed, 4),
        60,
        92,
      ),
    };
  }

  if (sameType && supporting.length < 5) {
    supporting.unshift(
      arabic ? `نوع الغرض نفسه: ${typeName(a.type ?? "")}` : `Same item type: ${a.type}`,
    );
  }
  return {
    decision: "insufficient_information",
    reason: arabic
      ? "قد يكون الغرض نفسه، لكن التفاصيل المشتركة قليلة أو عامة."
      : "It could be the same item, but the shared details are few or too common to tell.",
    supporting_details: supporting.slice(0, 5),
    contradictions: [],
    missing_information: missing,
    similarity_score: clamp(
      20 + 10 * shared.length + (sameType ? 10 : 0) + (sharedColours.length ? 6 : 0) + jitter(seed, 5),
      20,
      55,
    ),
  };
}

// ---------------------------------------------------------------------------
// Ownership questions

type QuestionCategory = "marking" | "brand" | "damage" | "colour" | "other";

const QUESTIONS: Record<QuestionCategory, { ar: string; en: string }> = {
  marking: {
    ar: "هل عليه أي كتابة أو رسمة أو علامة شخصية؟ صِفها.",
    en: "Does it have any writing, pictures, or personal markings? Please describe them.",
  },
  brand: {
    ar: "ما الشركة المصنّعة أو العلامة التجارية؟",
    en: "Which brand or make is it?",
  },
  damage: {
    ar: "هل فيه أي أثر استعمال أو تلف تتذكره؟ صِفه.",
    en: "Is there any wear or damage you remember? Please describe it.",
  },
  colour: {
    ar: "ما ألوانه بالتفصيل كما تتذكرها؟",
    en: "What colours is it, in detail, as you remember them?",
  },
  other: {
    ar: "اذكر تفصيلاً مميزاً فيه أو بداخله لا يعرفه إلا صاحبه.",
    en: "Describe one distinctive detail on it or inside it that only the owner would know.",
  },
};

const CATEGORY_ORDER: QuestionCategory[] = ["marking", "brand", "damage", "colour", "other"];

function categoryOf(key: string): QuestionCategory {
  if (MARKINGS.has(key)) {
    return "marking";
  }
  if (BRANDS[key]) {
    return "brand";
  }
  if (DAMAGE.has(key)) {
    return "damage";
  }
  if (COLOURS[key]) {
    return "colour";
  }
  return "other";
}

/** The clause of the found description that holds a word, as the private expected detail. */
function clauseWith(found: ReportData, word: string) {
  const clauses = `${found.description}`
    .split(/[.,،;؛:\n]+/)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const clause = clauses.find((item) => normalizeText(item).includes(word)) ?? word;
  return clause.length > 120 ? word : clause;
}

/** Up to two questions about found-report details that the lost report does not state. */
export function fixtureOwnershipQuestions(lost: ReportData, found: ReportData) {
  const arabic = isArabic(`${lost.item_name} ${lost.description}`);
  const lostText = normalizeText(`${lost.item_name} ${lost.description} ${lost.location}`);
  const foundText = normalizeText(`${found.item_name} ${found.description} ${found.location}`);
  const lostFeatures = features(lost);

  const candidates: { word: string; key: string; category: QuestionCategory }[] = [];
  for (const { word, key } of words(`${found.item_name} ${found.description}`)) {
    if (
      key.length < 3 ||
      STOP.has(key) ||
      TYPES[key] ||
      lostFeatures.keys.has(key) ||
      (COLOURS[key] && lostFeatures.colours.has(COLOURS[key])) ||
      (BRANDS[key] && lostFeatures.brands.size > 0) ||
      lostText.includes(word) ||
      !foundText.includes(word) ||
      candidates.some((item) => item.key === key)
    ) {
      continue;
    }
    candidates.push({ word, key, category: categoryOf(key) });
  }

  const questions: { detail: string; question: string; answer_keywords: string[] }[] = [];
  const usedCategories = new Set<QuestionCategory>();
  const usedClauses = new Set<string>();
  for (const category of CATEGORY_ORDER) {
    for (const candidate of candidates.filter((item) => item.category === category)) {
      if (questions.length === 2 || usedCategories.has(category)) {
        break;
      }
      const question = arabic ? QUESTIONS[category].ar : QUESTIONS[category].en;
      const detail = clauseWith(found, candidate.word);
      const normalizedQuestion = normalizeText(question);
      // The same checks parseOwnershipQuestions applies, so nothing is dropped.
      if (
        usedClauses.has(detail) ||
        normalizedQuestion.includes(candidate.word) ||
        normalizedQuestion.includes(normalizeText(detail))
      ) {
        continue;
      }
      usedCategories.add(category);
      usedClauses.add(detail);
      questions.push({ detail, question, answer_keywords: [candidate.word] });
    }
  }
  return { questions };
}

// ---------------------------------------------------------------------------
// Ownership assessment

type AssessQuestion = { number: number; expected_detail: string; owner_answer: string };

const VAGUE = [
  "don't know",
  "dont know",
  "not sure",
  "no idea",
  "i forgot",
  "لا أعرف",
  "لا اعرف",
  "مدري",
  "ما أتذكر",
  "ما اتذكر",
  "لا أتذكر",
  "لا اتذكر",
  "ما أدري",
];

/** supports when answers contain the expected words, conflicts when a colour or brand differs. */
export function fixtureAssessment(items: AssessQuestion[]) {
  const notes: string[] = [];
  let supported = 0;
  let conflict = false;

  for (const item of items) {
    const expected = words(item.expected_detail).map((entry) => entry.key);
    const answer = words(item.owner_answer).map((entry) => entry.key);
    const answerKeys = new Set(answer);
    const expectedColours = new Set(expected.map((key) => COLOURS[key]).filter(Boolean));
    const answerColours = new Set(answer.map((key) => COLOURS[key]).filter(Boolean));
    const expectedBrands = new Set(expected.map((key) => BRANDS[key]).filter(Boolean));
    const answerBrands = new Set(answer.map((key) => BRANDS[key]).filter(Boolean));
    const differs = (left: Set<string>, right: Set<string>) =>
      left.size > 0 && right.size > 0 && ![...right].some((value) => left.has(value));

    const hits = expected.filter(
      (key) => key.length >= 3 && !STOP.has(key) && answerKeys.has(key),
    );
    const sameBrandOrColour =
      [...answerBrands].some((value) => expectedBrands.has(value)) ||
      [...answerColours].some((value) => expectedColours.has(value));
    const normalizedAnswer = normalizeText(item.owner_answer);
    const vague = normalizedAnswer.length < 4 || VAGUE.some((phrase) => normalizedAnswer.includes(phrase));

    if (differs(expectedColours, answerColours)) {
      conflict = true;
      notes.push(`Answer ${item.number} names a different colour.`);
    } else if (differs(expectedBrands, answerBrands)) {
      conflict = true;
      notes.push(`Answer ${item.number} names a different brand.`);
    } else if ((hits.length > 0 || sameBrandOrColour) && !vague) {
      supported += 1;
      notes.push(`Answer ${item.number} matches the expected detail.`);
    } else {
      notes.push(`Answer ${item.number} is too general to confirm the detail.`);
    }
  }

  const assessment = conflict
    ? "conflicts"
    : items.length > 0 && supported === items.length
      ? "supports"
      : "unclear";
  return {
    assessment,
    explanation: notes.slice(0, 3).join(" ") || "No answers to assess.",
  };
}

// ---------------------------------------------------------------------------
// Request dispatch

type Schema = { properties?: Record<string, unknown> };

function candidateLabelsFrom(schema: Schema): string[] {
  const results = schema.properties?.results as
    | { items?: { properties?: { candidate?: { enum?: unknown } } } }
    | undefined;
  const labels = results?.items?.properties?.candidate?.enum;
  return Array.isArray(labels) ? labels.map(String) : [];
}

/** Builds the JSON Gemini would return for this request. Pure; no delay. */
export function fakeGeminiResponse(input: string, schema: Schema): unknown {
  const dataLine = input.split("\n")[1] ?? "{}";
  const data = JSON.parse(dataLine) as Record<string, unknown>;
  const properties = schema.properties ?? {};

  if ("results" in properties) {
    const newReport = data.new_report as ReportData & { report_type: "lost" | "found" };
    const candidates = (data.candidates ?? []) as (ReportData & { label: string })[];
    const labels = candidateLabelsFrom(schema);
    return {
      results: labels.map((label) => {
        const candidate = candidates.find((item) => item.label === label);
        if (!candidate) {
          throw new Error(`Fixture Gemini: no candidate for label ${label}.`);
        }
        const result =
          newReport.report_type === "lost"
            ? compareFixtureReports(newReport, candidate)
            : compareFixtureReports(candidate, newReport);
        return { candidate: label, ...result };
      }),
    };
  }
  if ("decision" in properties) {
    return compareFixtureReports(data.lost_report as ReportData, data.found_report as ReportData);
  }
  if ("questions" in properties) {
    return fixtureOwnershipQuestions(data.lost_report as ReportData, data.found_report as ReportData);
  }
  if ("assessment" in properties) {
    return fixtureAssessment((data.questions ?? []) as AssessQuestion[]);
  }
  throw new Error("Fixture Gemini: unknown request schema.");
}

const MIN_DELAY_MS = 600;
const MAX_DELAY_MS = 1200;

/**
 * Answers like Gemini after a short delay, so loading states are visible.
 * Reports a fake 200 attempt for the app's timing logs.
 */
export async function fakeGeminiJson({
  input,
  schema,
  onAttempt,
}: {
  input: string;
  schema: Record<string, unknown>;
  onAttempt?: (attempt: { ms: number; status: number }) => void;
}): Promise<unknown> {
  const ms = MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
  await new Promise((resolve) => setTimeout(resolve, ms));
  onAttempt?.({ ms, status: 200 });
  return fakeGeminiResponse(input, schema as Schema);
}
