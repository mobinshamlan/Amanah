import type { Catalogue } from "@/i18n/config";

// The lost reporter's side after submitting: the saved-link moment, the private
// tracking page, the step timeline, the ownership questions, and the found
// reporter's thank-you. Arabic is short Saudi Arabic spoken at the desk; English
// is equally direct. Nothing here promises more than the product does.

type Headline = { title: string; intro: string };

const en = {
  metaTitle: "Track your report — AMANAH",
  pageContext: "Your private tracking page",

  opening: { title: "Opening your link…", intro: "One moment while we fetch your report's status." } as Headline,
  loadingStatus: "Loading your report status…",

  /* Headlines for the lost report, by what matching says. */
  status: {
    checking: {
      title: "Checking your report now",
      intro:
        "We are privately comparing your report with the found items reported so far. Keep this page open until it finishes.",
    },
    pausedWaiting: {
      title: "Checking is paused for a moment",
      intro:
        "Amanah is busy. Checking continues by itself in about a minute if this page stays open. This is not a “no match” result.",
    },
    pausedStopped: {
      title: "Checking did not finish",
      intro:
        "Amanah is busy, so checking could not finish. Your report is saved, and this is not a “no match” result. Try again in a bit.",
    },
    failed: {
      title: "Checking did not finish",
      intro:
        "Something went wrong before checking finished. Your report is saved, and this is not a “no match” result. You can try again.",
    },
    unavailable: {
      title: "Checking is not available right now",
      intro:
        "Reports cannot be compared at the moment. Your report is saved, and this is not a “no match” result.",
    },
    stalled: {
      title: "Checking is taking longer than expected",
      intro: "It has not finished yet. Refresh the page to continue. Your report is saved.",
    },
    noMatch: {
      title: "No match so far",
      intro:
        "We compared your report with every found item reported so far. Open this link again to check your report's status.",
    },
    uncertain: {
      title: "No confirmed match so far",
      intro:
        "One or more found-item reports could not be judged from the details, so staff may review them. Come back to this link from time to time.",
    },
    possibleMatch: {
      title: "There is a possible match",
      intro: "A found-item report resembles your description. Next, a few simple questions about your item.",
    },
    possibleMatchPartial: "Some other comparisons did not finish.",
    lostAccess: {
      title: "The status is not shown here",
      intro: "Your report is saved, but its comparison status is no longer available on this page.",
    },
  } satisfies Record<string, Headline | string>,

  /* Headlines once ownership verification takes over. */
  ownership: {
    loading: {
      title: "There is a possible match",
      intro: "A found-item report resembles your description. We are preparing a few questions about your item.",
    },
    question: {
      title: "Answer a question about your item",
      intro: "A found-item report looks like yours. Your answer helps staff check it.",
    },
    followup: {
      title: "Staff have a question for you",
      intro: "Your answer goes straight to the staff reviewing your claim.",
    },
    staff_review: {
      title: "Your claim is with staff",
      intro:
        "There is a possible match and no questions for you. Staff review it and decide; come back to this link for updates.",
    },
    answers_received: {
      title: "Your answers arrived",
      intro: "Thank you. Staff review them and decide. Come back to this link for updates.",
    },
    approved: {
      title: "Staff approved your claim",
      intro: "Approval does not mean the item has been handed over. Contact lost-and-found staff to arrange pickup.",
    },
    rejected: {
      title: "Staff couldn't confirm ownership",
      intro: "If you think there was a mistake, contact your organization's lost-and-found staff.",
    },
    retry: {
      title: "There is a possible match",
      intro: "We could not prepare your questions just now. Details below.",
    },
  } satisfies Record<string, Headline>,

  aiNote:
    "This is an AI suggestion. It does not mean the item is yours, and nothing is handed over before staff confirm.",
  staffDecide: "Staff decide, not the AI.",
  staffContact: "Questions or news? Contact your organization's lost-and-found staff.",

  /* The saved-link moment, right after a lost report is submitted. */
  saved: {
    context: "Your report is saved",
    title: "Your report is saved",
    intro: "Its details stay private, and its status is further down.",
  },

  /* The case tag: the report's status and its four stages, on a paper tag. */
  tag: {
    title: "Your report",
    approvedNote: "Not handed over yet",
  },

  /* The private link card. */
  link: {
    title: "Your private link",
    body: "Keep it to come back to your report any time.",
    focalTitle: "Keep this link",
    focalBody:
      "It is the only way back to your report: there are no accounts or messages. Copy it before you close this page.",
    moreWays: "More ways to save",
    label: "Private tracking link",
    copy: "Copy link",
    copied: "Copied",
    copiedStatus: "Link copied. Paste it somewhere safe.",
    copyFailed: "Copying is not available here. The link is selected, so copy it yourself.",
    share: "Send it to myself",
    shareTitle: "My Amanah tracking link",
    shareText: "My private Amanah tracking link (do not share it):",
    shareFailed: "Sharing did not work. Copy the link instead.",
    bookmarkHint: "Or bookmark this page.",
    keepPrivate:
      "Keep it private: anyone with this link can see your report's progress and answer your questions.",
  },

  /* The step timeline. */
  steps: {
    title: "Your report's progress",
    step: (n: number) => `Step ${n}`,
    labels: {
      saved: "Report saved",
      matching: "Comparison",
      questions: "Ownership questions",
      decision: "Staff decision",
    },
    // Shorter names for phones, where only the current stage shows its full name.
    short: {
      saved: "Saved",
      matching: "Compare",
      questions: "Questions",
      decision: "Decision",
    },
    state: {
      done: "Done",
      active: "Now",
      paused: "Paused",
      waiting: "Pending staff review",
      stopped: "Did not finish",
      rejected: "Not confirmed",
      approved: "Approved",
      upcoming: "Later",
      conditional: "Only if there's a possible match",
    },
    conditionalNote: "Nothing to answer right now. Questions and a staff decision come only if there's a possible match.",
    toQuestion: "Go to your question",
    detail: {
      saved: "Your details are stored privately.",
      matchingActive: "This can take a little while. Keep this page open.",
      matchingActiveMatch: "A possible match turned up. Finishing the other comparisons…",
      matchingPaused: "Amanah is busy. Keep this page open, or try again later.",
      matchingDone: "Your report was compared with every found item reported so far.",
      matchingStopped: "Not every found item has been compared yet.",
      matchingLostAccess: "The status of this comparison is not shown here.",
      questionsUpcoming: "Only if there is a possible match: a few simple questions about your item.",
      questionsAfterMatch: "Starts once the comparison finishes.",
      questionsLoading: "Preparing your questions…",
      questionsActive: "Answer the question below.",
      questionsFollowup: "Staff have one more question.",
      questionsRetry: "The questions could not be prepared yet.",
      questionsNoneNeeded: "No questions are needed for this possible match.",
      questionsAnswered: "Your answers arrived.",
      questionsCompleted: "Completed.",
      decisionUpcoming: "Staff review the claim and decide.",
      decisionWaiting: "Waiting for staff review.",
      decisionWaitingAnswers: "Staff are reviewing your answers.",
      decisionApproved: "Approved for ownership follow-up.",
      decisionRejected: "Staff could not confirm this claim.",
    },
  },

  actions: {
    tryAgain: "Try again",
    refresh: "Refresh the page",
    reportAnotherLost: "Report another lost item",
    reportLost: "Report a lost item",
    reportAnotherFound: "Report another found item",
  },

  /* Someone opened /report/track without a link. */
  noLink: {
    title: "Open your private link",
    intro:
      "When you reported a lost item, you got a private link for it. Open that exact link from wherever you saved it.",
    places: ["Your browser's bookmarks", "A message you sent yourself", "Your browser history (search for “Amanah”)"],
    lostLink:
      "Lost the link? It cannot be recovered, because it is never stored on our side. You can report the item again.",
    noReport: "Haven't reported yet?",
  },

  /* A malformed or unknown link. */
  broken: {
    title: "This link doesn't open",
    intro: "Check that you opened the whole link, exactly as you saved it when you reported the item.",
    help: "If it still doesn't open, contact your organization's lost-and-found staff.",
  },

  /* The found reporter's confirmation. */
  found: {
    context: "Your report is saved",
    title: "Hand it to the lost-and-found desk",
    intro: "Thanks — your report is saved. Its details are never public; only lost-and-found staff review them.",
    // The finder's progress: only the stages that apply to a found report.
    steps: {
      handIn: "Hand the item in",
      handInShort: "Hand in",
    },
    nextTitle: "After you drop it off",
    nextBody: "Staff keep it safe and return it to its owner once they confirm who it belongs to.",
    finishing: "Your report is already saved. A last background check is finishing; keep this page open a moment.",
    finishingPaused:
      "Your report is already saved. A background check is paused because Amanah is busy; keep this page open, or try again later.",
    stalled: "Some automatic processing is taking longer than expected. Your report is saved. Refresh the page to continue.",
    rateLimited: "Some automatic processing did not finish because Amanah is busy. Your report is saved. Try again later.",
    failedRetry: "Some automatic processing did not finish. Your report is saved, and you can try again.",
    failed: "Some automatic processing did not finish. Your report is saved.",
    announce: {
      checking: "Report saved. Thank you.",
      complete: "Report saved. Thank you for reporting this item.",
    },
  },

  /* The ownership questions card. */
  verify: {
    loadingTitle: "Preparing your questions",
    loadingRow: "Preparing your questions…",
    questionIntro: "Answer from memory, in your own words. If you are not sure, say so rather than guessing.",
    followupTitle: "A question from staff",
    followupIntro: "Answer from memory, or say that you are not sure.",
    progress: (n: number, total: number) => `Question ${n} of ${total}`,
    help: "Answers can't be edited once sent. Staff decide; an answer alone doesn't prove ownership.",
    submit: "Send answer",
    saving: "Sending…",
    errors: {
      empty: "Write your answer first.",
      tooLong: (max: number) => `Keep your answer under ${max} characters.`,
      invalid: "This answer could not be accepted. Check it and try again.",
      invalidLink: "This link no longer works, so your answer was not saved.",
      saveFailed: "Your answer was not saved. It is still here, so try again.",
    },
    settled: {
      staff_review: {
        title: "Your claim is with staff",
        body: "There are no questions for you right now. Staff review this possible match and decide. Come back here for updates.",
      },
      answers_received: {
        title: "Your answers arrived",
        body: "Thank you. Staff review your answers and decide. Come back here for updates.",
      },
      approved: {
        title: "Staff approved your claim",
        body: "Approval does not mean the item has been handed over. Contact lost-and-found staff to arrange pickup.",
      },
      rejected: {
        title: "Staff couldn't confirm ownership",
        body: "If you think there was a mistake, contact your organization's lost-and-found staff.",
      },
    },
    retry: {
      title: "Questions not ready yet",
      busy: "We could not prepare your questions because Amanah is busy. Your report and the possible match are saved. This is not a “no match” result. Try again in a bit.",
      failed: "We could not prepare your questions right now. Your report and the possible match are saved. This is not a “no match” result.",
      unavailable: "Questions are not available right now. Your report and the possible match are saved, and staff can still review it. This is not a “no match” result.",
    },
    announce: {
      question: (n: number, total: number) => `Question ${n} of ${total}.`,
      followup: "Staff have one more question for you.",
    },
    chip: {
      approved: "Approved by staff",
      rejected: "Not confirmed",
      waiting: "Waiting for staff",
    },
  },
};

