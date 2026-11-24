import type { Catalogue } from "@/i18n/config";

// The guided demo at /demo: a conversation at the lost-property desk about one
// fictional case, a blue umbrella lost in the library. The visitor is always
// the owner. Every value here is made up, and the staff decision is simulated.
// The handle colour is the clue: it never appears before staff verify it.

/** A run of slip text. A `clue` marks words the two reports share. */
export type Segment = { text: string; clue?: ClueKey };
export type ClueKey = "blue" | "folding" | "strap" | "library" | "sunday" | "handle";

type Slip = {
  item: string;
  description: Segment[];
  place: Segment[];
  time: Segment[];
};

const en = {
  metaTitle: "AMANAH | Try the demo",
  metaDescription:
    "A one-minute demo of Amanah: tell the desk what you lost, answer one question, and see a simulated staff decision. Nothing is saved or sent.",

  title: "Try Amanah in a minute",
  intro: "A fictional case at the lost-property desk. You are the owner. Nothing is saved or sent.",
  restart: "Restart demo",
  threadLabel: "Conversation with the desk",

  // Who is speaking, for screen readers.
  deskName: "Desk",
  youName: "You",
  typing: "The desk is writing",

  // The desk opens.
  greeting: "Lost something? Tell me what it is.",
  starterHint: "Pick the suggestion to send it.",
  starter: "I lost my blue umbrella in the library",

  // Saved, then the possible match with its one question.
  saved: "Saved privately. Comparing it with found reports now.",
  matchLead: "There is a possible match. One question so staff can check it:",
  question: "What color is the handle?",
  questionNote: "The found report stays private. You never see it.",
  answerChip: "Yellow · sample answer",
  answer: "Yellow",

  // Staff review, then the simulated decision.
  review: "Sent to staff review. Staff decide, not the AI.",
  reviewChip: "Pending staff review",
  showDecision: "Show the staff decision · simulated",
  decisionStamp: "Approved",
  decisionStampNote: "simulated",
  decisionTitle: "Staff approved your claim",
  decisionBody: "Your answer matched the found report. Staff then arrange the hand-over with you in person.",
  reveal: "See how it matched",
  hideReveal: "Hide the comparison",

  // The case tag beside the conversation.
  tag: {
    label: "Case tag",
    item: "Blue umbrella",
    kind: "Lost",
    foundKind: "Found",
    status: "Status",
    handle: "Handle",
    handleUnknown: "Not known yet",
    handleKnown: "Yellow",
    artAlt: "A blue folding umbrella. The handle is blank until staff verify its color.",
    artAltKnown: "A blue folding umbrella with a yellow handle.",
    // The tag's back face, shown when the decision lands.
    back: "Back of the case tag",
    backNote: "Staff arrange the hand-over in person.",
    flip: "Turn the tag over",
    stages: {
      start: "Waiting for your report",
      sent: "Sending",
      saved: "Saved privately",
      question: "One question to answer",
      answered: "Answer sent",
      review: "Staff review",
      decision: "Approved · simulated",
    },
  },

  // The optional staff preview.
  preview: {
    label: "Demo staff preview",
    title: "How the two reports matched",
    intro: "Staff see both reports side by side. The owner never does.",
    cluesTitle: "Shared clues",
    clues: {
      blue: "Blue",
      folding: "Folding umbrella",
      strap: "White strap",
      library: "Library, second floor",
      sunday: "Sunday afternoon",
      handle: "Yellow handle",
    } satisfies Record<ClueKey, string>,
    lostSlip: "Lost report · you",
    foundSlip: "Found report · the finder",
    sharedLegend: "Highlighted: details both reports share",
    verifiedLegend: "Green: verified by the owner's answer",
    handleTitle: "The handle color verified ownership",
    handleBody:
      "The lost report never mentioned the handle. The found report did, so that was the question for the owner.",
    asked: "Question",
    ownerSaid: "Owner answered",
    foundSays: "Found report says",
    verdict: "Result",
    verdictValue: "Matches · staff approved",
    slip: {
      item: "Item",
      description: "Description",
      place: "Where",
      time: "When",
    },
  },

  // The two fictional reports.
  lost: {
    item: "Umbrella",
    description: [
      { text: "Blue", clue: "blue" },
      { text: " " },
      { text: "folding umbrella", clue: "folding" },
      { text: " with a " },
      { text: "white strap", clue: "strap" },
      { text: "." },
    ],
    place: [
      { text: "Library, second floor", clue: "library" },
      { text: ", near the study tables." },
    ],
    time: [{ text: "Sunday afternoon", clue: "sunday" }],
  } as Slip,

  found: {
    item: "Umbrella",
    description: [
      { text: "Blue", clue: "blue" },
      { text: " " },
      { text: "folding umbrella", clue: "folding" },
      { text: ", " },
      { text: "white strap", clue: "strap" },
      { text: " and a " },
      { text: "yellow handle", clue: "handle" },
      { text: "." },
    ],
    place: [
      { text: "Under a table in the " },
      { text: "library, second floor", clue: "library" },
      { text: "." },
    ],
    time: [{ text: "Sunday", clue: "sunday" }, { text: ", around 5 pm" }],
  } as Slip,
};

