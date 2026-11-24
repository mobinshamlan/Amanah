import type { Catalogue } from "@/i18n/config";

// The two reporting forms: lost and found. Arabic is short Saudi Arabic, the
// way the person at the desk would ask; English is just as direct. Found-item
// details are used only privately, to check an owner's answers, so the found
// form asks for the general picture plus the one or two details only the
// owner would know. Each kind has three example sets (item, description and
// place that belong together); one is picked per visit, and each field's chip
// fills only that field. The lost sets describe the same items as the test
// version's sample found reports, so trying one shows a possible match.

type Kind = "lost" | "found";

// Limits read as "2,000" in both languages (Latin digits, grouped).
const digits = (n: number) => n.toLocaleString("en");

type ExampleSet = { itemName: string; description: string; location: string };

type KindCopy = {
  metaTitle: string;
  metaDescription: string;
  kind: string;
  title: string;
  intro: string;
  formLabel: string;
  // Three example sets; one is shown per visit, and each chip fills its field.
  examples: [ExampleSet, ExampleSet, ExampleSet];
  descriptionLabel: string;
  descriptionHint: string;
  locationLabel: string;
  locationHint: string;
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
  // Only in the test version, beside the save button.
  sandboxNote: "Test version: your report is deleted after 3 days.",
  // The chip under each field: tapping it writes the example into the field.
  fillLabel: "Fill with example",
  fillGroupLabel: (field: string) => `Example that fills “${field}”`,
  itemNameLabel: "What is it?",
  itemNameHint: "A few words that name the item.",
  itemNameRequired: "Write what the item is.",
  itemNameTooLong: (max: number) => `Keep the item name to ${digits(max)} characters.`,
  descriptionRequired: "Add a short description so the item can be recognised.",
  descriptionTooLong: (max: number) => `Keep the description to ${digits(max)} characters.`,
  locationTooLong: (max: number) => `Keep the location to ${digits(max)} characters.`,
  counter: (used: string, max: string) => `${used} / ${max}`,
  counterLabel: "Characters used",
  overLimit: (over: string) => `${over} over the limit`,
  privacy: "Your report is never published. It is compared privately using Google Gemini to find possible matches.",
  privacyFound: "Only staff see these details. They are compared privately using Google Gemini.",
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
      intro: "Describe it so it can be recognised.",
      artAlt: "Two report slips under a brass magnifier on the desk, with a closed padlock beside them.",
      formLabel: "Lost item report",
      examples: [
        {
          itemName: "Blue folding umbrella",
          description: "Blue folding umbrella with a curved yellow handle. A bus card was in the sleeve.",
          location: "The library, second floor, near the study tables, Tuesday afternoon",
        },
        {
          itemName: "Black leather wallet",
          description:
            "Black leather wallet with my university ID and a bank card, and a little cash.",
          location: "The cafeteria, near the drinks counter, around noon",
        },
        {
          itemName: "Set of keys with a leather tag",
          description: "Three keys on a metal ring with a small brown leather tag, and a car key.",
          location: "Main building entrance, by the parking, this morning",
        },
      ],
      descriptionLabel: "Describe it",
      descriptionHint: "Colour, brand, size, what was inside, marks or scratches.",
      locationLabel: "Where did you last have it?",
      locationHint: "A building, room or area, and when if you remember.",
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
      intro: "Describe it, plus a detail only the owner would know.",
      artAlt: "A wrapped parcel with a tag on the desk, next to a service bell and a brass stamp.",
      formLabel: "Found item report",
      examples: [
        {
          itemName: "Phone in a green case",
          description:
            "A phone in a dark green silicone case with a card holder on the back. The lock screen photo is of a cat.",
          location: "Lecture hall 3, back row, after the morning class",
        },
        {
          itemName: "Grey backpack",
          description:
            "Grey backpack with a laptop pocket. Inside: a red notebook, a charger and a water bottle with stickers.",
          location: "The prayer room by the gym, around Asr",
        },
        {
          itemName: "White earbuds case",
          description:
            "A white earbuds case with both earbuds inside. There is a small scratch and a blue dot sticker on the lid.",
          location: "Bus stop outside the main gate, early evening",
        },
      ],
      descriptionLabel: "Describe it",
      descriptionHint: "The general look, plus one or two details only the owner would know.",
      locationLabel: "Where did you find it?",
      locationHint: "A building, room or area, and when.",
      locationRequired: "Tell us where you found it.",
      afterTitle: "After you save",
      afterSteps: [
        "Hand the item to the lost-and-found staff.",
        "Your part ends there. Matching happens privately and you are not told about it.",
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
  sandboxNote: "نسخة تجريبية: بلاغك ينحذف بعد 3 أيام.",
  fillLabel: "عبّها بمثال",
  fillGroupLabel: (field) => `مثال يعبّي «${field}»`,
  itemNameLabel: "وش هو؟",
  itemNameHint: "كلمتين تسمّي فيها الغرض.",
  itemNameRequired: "اكتب وش الغرض.",
  itemNameTooLong: (max) => `اسم الغرض لازم يكون ${digits(max)} حرف أو أقل.`,
  descriptionRequired: "أضف وصف مختصر حتى نقدر نعرف الغرض.",
  descriptionTooLong: (max) => `الوصف لازم يكون ${digits(max)} حرف أو أقل.`,
  locationTooLong: (max) => `المكان لازم يكون ${digits(max)} حرف أو أقل.`,
  counter: (used, max) => `${used} / ${max}`,
  counterLabel: "عدد الأحرف",
  overLimit: (over) => `زيادة ${over} حرف عن الحد`,
  privacy: "بلاغك ما يُنشر أبدًا. نقارنه بخصوصية باستخدام Google Gemini عشان نلقى احتمالات التطابق.",
  privacyFound: "ما يشوف هالتفاصيل إلا الموظف، ونقارنها بخصوصية باستخدام Google Gemini.",
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
      intro: "اوصفه بشكل يخلّينا نعرفه.",
      artAlt: "ورقتي بلاغ تحت عدسة نحاسية على الطاولة، وجنبها قفل مغلق.",
      formLabel: "بلاغ عن غرض مفقود",
      examples: [
        {
          itemName: "مظلة زرقاء",
          description: "مظلة زرقاء قابلة للطي، مقبضها أصفر منحني. كان في غلافها بطاقة باص.",
          location: "المكتبة، الطابق الثاني قرب طاولات المذاكرة، الثلاثاء العصر",
        },
        {
          itemName: "محفظة جلد سوداء",
          description: "محفظة جلد سوداء فيها بطاقتي الجامعية وبطاقة بنكية، وشوية كاش.",
          location: "الكافتيريا الرئيسية قرب الكاشير، حول الظهر",
        },
        {
          itemName: "مفاتيح مع ميدالية جلد",
          description: "ثلاثة مفاتيح في حلقة واحدة مع ميدالية جلد بنية صغيرة، ومعها مفتاح سيارة.",
          location: "مدخل المبنى عند مواقف السيارات، الصباح",
        },
      ],
      descriptionLabel: "اوصفه",
      descriptionHint: "اللون، الماركة، الحجم، وش كان فيه، علامات أو خدوش.",
      locationLabel: "وين آخر مكان كان معك؟",
      locationHint: "مبنى أو قاعة أو منطقة، ومتى إذا تذكر.",
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
      intro: "اوصفه، وأضف تفصيل ما يعرفه إلا صاحبه.",
      artAlt: "طرد مربوط عليه بطاقة على الطاولة، وجنبه جرس خدمة وختم نحاسي.",
      formLabel: "بلاغ عن غرض لقيته",
      examples: [
        {
          itemName: "جوال بكفر أخضر",
          description: "جوال بكفر سيليكون أخضر غامق، وراه جيب بطاقات. خلفية القفل صورة قطوة.",
          location: "قاعة 3، الصف الأخير، بعد محاضرة الصباح",
        },
        {
          itemName: "شنطة ظهر رمادية",
          description: "شنطة ظهر رمادية فيها جيب لابتوب. داخلها دفتر أحمر وشاحن وقارورة موية عليها ملصقات.",
          location: "المصلى اللي جنب النادي، وقت العصر",
        },
        {
          itemName: "علبة سماعات بيضا",
          description: "علبة سماعات بيضا والسماعتين داخلها. على الغطا خدش صغير وملصق نقطة زرقا.",
          location: "موقف الباص عند البوابة الرئيسية، أول المغرب",
        },
      ],
      descriptionLabel: "اوصفه",
      descriptionHint: "الشكل العام، مع تفصيل أو تفصيلين ما يعرفها إلا صاحبه.",
      locationLabel: "وين لقيته؟",
      locationHint: "مبنى أو قاعة أو منطقة، ومتى.",
      locationRequired: "قل لنا وين لقيته.",
      afterTitle: "بعد الحفظ",
      afterSteps: [
        "سلّم الغرض لموظف المفقودات.",
        "دورك ينتهي هناك. المقارنة تصير بخصوصية وما نخبرك بنتيجتها.",
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
