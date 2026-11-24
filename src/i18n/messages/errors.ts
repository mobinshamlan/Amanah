import type { Catalogue } from "@/i18n/config";

// The pages nobody plans to see: a missing address, a screen that broke, and
// the last-resort page when the whole site fails. Calm, short, and never a
// hint about whether any report exists. Arabic first; English equally direct.
const en = {
  notFound: {
    metaTitle: "AMANAH | Page not found",
    context: "Page not found",
    title: "This page isn't here",
    intro: "The address may be incomplete or mistyped.",
    privateLink: "If you opened your private link, open the full link exactly as you saved it.",
    home: "Back to home",
    reportLost: "Report a lost item",
  },
  error: {
    context: "Something went wrong",
    title: "This page didn't load",
    intro: "Nothing you entered was published. Reports are never shown publicly.",
    next: "Try again. If it keeps happening, go back to the homepage.",
    retry: "Try again",
    home: "Back to home",
    reference: "Error reference",
  },
  global: {
    title: "Something went wrong",
    body: "Nothing you entered was published. Try again in a moment.",
    retry: "Try again",
    home: "Back to home",
  },
};

const ar: typeof en = {
  notFound: {
    metaTitle: "أمانة | الصفحة مو موجودة",
    context: "الصفحة مو موجودة",
    title: "هالصفحة مو هنا",
    intro: "يمكن الرابط ناقص أو انكتب غلط.",
    privateLink: "إذا فتحت رابطك الخاص، افتحه كامل مثل ما حفظته.",
    home: "ارجع للرئيسية",
    reportLost: "بلّغ عن شي ضيّعته",
  },
  error: {
    context: "صار خطأ",
    title: "الصفحة ما فتحت",
    intro: "ما نشرنا شي من اللي كتبته، والبلاغات ما تنعرض للعامة أبد.",
    next: "جرّب مرة ثانية، وإذا تكرر ارجع للرئيسية.",
    retry: "جرّب مرة ثانية",
    home: "ارجع للرئيسية",
    reference: "رمز الخطأ",
  },
  global: {
    title: "صار خطأ",
    body: "ما نشرنا شي من اللي كتبته. جرّب مرة ثانية بعد شوي.",
    retry: "جرّب مرة ثانية",
    home: "ارجع للرئيسية",
  },
};

export const errors: Catalogue<typeof en> = { en, ar };
