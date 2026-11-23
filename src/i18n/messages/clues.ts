import type { Locale } from "@/i18n/config";

// The candidate comparison in src/utils/matching/candidates.ts writes its clue
// lines in English (tests depend on that wording). These rewrite them for the
// staff's language at display time. Unknown lines, such as Gemini's own
// details written in the reports' language, pass through unchanged.
const AR_PREFIXES: [RegExp, (...parts: string[]) => string][] = [
  [/^Same item type: (.+)$/, (type) => `نفس نوع الغرض: ${type}`],
  [/^Shared color: (.+)$/, (color) => `نفس اللون: ${color}`],
  [/^Shared detail: (.+)$/, (detail) => `تفصيل مشترك: ${detail}`],
  [/^Item types differ: (.+) and (.+)$/, (a, b) => `نوع الغرض مختلف: ${a} و${b}`],
  [/^Color only on the lost report: (.+)$/, (color) => `لون مذكور في بلاغ المفقود بس: ${color}`],
  [/^Color only on the found report: (.+)$/, (color) => `لون مذكور في بلاغ اللي لقاه بس: ${color}`],
  [/^Only the found report mentions: (.+)$/, (detail) => `مذكور في بلاغ اللي لقاه بس: ${detail}`],
  [
    /^Staff added this pair for review\. This is not a confirmed match\.$/,
    () => "أضاف الموظف هذا الزوج للمراجعة. هذا مو تطابق مؤكد.",
  ],
];

export function localizeClue(text: string, locale: Locale) {
  if (locale !== "ar") {
    return text;
  }
  for (const [pattern, render] of AR_PREFIXES) {
    const match = pattern.exec(text);
    if (match) {
      return render(...match.slice(1));
    }
  }
  return text;
}