const ar: typeof en = {
  metaTitle: "أمانة | جرّب أمانة",
  metaDescription:
    "تجربة أمانة في دقيقة: قل للمكتب وش ضيّعت، جاوب على سؤال واحد، وشوف قرار موظف (محاكاة). ما يُحفظ ولا يُرسل شي.",

  title: "جرّب أمانة في دقيقة",
  intro: "قصة خيالية على مكتب المفقودات. أنت صاحب الغرض، وما يُحفظ ولا يُرسل شي.",
  restart: "أعد التجربة",
  threadLabel: "المحادثة مع المكتب",

  deskName: "المكتب",
  youName: "أنت",
  typing: "المكتب يكتب",

  greeting: "ضيّعت شي؟ قل لي وش هو.",
  starterHint: "اختر الاقتراح وينرسل.",
  starter: "ضيّعت مظلتي الزرقاء في المكتبة",

  saved: "انحفظ بلاغك بخصوصية، والحين أقارنه بالأغراض الملقاة.",
  matchLead: "في احتمال تطابق. سؤال واحد عشان يتأكد الموظف:",
  question: "وش لون المقبض؟",
  questionNote: "بلاغ الغرض الملقى يبقى خاص، ما تشوفه.",
  answerChip: "أصفر · إجابة تجريبية",
  answer: "أصفر",

  review: "راحت لمراجعة الموظف. الموظف يقرر، مو الذكاء الاصطناعي.",
  reviewChip: "بانتظار مراجعة الموظف",
  showDecision: "اعرض قرار الموظف · محاكاة",
  decisionStamp: "موافَق عليه",
  decisionStampNote: "محاكاة",
  decisionTitle: "الموظف وافق على طلب الاستلام",
  decisionBody: "إجابتك طابقت بلاغ الغرض الملقى. بعدها الموظف يرتب معك الاستلام حضوريًا.",
  reveal: "شوف كيف تطابق",
  hideReveal: "أخفِ المقارنة",

  tag: {
    label: "بطاقة الحالة",
    item: "مظلة زرقاء",
    kind: "مفقود",
    foundKind: "ملقى",
    status: "الحالة",
    handle: "المقبض",
    handleUnknown: "ما نعرف بعد",
    handleKnown: "أصفر",
    artAlt: "مظلة زرقاء تنطوي. مقبضها فاضي لين يتأكد الموظف من لونه.",
    artAltKnown: "مظلة زرقاء تنطوي مقبضها أصفر.",
    back: "ظهر بطاقة الحالة",
    backNote: "الموظف يرتب معك الاستلام حضوريًا.",
    flip: "اقلب البطاقة",
    stages: {
      start: "بانتظار بلاغك",
      sent: "جاري الإرسال",
      saved: "محفوظ بخصوصية",
      question: "سؤال واحد ينتظرك",
      answered: "أُرسلت الإجابة",
      review: "مراجعة الموظف",
      decision: "موافَق عليه · محاكاة",
    },
  },

  preview: {
    label: "معاينة الموظف · تجربة",
    title: "كيف تطابق البلاغان",
    intro: "الموظف يشوف البلاغين جنب بعض، وصاحب الغرض ما يشوفهم.",
    cluesTitle: "تفاصيل مشتركة",
    clues: {
      blue: "زرقاء",
      folding: "مظلة تنطوي",
      strap: "حزام أبيض",
      library: "المكتبة، الدور الثاني",
      sunday: "الأحد العصر",
      handle: "مقبض أصفر",
    },
    lostSlip: "بلاغ المفقود · أنت",
    foundSlip: "بلاغ الغرض الملقى · اللي لقاها",
    sharedLegend: "المظلَّل: تفاصيل موجودة في البلاغين",
    verifiedLegend: "الأخضر: أكّدته إجابة صاحبها",
    handleTitle: "لون المقبض هو اللي أكّد الملكية",
    handleBody: "بلاغ المفقود ما ذكر المقبض أبدًا، وبلاغ الغرض الملقى ذكره. عشان كذا كان هو سؤال التأكد.",
    asked: "السؤال",
    ownerSaid: "إجابة صاحبها",
    foundSays: "بلاغ الغرض الملقى",
    verdict: "النتيجة",
    verdictValue: "متطابق · الموظف وافق",
    slip: {
      item: "الغرض",
      description: "الوصف",
      place: "المكان",
      time: "الوقت",
    },
  },

  lost: {
    item: "مظلة",
    description: [
      { text: "مظلة تنطوي", clue: "folding" },
      { text: " " },
      { text: "زرقاء", clue: "blue" },
      { text: "، معها " },
      { text: "حزام أبيض", clue: "strap" },
      { text: "." },
    ],
    place: [
      { text: "المكتبة، الدور الثاني", clue: "library" },
      { text: "، قريب من طاولات المذاكرة." },
    ],
    time: [{ text: "الأحد العصر", clue: "sunday" }],
  },

  found: {
    item: "مظلة",
    description: [
      { text: "مظلة تنطوي", clue: "folding" },
      { text: " " },
      { text: "زرقاء", clue: "blue" },
      { text: "، " },
      { text: "حزامها أبيض", clue: "strap" },
      { text: " و" },
      { text: "مقبضها أصفر", clue: "handle" },
      { text: "." },
    ],
    place: [
      { text: "تحت طاولة في " },
      { text: "المكتبة، الدور الثاني", clue: "library" },
      { text: "." },
    ],
    time: [{ text: "الأحد", clue: "sunday" }, { text: "، حول الساعة 5 العصر" }],
  },
};

export const demo: Catalogue<typeof en> = { en, ar };
