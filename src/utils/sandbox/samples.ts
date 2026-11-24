import type { createAdminClient } from "@/utils/supabase/admin";

// Sample found reports for test mode. Fictional items "handed in" at the
// organisation, so a visitor's lost report has something to match. Fixed ids:
// cleanup never deletes them, and ensureSampleReports only adds missing ones.
// The lost-form examples are written to match the first three.

type AdminClient = ReturnType<typeof createAdminClient>;

export type SampleReport = {
  id: string;
  report_type: "found";
  item_name: string;
  description: string;
  location: string;
};

export const SAMPLE_REPORTS: readonly SampleReport[] = [
  {
    id: "5a4d0000-0000-4000-8000-000000000001",
    report_type: "found",
    item_name: "مظلة زرقاء قابلة للطي",
    description:
      "مظلة زرقاء قابلة للطي بمقبض أصفر منحني، عليها ملصق صغير على شكل نجمة قرب المقبض، وأحد أسلاكها معوج قليلًا.",
    location: "المكتبة، الطابق الثاني قرب طاولات المذاكرة",
  },
  {
    id: "5a4d0000-0000-4000-8000-000000000002",
    report_type: "found",
    item_name: "محفظة جلد سوداء",
    description:
      "محفظة جلد سوداء فيها بطاقة جامعية وبطاقة بنكية، وفي الجيب الداخلي إيصال مطوي من مكتبة، وطرفها الأيمن مخدوش.",
    location: "الكافتيريا الرئيسية، قرب الكاشير",
  },
  {
    id: "5a4d0000-0000-4000-8000-000000000003",
    report_type: "found",
    item_name: "مفاتيح مع ميدالية جلد",
    description:
      "ثلاثة مفاتيح في حلقة واحدة مع ميدالية جلد بنية صغيرة محفور عليها حرف M، ومعها مفتاح سيارة تويوتا.",
    location: "مدخل المبنى عند مواقف السيارات",
  },
  {
    id: "5a4d0000-0000-4000-8000-000000000004",
    report_type: "found",
    item_name: "جوال سامسونج بغطاء شفاف",
    description:
      "جوال سامسونج أسود بغطاء شفاف، خلف الغطاء صورة صغيرة لقطة، والشاشة فيها كسر بسيط في الزاوية العلوية.",
    location: "قاعة المحاضرات 105",
  },
  {
    id: "5a4d0000-0000-4000-8000-000000000005",
    report_type: "found",
    item_name: "حقيبة ظهر رمادية",
    description:
      "حقيبة ظهر رمادية من جانسبورت، فيها دفتر أخضر وآلة حاسبة، وعلى السحاب ميدالية على شكل نخلة.",
    location: "مصلى الطلاب",
  },
  {
    id: "5a4d0000-0000-4000-8000-000000000006",
    report_type: "found",
    item_name: "علبة سماعات أبل بيضاء",
    description:
      "علبة سماعات أبل بيضاء بغطاء سيليكون وردي، ومكتوب على الغطاء بقلم حروف R.A.",
    location: "صالة الرياضة، غرفة تبديل الملابس",
  },
  {
    id: "5a4d0000-0000-4000-8000-000000000007",
    report_type: "found",
    item_name: "Steel water bottle",
    description:
      "Navy steel water bottle with a bamboo lid, a mountain sticker near the bottom and a small dent on one side.",
    location: "Engineering building, lab 3",
  },
  {
    id: "5a4d0000-0000-4000-8000-000000000008",
    report_type: "found",
    item_name: "Reading glasses in a brown case",
    description:
      "Thin gold-frame reading glasses in a brown hard case with a magnetic clasp. A cleaning cloth with a printed owl is inside.",
    location: "Main hall, second row of seats",
  },
  // English twins of the first three, so the English examples on the lost
  // form find a possible match as reliably as the Arabic ones.
  {
    id: "5a4d0000-0000-4000-8000-000000000009",
    report_type: "found",
    item_name: "Blue folding umbrella",
    description:
      "Blue folding umbrella with a curved yellow handle, a small star sticker near the handle, and one slightly bent rib.",
    location: "The library, second floor, near the study tables",
  },
  {
    id: "5a4d0000-0000-4000-8000-00000000000a",
    report_type: "found",
    item_name: "Black leather wallet",
    description:
      "Black leather wallet with a university ID and a bank card, a folded bookshop receipt in the inner pocket, and a scuffed right corner.",
    location: "The cafeteria, near the drinks counter",
  },
  {
    id: "5a4d0000-0000-4000-8000-00000000000b",
    report_type: "found",
    item_name: "Set of keys with a leather tag",
    description:
      "Three keys on a metal ring with a small brown leather tag engraved with the letter M, and a Toyota car key.",
    location: "Main building entrance, by the parking",
  },
];

export const SAMPLE_REPORT_IDS: ReadonlySet<string> = new Set(SAMPLE_REPORTS.map((report) => report.id));

export function isSampleReportId(id: string) {
  return SAMPLE_REPORT_IDS.has(id);
}

/**
 * Adds any missing sample report and leaves existing ones untouched
 * (ON CONFLICT DO NOTHING), so it needs only the insert grant and is safe to
 * run any number of times. Returns how many were added.
 */
export async function ensureSampleReports(client: AdminClient): Promise<number> {
  const { data, error } = await client
    .from("reports")
    .upsert(SAMPLE_REPORTS.map((report) => ({ ...report })), {
      onConflict: "id",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) {
    throw new Error(`sample-insert-failed:${error.code ?? "unknown"}`);
  }
  return (data ?? []).length;
}

const ENSURED_KEY = "__amanahSandboxSamplesEnsured";
type EnsuredGlobal = typeof globalThis & { [ENSURED_KEY]?: Promise<void> };

/**
 * Once per server process: makes sure the samples exist before matching runs.
 * A failure is logged (error code only) and retried on the next call; matching
 * still runs against whatever reports exist.
 */
export async function ensureSampleReportsOnce(client: AdminClient) {
  const holder = globalThis as EnsuredGlobal;
  holder[ENSURED_KEY] ??= ensureSampleReports(client).then(
    () => undefined,
    (error: unknown) => {
      holder[ENSURED_KEY] = undefined;
      console.error("Test mode: failed to add sample reports:", error instanceof Error ? error.message : "unknown");
    },
  );
  await holder[ENSURED_KEY];
}
