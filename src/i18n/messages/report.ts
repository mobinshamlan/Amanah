import type { Catalogue } from "@/i18n/config";

// The two reporting forms: lost and found. Arabic is short Saudi Arabic, the
// way the person at the desk would ask; English is just as direct. Found-item
// details are used only privately, to check an owner's answers, so the found
// form asks for the general picture plus the one or two details only the
// owner would know. Each field has one tappable example that fills it in.

type Kind = "lost" | "found";

// Limits read as "2,000" in both languages (Latin digits, grouped).
const digits = (n: number) => n.toLocaleString("en");

type KindCopy = {
  metaTitle: string;
  metaDescription: string;
  kind: string;
  title: string;
  intro: string;
  formLabel: string;
  // One tappable example per field; tapping writes it into the field.
  itemNameFill: string;
  descriptionLabel: string;
  descriptionHint: string;
  descriptionFill: string;
  locationLabel: string;
  locationHint: string;
  locationFill: string;
  locationRequired: string;
  afterTitle: string;
  afterSteps: string[];
  // The stage picture behind the headline, for assistive tech.
  artAlt: string;
  submit: string;
  saving: string;
  savedTitle: string;
  savedIntro: string;
};

const en = {
  required: "Every field is needed.",
  // The chip under each field: tapping it writes the example into the field.
  fillLabel: "Try an example",
  fillGroupLabel: (field: string) => `Example that fills “${field}”`,
  afterLead: "After you save",
  itemNameLabel: "What is it?",
  itemNameHint: "A few words that name the item.",
  itemNameRequired: "Write what the item is, for example “black wallet”.",
  itemNameTooLong: (max: number) => `Keep the item name to ${digits(max)} characters.`,
  descriptionRequired: "Add a short description so the item can be recognised.",
  descriptionTooLong: (max: number) => `Keep the description to ${digits(max)} characters.`,
  locationTooLong: (max: number) => `Keep the location to ${digits(max)} characters.`,
  counter: (used: string, max: string) => `${used} / ${max}`,
  counterLabel: "Characters used",
  overLimit: (over: string) => `${over} over the limit`,
  privacy: "Your report is never published. It is compared privately using Google Gemini to find possible matches.",
  privacyFound: "Only staff see these details, and they are compared privately using Google Gemini. Staff use them to check an owner’s answers.",
  fixHighlighted: "Please fix the highlighted fields.",
  saveFailed: "Your report was not saved. Check your connection and try again.",
  busy: "Amanah is busy right now. Your report was not saved. Please try again in a few minutes.",
  retry: "Try again",
  savedContext: "Report saved",
  noTrackingLink:
    "A private tracking link could not be created for this report, so its progress cannot be followed later. Your report is still saved.",
  savingStatus: "Saving your report…",
  kinds: {
    lost: {
      metaTitle: "Report a lost item | AMANAH",
      metaDescription:
        "Describe what you lost. Your report stays private and you get a private link to follow it.",
      kind: "Lost",
      title: "What did you lose?",
      intro:
        "Describe it so it can be recognised. You get a private link to follow your report; found items are never shown to you.",
      artAlt: "Two report slips under a brass magnifier on the desk, with a closed padlock beside them.",
      formLabel: "Lost item report",
      itemNameFill: "Blue umbrella",
      descriptionLabel: "Describe it",
      descriptionHint: "Colour, brand, size, what was inside, marks or scratches.",
      descriptionFill:
        "Navy folding umbrella with a curved yellow handle and a small tear on one panel. Had a bus card in the sleeve.",
      locationLabel: "Where did you last have it?",
      locationHint: "A building, room or area, and when if you remember.",
      locationFill: "Building B library, second floor, Tuesday afternoon",
      locationRequired: "Tell us where you last had it, even roughly.",
      afterTitle: "After you save",
      afterSteps: [
        "You get a private link. Keep it; it is the only way to follow this report.",
        "Your report is compared with found-item reports privately. Nothing is shown to you.",
        "If there is a possible match, you answer a question or two and staff decide.",
      ],
      submit: "Save report",
      saving: "Saving…",
      savedTitle: "Lost report saved",
      savedIntro: "Your report is saved.",
    },
    found: {
      metaTitle: "Report a found item | AMANAH",
      metaDescription:
        "Describe what you found. Details stay private and are used only to confirm the owner.",
      kind: "Found",
      title: "What did you find?",
      intro:
        "Describe it in general, then add a detail or two only the owner would know. Staff use them privately to confirm the owner.",
      artAlt: "A wrapped parcel with a tag on the desk, next to a service bell and a brass stamp.",
      formLabel: "Found item report",
      itemNameFill: "Set of keys",
      descriptionLabel: "Describe it",
      descriptionHint:
        "The general look, plus one or two details only the owner would know (a keyring, what is inside, a name).",
      descriptionFill:
        "Three keys on a ring with a small leather tag. One is a car key. The tag has initials on it.",
      locationLabel: "Where did you find it?",
      locationHint: "A building, room or area, and when.",
      locationFill: "Cafeteria, table by the window, around noon",
      locationRequired: "Tell us where you found it.",
      afterTitle: "After you save",
      afterSteps: [
        "Hand the item to the lost-and-found staff.",
        "Your part ends there. Matching happens privately and you are not told about it.",
        "The details you write stay private and are used only to check an owner’s answers.",
      ],
      submit: "Save report",
      saving: "Saving…",
      savedTitle: "Found report saved",
      savedIntro: "Thank you. Your report is saved.",
    },
  } satisfies Record<Kind, KindCopy>,
};

