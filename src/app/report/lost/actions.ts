"use server";

import { createClient } from "@/utils/supabase/server";

const ITEM_NAME_MAX = 200;
const DESCRIPTION_MAX = 2000;
const LOCATION_MAX = 500;

export type FieldErrors = {
  itemName?: string;
  description?: string;
  location?: string;
};

export type SubmitLostReportResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
};

type SubmitLostReportInput = {
  itemName: string;
  description: string;
  location: string;
};

function validateFields(input: SubmitLostReportInput): FieldErrors {
  const fieldErrors: FieldErrors = {};
  const itemName = input.itemName.trim();
  const description = input.description.trim();
  const location = input.location.trim();

  if (!itemName) {
    fieldErrors.itemName = "Item name is required.";
  } else if (itemName.length > ITEM_NAME_MAX) {
    fieldErrors.itemName = `Item name must be ${ITEM_NAME_MAX} characters or fewer.`;
  }

  if (!description) {
    fieldErrors.description = "Description is required.";
  } else if (description.length > DESCRIPTION_MAX) {
    fieldErrors.description = `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }

  if (!location) {
    fieldErrors.location = "Last-seen location is required.";
  } else if (location.length > LOCATION_MAX) {
    fieldErrors.location = `Last-seen location must be ${LOCATION_MAX} characters or fewer.`;
  }

  return fieldErrors;
}

export async function submitLostReport(
  input: SubmitLostReportInput,
): Promise<SubmitLostReportResult> {
  const fieldErrors = validateFields(input);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("reports").insert({
    // Always set on the server — never trust the client for report type.
    report_type: "lost",
    item_name: input.itemName.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
  });

  if (error) {
    console.error("Failed to insert lost report:", error.code);
    return {
      ok: false,
      message: "Could not save your report. Please try again.",
    };
  }

  return {
    ok: true,
    message: "Your lost-item report was saved.",
  };
}