const ar: typeof en = {
  metaTitle: "تابع بلاغك — أمانة",
  pageContext: "صفحة متابعة خاصة",

  opening: { title: "نفتح رابطك…", intro: "لحظة، نجيب حالة بلاغك." },
  loadingStatus: "جاري تحميل حالة بلاغك…",

  status: {
    checking: {
      title: "نفحص بلاغك الآن",
      intro: "نقارن بلاغك بالأغراض اللي انبلغ عنها، بخصوصية. خلّ الصفحة مفتوحة لين يخلص الفحص.",
    },
    pausedWaiting: {
      title: "الفحص واقف شوي",
      intro:
        "أمانة مشغولة الحين. نكمل لحالنا بعد دقيقة تقريبًا لو بقت الصفحة مفتوحة. هذا ما يعني إنه ما في تطابق.",
    },
    pausedStopped: {
      title: "ما اكتمل الفحص",
      intro: "أمانة مشغولة الحين، فما قدرنا نكمل. بلاغك محفوظ، وهذا ما يعني إنه ما في تطابق. جرّب بعد شوي.",
    },
    failed: {
      title: "ما اكتمل الفحص",
      intro: "صار خطأ قبل ما يكمل الفحص. بلاغك محفوظ، وهذا ما يعني إنه ما في تطابق. تقدر تجرّب مرة ثانية.",
    },
    unavailable: {
      title: "الفحص غير متاح الحين",
      intro: "ما نقدر نقارن البلاغات حاليًا. بلاغك محفوظ، وهذا ما يعني إنه ما في تطابق.",
    },
    stalled: {
      title: "الفحص طوّل أكثر من المتوقع",
      intro: "ما خلص بعد. حدّث الصفحة ليكمل. بلاغك محفوظ.",
    },
    noMatch: {
      title: "ما لقينا تطابق للحين",
      intro:
        "قارنّا بلاغك بكل الأغراض اللي انبلغ عنها للحين. افتح هذا الرابط مرة ثانية وتشيّك على حالة بلاغك.",
    },
    uncertain: {
      title: "ما تأكد تطابق للحين",
      intro:
        "في بلاغ أو أكثر ما قدرنا نحكم عليه من التفاصيل، وممكن الموظف يراجعه. ارجع لهذا الرابط بين فترة وفترة.",
    },
    possibleMatch: {
      title: "في احتمال تطابق",
      intro: "في بلاغ عن غرض ملقى يشبه وصفك. الخطوة الجاية أسئلة بسيطة عن غرضك.",
    },
    possibleMatchPartial: "بعض المقارنات الثانية ما اكتملت.",
    lostAccess: {
      title: "حالة البلاغ ما تظهر هنا",
      intro: "بلاغك محفوظ، لكن ما نقدر نعرض حالة المقارنة في هذه الصفحة.",
    },
  },

  ownership: {
    loading: {
      title: "في احتمال تطابق",
      intro: "في بلاغ عن غرض ملقى يشبه وصفك. نجهّز لك أسئلة بسيطة عن غرضك.",
    },
    question: {
      title: "جاوب على سؤال عن غرضك",
      intro: "في بلاغ عن غرض ملقى يشبه غرضك. إجابتك تساعد الموظف يتأكد.",
    },
    followup: {
      title: "الموظف عنده سؤال لك",
      intro: "إجابتك توصل مباشرة للموظف اللي يراجع طلبك.",
    },
    staff_review: {
      title: "طلبك عند الموظف",
      intro: "في احتمال تطابق وما في أسئلة لك. الموظف يراجع ويقرر، وارجع لهذا الرابط تشوف الجديد.",
    },
    answers_received: {
      title: "وصلت إجاباتك",
      intro: "شكرًا لك. الموظف يراجعها ويقرر. ارجع لهذا الرابط تشوف الجديد.",
    },
    approved: {
      title: "وافق الموظف على طلبك",
      intro: "الموافقة ما تعني إن الغرض تسلّم. تواصل مع موظف المفقودات عشان ترتّب الاستلام.",
    },
    rejected: {
      title: "الموظف ما قدر يتأكد من الملكية",
      intro: "لو تشوف إن في خطأ، تواصل مع موظفي المفقودات في جهتك.",
    },
    retry: {
      title: "في احتمال تطابق",
      intro: "ما قدرنا نجهّز أسئلتك الحين. التفاصيل تحت.",
    },
  },

  aiNote: "هذا اقتراح من الذكاء الاصطناعي، وما يعني إن الغرض لك. ما يُسلَّم شي قبل ما يتأكد الموظف.",
  staffDecide: "الموظف هو اللي يقرر، مو الذكاء الاصطناعي.",
  staffContact: "عندك سؤال أو جديد؟ تواصل مع موظفي المفقودات في جهتك.",

  saved: {
    context: "تم حفظ بلاغك",
    title: "تم حفظ بلاغك",
    intro: "تفاصيله تبقى خاصة، وحالته تلقاها تحت.",
  },

  tag: {
    title: "بلاغك",
    approvedNote: "ما تسلّم بعد",
  },

  link: {
    title: "رابطك الخاص",
    body: "احفظه لترجع لبلاغك في أي وقت.",
    focalTitle: "احفظ هذا الرابط",
    focalBody: "هو طريقك الوحيد لبلاغك، ما عندنا حسابات ولا رسائل. انسخه قبل ما تسكّر الصفحة.",
    moreWays: "طرق ثانية للحفظ",
    label: "رابط المتابعة الخاص",
    copy: "انسخ الرابط",
    copied: "تم النسخ",
    copiedStatus: "نسخنا الرابط. الصقه في مكان آمن.",
    copyFailed: "النسخ ما اشتغل هنا. حدّدنا لك الرابط، انسخه بنفسك.",
    share: "أرسله لنفسي",
    shareTitle: "رابط متابعة بلاغي في أمانة",
    shareText: "رابط متابعة بلاغي الخاص في أمانة (ما تشاركه مع أحد):",
    shareFailed: "المشاركة ما اشتغلت. انسخ الرابط بدالها.",
    bookmarkHint: "أو احفظ هذه الصفحة في الإشارات المرجعية.",
    keepPrivate: "خلّه عندك: أي أحد يفتح الرابط يشوف حالة بلاغك ويقدر يجاوب على أسئلتك.",
  },

  steps: {
    title: "مراحل بلاغك",
    step: (n) => `المرحلة ${n}`,
    labels: {
      saved: "حفظ البلاغ",
      matching: "المقارنة",
      questions: "أسئلة الملكية",
      decision: "قرار الموظف",
    },
    short: {
      saved: "الحفظ",
      matching: "المقارنة",
      questions: "الأسئلة",
      decision: "القرار",
    },
    state: {
      done: "تم",
      active: "الحين",
      paused: "واقف شوي",
      waiting: "بانتظار مراجعة الموظف",
      stopped: "ما اكتمل",
      rejected: "ما تأكد",
      approved: "وافق الموظف",
      upcoming: "بعدين",
      conditional: "بس لو فيه احتمال تطابق",
    },
    conditionalNote: "ما فيه شي تجاوب عليه الحين. الأسئلة وقرار الموظف بس لو فيه احتمال تطابق.",
    toQuestion: "روح لسؤالك",
    detail: {
      saved: "تفاصيلك محفوظة بخصوصية.",
      matchingActive: "ممكن يأخذ شوي. خلّ الصفحة مفتوحة.",
      matchingActiveMatch: "طلع احتمال تطابق، ونكمل باقي المقارنات…",
      matchingPaused: "أمانة مشغولة. خلّ الصفحة مفتوحة أو جرّب بعدين.",
      matchingDone: "قارنّا بلاغك بكل الأغراض اللي انبلغ عنها.",
      matchingStopped: "ما قارنّا كل الأغراض بعد.",
      matchingLostAccess: "حالة المقارنة ما تظهر هنا.",
      questionsUpcoming: "لو في احتمال تطابق، نسألك أسئلة بسيطة عن غرضك.",
      questionsAfterMatch: "تبدأ لما تخلص المقارنة.",
      questionsLoading: "نجهّز أسئلتك…",
      questionsActive: "جاوب على السؤال اللي تحت.",
      questionsFollowup: "الموظف عنده سؤال زيادة.",
      questionsRetry: "ما قدرنا نجهّز الأسئلة بعد.",
      questionsNoneNeeded: "ما في أسئلة لازمة لهذا الاحتمال.",
      questionsAnswered: "وصلت إجاباتك.",
      questionsCompleted: "خلصت.",
      decisionUpcoming: "الموظف يراجع الطلب ويقرر.",
      decisionWaiting: "بانتظار مراجعة الموظف.",
      decisionWaitingAnswers: "الموظف يراجع إجاباتك.",
      decisionApproved: "وافق على متابعة الاستلام.",
      decisionRejected: "ما قدر يتأكد من الطلب.",
    },
  },

  actions: {
    tryAgain: "جرّب مرة ثانية",
    refresh: "حدّث الصفحة",
    reportAnotherLost: "بلّغ عن مفقود ثاني",
    reportLost: "بلّغ عن مفقود",
    reportAnotherFound: "بلّغ عن غرض ثاني لقيته",
  },

  noLink: {
    title: "افتح رابطك الخاص",
    intro: "لما بلّغت عن مفقود، أعطيناك رابطًا خاصًا بالبلاغ. افتح الرابط نفسه من المكان اللي حفظته فيه.",
    places: ["الإشارات المرجعية في متصفحك", "رسالة أرسلتها لنفسك", "سجل المتصفح (ابحث عن «أمانة»)"],
    lostLink: "ضيّعت الرابط؟ ما نقدر نرجّعه، لأنه ما يُخزَّن عندنا. تقدر تبلّغ عن الغرض من جديد.",
    noReport: "ما بلّغت بعد؟",
  },

  broken: {
    title: "هذا الرابط ما يفتح",
    intro: "تأكد إنك فتحت الرابط كاملًا، مثل ما حفظته لما بلّغت.",
    help: "لو ما زال ما يفتح، تواصل مع موظفي المفقودات في جهتك.",
  },

  found: {
    context: "تم حفظ بلاغك",
    title: "سلّمه لمكتب المفقودات",
    intro: "شكرًا لك، بلاغك محفوظ. تفاصيله ما تنعرض للعامة، ويراجعها موظفو المفقودات بس.",
    steps: {
      handIn: "سلّم الغرض",
      handInShort: "التسليم",
    },
    nextTitle: "بعد ما تسلّمه",
    nextBody: "الموظفون يحفظونه ويرجّعونه لصاحبه بعد ما يتأكدون إنه له.",
    finishing: "بلاغك محفوظ خلاص. نخلّص فحص أخير في الخلفية، خلّ الصفحة مفتوحة لحظة.",
    finishingPaused: "بلاغك محفوظ خلاص. فحص في الخلفية واقف لأن أمانة مشغولة، خلّ الصفحة مفتوحة أو جرّب بعدين.",
    stalled: "بعض المعالجة الآلية طوّلت. بلاغك محفوظ. حدّث الصفحة ليكمل.",
    rateLimited: "بعض المعالجة الآلية ما اكتملت لأن أمانة مشغولة. بلاغك محفوظ. جرّب بعدين.",
    failedRetry: "بعض المعالجة الآلية ما اكتملت. بلاغك محفوظ، وتقدر تجرّب مرة ثانية.",
    failed: "بعض المعالجة الآلية ما اكتملت. بلاغك محفوظ.",
    announce: {
      checking: "تم حفظ بلاغك. شكرًا لك.",
      complete: "تم حفظ بلاغك. شكرًا لك على التبليغ عن هذا الغرض.",
    },
  },

  verify: {
    loadingTitle: "نجهّز أسئلتك",
    loadingRow: "نجهّز أسئلتك…",
    questionIntro: "جاوب من ذاكرتك وبكلامك. لو ما أنت متأكد قل كذا، أحسن من التخمين.",
    followupTitle: "سؤال من الموظف",
    followupIntro: "جاوب من ذاكرتك، أو قل إنك ما أنت متأكد.",
    progress: (n, total) => `السؤال ${n} من ${total}`,
    help: "ما تقدر تعدّل الإجابة بعد إرسالها. القرار للموظف، والإجابة لحالها ما تثبت الملكية.",
    submit: "أرسل الإجابة",
    saving: "جاري الإرسال…",
    errors: {
      empty: "اكتب إجابتك أول.",
      tooLong: (max) => `خلّ إجابتك أقل من ${max} حرف.`,
      invalid: "ما قدرنا نقبل هذي الإجابة. راجعها وجرّب مرة ثانية.",
      invalidLink: "هذا الرابط ما يشتغل، فما انحفظت إجابتك.",
      saveFailed: "ما انحفظت إجابتك. كلامك ما زال هنا، جرّب مرة ثانية.",
    },
    settled: {
      staff_review: {
        title: "طلبك عند الموظف",
        body: "ما في أسئلة لك الحين. الموظف يراجع هذا الاحتمال ويقرر. ارجع هنا تشوف الجديد.",
      },
      answers_received: {
        title: "وصلت إجاباتك",
        body: "شكرًا لك. الموظف يراجع إجاباتك ويقرر. ارجع هنا تشوف الجديد.",
      },
      approved: {
        title: "وافق الموظف على طلبك",
        body: "الموافقة ما تعني إن الغرض تسلّم. تواصل مع موظف المفقودات عشان ترتّب الاستلام.",
      },
      rejected: {
        title: "الموظف ما قدر يتأكد من الملكية",
        body: "لو تشوف إن في خطأ، تواصل مع موظفي المفقودات في جهتك.",
      },
    },
    retry: {
      title: "الأسئلة ما جهزت بعد",
      busy: "ما قدرنا نجهّز أسئلتك لأن أمانة مشغولة. بلاغك واحتمال التطابق محفوظان، وهذا ما يعني إنه ما في تطابق. جرّب بعد شوي.",
      failed: "ما قدرنا نجهّز أسئلتك الحين. بلاغك واحتمال التطابق محفوظان، وهذا ما يعني إنه ما في تطابق.",
      unavailable: "الأسئلة غير متاحة الحين. بلاغك واحتمال التطابق محفوظان، والموظف يقدر يراجعه. هذا ما يعني إنه ما في تطابق.",
    },
    announce: {
      question: (n, total) => `السؤال ${n} من ${total}.`,
      followup: "الموظف عنده سؤال لك.",
    },
    chip: {
      approved: "وافق الموظف",
      rejected: "ما تأكد",
      waiting: "بانتظار الموظف",
    },
  },
};

export type TrackMessages = typeof en;
export const track: Catalogue<TrackMessages> = { en, ar };
