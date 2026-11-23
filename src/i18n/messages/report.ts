import type { Catalogue } from "@/i18n/config";

// The two reporting forms: lost and found. Arabic is short Saudi Arabic, the
// way the person at the desk would ask; English is just as direct. Found-item
// details are used only privately, to check an owner's answers, so the found
// form asks for the general picture plus the one or two details only the
// owner would know.

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
  itemNamePlaceholder: string;
  descriptionLabel: string;
  descriptionHint: string;
  descriptionPlaceholder: string;
  locationLabel: string;
  locationHint: string;
  locationPlaceholder: string;
  locationRequired: string;
  guideTitle: string;
  guide: string[];
  afterTitle: string;
  after: string;
  submit: string;
  saving: string;
  savedTitle: string;
  savedIntro: string;
};

const en = {
  required: "Every field is needed.",
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
  privacy: "Reports are private. Nothing you write here is shown publicly.",
  privacyFound: "Found-item details stay private: only staff see them, and they are used to check an owner’s answers.",
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
      formLabel: "Lost item report",
      itemNamePlaceholder: "Black leather wallet",
      descriptionLabel: "Describe it",
      descriptionHint: "Colour, brand, size, what was inside, marks or scratches.",
      descriptionPlaceholder:
        "Black bifold wallet, worn at the corners. Had a Riyadh Bank card, a university ID, and a small photo inside.",
      locationLabel: "Where did you last have it?",
      locationHint: "A building, room, or area, and when if you remember.",
      locationPlaceholder: "Building B library, second floor, Tuesday afternoon",
      locationRequired: "Tell us where you last had it, even roughly.",
      guideTitle: "What helps",
      guide: [
        "Name the item plainly, the way you would say it to someone at the desk.",
        "Mention what makes it yours: contents, marks, a sticker, a scratch.",
        "Say where you last remember having it, even roughly.",
      ],
      afterTitle: "After you save",
      after:
        "You get a private link. Amanah compares your report with found-item reports privately; if there is a possible match, you answer a few questions and staff decide.",
      submit: "Save my lost report",
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
      formLabel: "Found item report",
      itemNamePlaceholder: "Set of keys",
      descriptionLabel: "Describe it",
      descriptionHint:
        "The general look, plus one or two details only the owner would know (a keyring, what is inside, a name).",
      descriptionPlaceholder:
        "Three keys on a ring with a small leather tag. One key is a car key. The tag has initials on it.",
      locationLabel: "Where did you find it?",
      locationHint: "A building, room, or area, and when.",
      locationPlaceholder: "Cafeteria, table by the window, around noon",
      locationRequired: "Tell us where you found it.",
      guideTitle: "What helps",
      guide: [
        "Describe the item in general: type, colour, size.",
        "Add one or two details only the owner would know. They stay private and help staff confirm the owner.",
        "Say where and when you found it.",
      ],
      afterTitle: "After you save",
      after:
        "Hand the item to the lost-and-found staff. Your part ends here: matching happens privately and you are not told about it.",
      submit: "Save my found report",
      saving: "Saving…",
      savedTitle: "Found report saved",
      savedIntro: "Thank you. Your report is saved.",
    },
  } satisfies Record<Kind, KindCopy>,
};

const ar: typeof en = {
  required: "كل الخانات مطلوبة.",
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
  privacy: "بلاغك خاص. اللي تكتبه هنا ما يظهر لأحد.",
  privacyFound: "تفاصيل الغرض تبقى خاصة: ما يشوفها إلا الموظف، ونستخدمها نتأكد من إجابات صاحبه.",
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
      formLabel: "بلاغ عن غرض مفقود",
      itemNamePlaceholder: "محفظة جلد سودا",
      descriptionLabel: "اوصفه",
      descriptionHint: "اللون، الماركة، الحجم، وش كان فيه، علامات أو خدوش.",
      descriptionPlaceholder:
        "محفظة سودا تنطبق نصّين، أطرافها مهترية. فيها بطاقة بنك الرياض، وبطاقة الجامعة، وصورة صغيرة.",
      locationLabel: "وين آخر مكان كان معك؟",
      locationHint: "مبنى أو قاعة أو منطقة، ومتى إذا تذكر.",
      locationPlaceholder: "مكتبة مبنى ب، الدور الثاني، الثلاثاء العصر",
      locationRequired: "قل لنا وين آخر مكان كان معك، حتى لو تقريبي.",
      guideTitle: "اللي يساعدنا",
      guide: [
        "سمّ الغرض بكلام عادي، مثل ما تقوله لموظف المكتب.",
        "اذكر وش يميّزه عندك: محتوياته، علامة، ملصق، خدش.",
        "قل وين آخر مكان تذكر إنه كان معك، حتى لو تقريبي.",
      ],
      afterTitle: "بعد الحفظ",
      after:
        "تاخذ رابط خاص. نقارن بلاغك مع بلاغات الأغراض اللي لُقيت بخصوصية، وإذا في احتمال تطابق تجاوب على كم سؤال والموظف يقرر.",
      submit: "احفظ بلاغ المفقود",
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
      formLabel: "بلاغ عن غرض لقيته",
      itemNamePlaceholder: "مفاتيح",
      descriptionLabel: "اوصفه",
      descriptionHint: "الشكل العام، مع تفصيل أو تفصيلين ما يعرفها إلا صاحبه (ميدالية، وش فيه، اسم).",
      descriptionPlaceholder:
        "ثلاث مفاتيح بحلقة ومعها ميدالية جلد صغيرة. واحد منها مفتاح سيارة. على الميدالية حرفين.",
      locationLabel: "وين لقيته؟",
      locationHint: "مبنى أو قاعة أو منطقة، ومتى.",
      locationPlaceholder: "الكافتيريا، الطاولة اللي عند الشباك، حول الظهر",
      locationRequired: "قل لنا وين لقيته.",
      guideTitle: "اللي يساعدنا",
      guide: [
        "اوصف الغرض بشكل عام: نوعه، لونه، حجمه.",
        "أضف تفصيل أو تفصيلين ما يعرفها إلا صاحبه. تبقى خاصة وتساعد الموظف يتأكد منه.",
        "قل وين ومتى لقيته.",
      ],
      afterTitle: "بعد الحفظ",
      after: "سلّم الغرض لموظف المفقودات. دورك ينتهي هنا: المقارنة تصير بخصوصية وما نخبرك بنتيجتها.",
      submit: "احفظ بلاغ الغرض",
      saving: "جاري الحفظ…",
      savedTitle: "تم حفظ بلاغ الغرض",
      savedIntro: "شكراً لك. بلاغك محفوظ.",
    },
  },
};

export const report: Catalogue<typeof en> = { en, ar };

export type ReportMessages = typeof en;
export type ReportKindMessages = KindCopy;