const ar: typeof en = {
  required: "كل الخانات مطلوبة.",
  fillLabel: "جرّب مثال",
  fillGroupLabel: (field) => `مثال يعبّي «${field}»`,
  afterLead: "بعد الحفظ",
  itemNameLabel: "وش هو؟",
  itemNameHint: "كلمتين تسمّي فيها الغرض.",
  itemNameRequired: "اكتب وش الغرض، مثلاً «محفظة سودا».",
  itemNameTooLong: (max) => `اسم الغرض لازم يكون ${digits(max)} حرف أو أقل.`,
  descriptionRequired: "أضف وصف مختصر حتى نقدر نعرف الغرض.",
  descriptionTooLong: (max) => `الوصف لازم يكون ${digits(max)} حرف أو أقل.`,
  locationTooLong: (max) => `المكان لازم يكون ${digits(max)} حرف أو أقل.`,
  counter: (used, max) => `${used} / ${max}`,
  counterLabel: "عدد الأحرف",
  overLimit: (over) => `زيادة ${over} حرف عن الحد`,
  privacy: "بلاغك ما يُنشر أبدًا. نقارنه بخصوصية باستخدام Google Gemini عشان نلقى احتمالات التطابق.",
  privacyFound: "ما يشوف هالتفاصيل إلا الموظف، ونقارنها بخصوصية باستخدام Google Gemini. الموظف يستخدمها يتأكد من إجابات صاحب الغرض.",
  fixHighlighted: "راجع الخانات المعلّمة.",
  saveFailed: "ما انحفظ بلاغك. تأكد من الاتصال وجرّب مرة ثانية.",
  busy: "أمانة مشغولة حالياً وما انحفظ بلاغك. جرّب بعد دقايق.",
  retry: "جرّب مرة ثانية",
  savedContext: "تم حفظ البلاغ",
  noTrackingLink: "ما قدرنا ننشئ رابط متابعة خاص لهذا البلاغ، فما تقدر تتابعه لاحقاً. بلاغك محفوظ.",
  savingStatus: "جاري حفظ بلاغك…",
  kinds: {
    lost: {
      metaTitle: "بلّغ عن مفقود | أمانة",
      metaDescription: "اوصف اللي ضاع منك. بلاغك خاص، وتاخذ رابط خاص تتابعه فيه.",
      kind: "مفقود",
      title: "وش اللي ضاع منك؟",
      intro: "اوصفه بشكل يخلّينا نعرفه. تاخذ رابط خاص تتابع فيه بلاغك، وما نعرض لك أي غرض لُقي.",
      artAlt: "ورقتي بلاغ تحت عدسة نحاسية على الطاولة، وجنبها قفل مغلق.",
      formLabel: "بلاغ عن غرض مفقود",
      itemNameFill: "مظلة زرقا",
      descriptionLabel: "اوصفه",
      descriptionHint: "اللون، الماركة، الحجم، وش كان فيه، علامات أو خدوش.",
      descriptionFill:
        "مظلة كحلية تنطوي، مقبضها أصفر معقوف، وفيها قطع صغير بجهة وحدة. كان في غلافها بطاقة باص.",
      locationLabel: "وين آخر مكان كان معك؟",
      locationHint: "مبنى أو قاعة أو منطقة، ومتى إذا تذكر.",
      locationFill: "مكتبة مبنى ب، الدور الثاني، الثلاثاء العصر",
      locationRequired: "قل لنا وين آخر مكان كان معك، حتى لو تقريبي.",
      afterTitle: "بعد الحفظ",
      afterSteps: [
        "تاخذ رابط خاص. احفظه، لأنه الطريقة الوحيدة لمتابعة البلاغ.",
        "نقارن بلاغك مع بلاغات الأغراض اللي لُقيت بخصوصية، وما نعرض لك شي.",
        "إذا في احتمال تطابق تجاوب على سؤال أو سؤالين، والموظف يقرر.",
      ],
      submit: "احفظ البلاغ",
      saving: "جاري الحفظ…",
      savedTitle: "تم حفظ بلاغ المفقود",
      savedIntro: "بلاغك محفوظ.",
    },
    found: {
      metaTitle: "بلّغ عن غرض لقيته | أمانة",
      metaDescription: "اوصف اللي لقيته. التفاصيل تبقى خاصة، ونستخدمها بس نتأكد من صاحبه.",
      kind: "ملقى",
      title: "وش اللي لقيته؟",
      intro: "اوصفه بشكل عام، وأضف تفصيل أو تفصيلين ما يعرفها إلا صاحبه. الموظف يستخدمها بخصوصية يتأكد منه.",
      artAlt: "طرد مربوط عليه بطاقة على الطاولة، وجنبه جرس خدمة وختم نحاسي.",
      formLabel: "بلاغ عن غرض لقيته",
      itemNameFill: "مفاتيح",
      descriptionLabel: "اوصفه",
      descriptionHint: "الشكل العام، مع تفصيل أو تفصيلين ما يعرفها إلا صاحبه (ميدالية، وش فيه، اسم).",
      descriptionFill:
        "ثلاث مفاتيح بحلقة ومعها ميدالية جلد صغيرة. واحد منها مفتاح سيارة. على الميدالية حرفين.",
      locationLabel: "وين لقيته؟",
      locationHint: "مبنى أو قاعة أو منطقة، ومتى.",
      locationFill: "الكافتيريا، الطاولة اللي عند الشباك، حول الظهر",
      locationRequired: "قل لنا وين لقيته.",
      afterTitle: "بعد الحفظ",
      afterSteps: [
        "سلّم الغرض لموظف المفقودات.",
        "دورك ينتهي هناك. المقارنة تصير بخصوصية وما نخبرك بنتيجتها.",
        "التفاصيل اللي تكتبها تبقى خاصة، ونستخدمها بس نتأكد من إجابات صاحبه.",
      ],
      submit: "احفظ البلاغ",
      saving: "جاري الحفظ…",
      savedTitle: "تم حفظ بلاغ الغرض",
      savedIntro: "شكراً لك. بلاغك محفوظ.",
    },
  },
};

export const report: Catalogue<typeof en> = { en, ar };

export type ReportMessages = typeof en;
export type ReportKindMessages = KindCopy;
