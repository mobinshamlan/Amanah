import type { Locale } from "@/i18n/config";

// The candidate comparison in src/utils/matching/candidates.ts writes its clue
// lines in English (tests depend on that wording). These rewrite them for the
// staff's language at display time. Unknown lines, such as Gemini's own
// details written in the reports' language, pass through unchanged.
// Each line: the English pattern, then its wording per language with {0}, {1}
// where the report's own values go. Values stay separate so the page can
// isolate each one's direction (an English colour inside an Arabic line).
const CLUES: [RegExp, { en: string; ar: string }][] = [
  [/^Same item type: (.+)$/, { en: "Same item type: {0}", ar: "نفس نوع الغرض: {0}" }],
  [/^Shared color: (.+)$/, { en: "Shared color: {0}", ar: "نفس اللون: {0}" }],
  [/^Shared detail: (.+)$/, { en: "Shared detail: {0}", ar: "تفصيل مشترك: {0}" }],
  [/^Item types differ: (.+) and (.+)$/, { en: "Item types differ: {0} and {1}", ar: "نوع الغرض مختلف: {0} و{1}" }],
  [
    /^Color only on the lost report: (.+)$/,
    { en: "Color only on the lost report: {0}", ar: "لون مذكور في بلاغ المفقود بس: {0}" },
  ],
  [
    /^Color only on the found report: (.+)$/,
    { en: "Color only on the found report: {0}", ar: "لون مذكور في بلاغ اللي لقاه بس: {0}" },
  ],
  [
    /^Only the found report mentions: (.+)$/,
    { en: "Only the found report mentions: {0}", ar: "مذكور في بلاغ اللي لقاه بس: {0}" },
  ],
  [
    /^Staff added this pair for review\. This is not a confirmed match\.$/,
    {
      en: "Staff added this pair for review. This is not a confirmed match.",
      ar: "أضاف الموظف هذا الزوج للمراجعة. هذا مو تطابق مؤكد.",
    },
  ],
];

/** A clue line split into fixed wording and the report values inside it. */
export type ClueSegment = { text: string; value: boolean };

export function clueSegments(text: string, locale: Locale): ClueSegment[] {
  for (const [pattern, wording] of CLUES) {
    const match = pattern.exec(text);
    if (match) {
      return wording[locale]
        .split(/(\{\d\})/)
        .filter(Boolean)
        .map((part) => {
          const slot = /^\{(\d)\}$/.exec(part);
          return slot ? { text: match[Number(slot[1]) + 1], value: true } : { text: part, value: false };
        });
    }
  }
  return [{ text, value: false }];
}
