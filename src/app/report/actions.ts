"use server";

import { createClient } from "@/utils/supabase/server";
import {
  validateReportFields,
  type FieldErrors,
  type ReportFields,
} from "@/app/report/validation";

export type ReportType = "lost" | "found";

export type SubmitReportResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
};

const LOCATION_REQUIRED: Record<ReportType, string> = {
  lost: "Last-seen location is required.",
  found: "Found location is required.",
};

const SUCCESS_MESSAGE: Record<ReportType, string> = {
  lost: "Your lost-item report was saved.",
  found: "Your found-item report was saved.",
};

export async function submitReport(
  reportType: ReportType,
  input: ReportFields,
): Promise<SubmitReportResult> {
  // Only allow the two known types — never accept arbitrary client strings.
  if (reportType !== "lost" && reportType !== "found") {
    return {
      ok: false,
      message: "Could not save your report. Please try again.",
    };
  }

  const fieldErrors = validateReportFields(
    input,
    LOCATION_REQUIRED[reportType],
  );

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("reports").insert({
    report_type: reportType,
    item_name: input.itemName.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
  });

  if (error) {
    console.error("Failed to insert report:", error.code);
    return {
      ok: false,
      message: "Could not save your report. Please try again.",
    };
  }

  return {
    ok: true,
    message: SUCCESS_MESSAGE[reportType],
  };
}
