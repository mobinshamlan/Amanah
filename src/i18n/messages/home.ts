import type { Catalogue } from "@/i18n/config";

// The homepage: one question, one sentence, two ways in, and the story of what
// happens after a report. Arabic first; English equally direct.
const en = {
  metaTitle: "AMANAH | Lost something? Found something?",
  metaDescription:
    "Report a lost or found item with Amanah. Reports are compared privately, and staff review every claim before anything is handed over.",

  // First screen
  heroHeadline: "Lost something? Found something?",
  heroSentence:
    "Report it with Amanah. Reports are compared privately, and staff review every claim.",
  heroImageAlt:
    "A lost-property desk in warm light: a set of keys with a paper tag, a drawer, and an empty counter.",
  reportLost: "Report a lost item",
  reportFound: "Report an item you found",
  trackPrompt: "Already reported?",
  trackLink: "Follow it from the private link you saved",
  actionsLabel: "Report an item",

  // What happens after a report
  afterTitle: "What happens after a report?",
  afterIntro: "Three things, in this order. Nothing is published along the way.",
  scenes: [
    {
      title: "Reports are compared privately",
      caption:
        "Your report is compared with reports of the other kind. Nobody browses found items, and nothing is listed.",
      alt: "Two blank report slips side by side under a brass magnifier, with a small padlock beside them.",
    },
    {
      title: "A question for the owner",
      caption:
        "Only when there is a possible match. The owner answers one or two questions about the item; the AI only suggests.",
      alt: "A paper card with a cut-out question mark, standing in a brass holder.",
    },
    {
      title: "Staff review before handover",
      caption:
        "Staff check the answers and decide. If you found the item, your part ends once your report is saved.",
      alt: "A kraft parcel with a keyhole tag, a desk bell and a stamp, ready for the staff desk.",
    },
  ],

  // The promise and the close
  promiseTitle: "Your report stays an amanah",
  promises: [
    { title: "No public gallery", body: "Found-item details are never shown publicly; only staff review them." },
    {
      title: "Only your own report",
      body: "Your private link shows your report's progress, nothing else.",
    },
    { title: "Staff decide", body: "An AI suggestion never proves ownership. Staff do." },
  ],
  closeLine: "Ready when you are.",
};

const ar: typeof en = {
  metaTitle: "أمانة | ضيّعت شي؟ أو لقيت شي؟",
  metaDescription:
    "بلّغ عن شي ضيّعته أو لقيته مع أمانة. نقارن البلاغات بخصوصية، والموظف يراجع كل طلب استلام قبل التسليم.",

  heroHeadline: "ضيّعت شي؟ أو لقيت شي؟",
  heroSentence: "بلّغ عنه بأمانة. نقارن البلاغات بخصوصية، والموظف يراجع طلب الاستلام.",
  heroImageAlt: "مكتب مفقودات بإضاءة دافية: مفاتيح معها بطاقة ورقية، ودرج، وطاولة فاضية.",
  reportLost: "بلّغ عن مفقود",
  reportFound: "بلّغ عن غرض لقيته",
  trackPrompt: "عندك بلاغ؟",
  trackLink: "تابعه من الرابط الخاص اللي حفظته",
  actionsLabel: "بلّغ عن غرض",

  afterTitle: "وش يصير بعد البلاغ؟",
  afterIntro: "ثلاث خطوات بهالترتيب، وما ينشر شي في الطريق.",
  scenes: [
    {
      title: "نقارن البلاغات بخصوصية",
      caption: "بلاغك يُقارن مع بلاغات النوع الثاني بسرّية. ما أحد يتصفح الأغراض، ولا شي يُعرض.",
      alt: "ورقتا بلاغ فاضيتين جنب بعض تحت عدسة نحاسية، وقفل صغير بجانبهم.",
    },
    {
      title: "سؤال لصاحب الغرض",
      caption:
        "بس إذا في احتمال تطابق. صاحب الغرض يجاوب على سؤال أو سؤالين عن تفاصيله، والذكاء الاصطناعي يقترح بس.",
      alt: "بطاقة ورقية فيها علامة استفهام مفرّغة، واقفة في حامل نحاسي.",
    },
    {
      title: "الموظف يراجع قبل التسليم",
      caption: "الموظف يراجع الإجابات ويقرر. وإذا أنت اللي لقيت الغرض، دورك ينتهي بعد ما يُحفظ بلاغك.",
      alt: "طرد ورقي عليه بطاقة بفتحة مفتاح، وجرس مكتب، وختم، جاهز لمكتب الموظف.",
    },
  ],

  promiseTitle: "بلاغك يبقى أمانة",
  promises: [
    { title: "ما في معرض عام", body: "تفاصيل الأغراض اللي لُقيت ما تنعرض للعامة، ويراجعها الموظف بس." },
    { title: "بلاغك بس", body: "رابطك الخاص يعرض حالة بلاغك، ولا شي غيره." },
    { title: "الموظف هو اللي يقرر", body: "اقتراح الذكاء الاصطناعي ما يثبت الملكية. الموظف يقرر." },
  ],
  closeLine: "جاهز؟ بلّغ من هنا.",
};

export const home: Catalogue<typeof en> = { en, ar };
