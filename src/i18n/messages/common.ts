import type { Catalogue } from "@/i18n/config";

// Shared chrome: header, footer, language switch, page shell, status words.
// Arabic is short, natural Saudi Arabic; English is equally direct.
const en = {
  skipToContent: "Skip to content",
  homeLabel: "AMANAH, home",
  navLabel: "Report an item",
  reportLost: "Report lost",
  reportFound: "Report found",
  checkReport: "Check my report",
  tryDemo: "Try the demo",
  backHome: "Back to home",
  back: "Back",
  switchTo: "العربية",
  switchToLabel: "اعرض الموقع بالعربية",
  footerNavLabel: "Footer",
  tagline: "Every lost item is an amanah.",
  taglineExplainer: "Something entrusted to us, to keep safe and to return to its owner.",
  footerPrivacy: "Reports are private. Found-item details are never shown publicly.",
  footerStaff: "Staff review every claim and make the final decision.",
  metaTitle: "AMANAH | Lost & found",
  metaDescription:
    "Report a lost or found item. Reports are compared privately and staff review every claim.",
  loading: "Loading…",
  kindLost: "Lost",
  kindFound: "Found",
};

const ar: typeof en = {
  skipToContent: "انتقل للمحتوى",
  homeLabel: "أمانة، الصفحة الرئيسية",
  navLabel: "بلّغ عن غرض",
  reportLost: "ضيّعت شي",
  reportFound: "لقيت شي",
  checkReport: "تابع بلاغي",
  tryDemo: "جرّب أمانة",
  backHome: "الرئيسية",
  back: "رجوع",
  switchTo: "English",
  switchToLabel: "View the site in English",
  footerNavLabel: "روابط الموقع",
  tagline: "كل مفقود أمانة.",
  taglineExplainer: "شي اتّأمنّا عليه، نحفظه ونرجّعه لصاحبه.",
  footerPrivacy: "بلاغاتك خاصة. تفاصيل الأغراض اللي لُقيت ما تنعرض للعامة.",
  footerStaff: "الموظف يراجع كل طلب ويقرر.",
  metaTitle: "أمانة | المفقودات",
  metaDescription: "بلّغ عن شي ضيّعته أو لقيته. نقارن البلاغات بخصوصية، والموظف يراجع كل طلب استلام.",
  loading: "جاري التحميل…",
  kindLost: "مفقود",
  kindFound: "ملقى",
};

export const common: Catalogue<typeof en> = { en, ar };
