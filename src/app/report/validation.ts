export const ITEM_NAME_MAX = 200;
export const DESCRIPTION_MAX = 2000;
export const LOCATION_MAX = 500;

export type ReportFieldName = "itemName" | "description" | "location";

export type FieldErrors = Partial<Record<ReportFieldName, string>>;

export type ReportFields = Record<ReportFieldName, string>;

/** Why a field failed; the words come from the visitor's language. */
export type FieldErrorCode = "required" | "too_long";
export type FieldErrorCodes = Partial<Record<ReportFieldName, FieldErrorCode>>;

/** The messages a caller supplies, in the visitor's language. */
export type ReportValidationMessages = {
  itemNameRequired: string;
  itemNameTooLong: (max: number) => string;
  descriptionRequired: string;
  descriptionTooLong: (max: number) => string;
  locationRequired: string;
  locationTooLong: (max: number) => string;
};

const LIMITS: Record<ReportFieldName, number> = {
  itemName: ITEM_NAME_MAX,
  description: DESCRIPTION_MAX,
  location: LOCATION_MAX,
};

/** Checks the fields and says which failed and why, without any wording. */
export function findReportFieldErrors(input: ReportFields): FieldErrorCodes {
  const codes: FieldErrorCodes = {};
  for (const name of Object.keys(LIMITS) as ReportFieldName[]) {
    const value = input[name].trim();
    if (!value) {
      codes[name] = "required";
    } else if (value.length > LIMITS[name]) {
      codes[name] = "too_long";
    }
  }
  return codes;
}

/** Puts words to each failure, in the visitor's language. */
export function describeFieldErrors(
  codes: FieldErrorCodes,
  messages: ReportValidationMessages,
): FieldErrors {
  const errors: FieldErrors = {};
  if (codes.itemName) {
    errors.itemName =
      codes.itemName === "required"
        ? messages.itemNameRequired
        : messages.itemNameTooLong(ITEM_NAME_MAX);
  }
  if (codes.description) {
    errors.description =
      codes.description === "required"
        ? messages.descriptionRequired
        : messages.descriptionTooLong(DESCRIPTION_MAX);
  }
  if (codes.location) {
    errors.location =
      codes.location === "required"
        ? messages.locationRequired
        : messages.locationTooLong(LOCATION_MAX);
  }
  return errors;
}

/** Validates a report and returns the messages to show under each field. */
export function validateReportFields(
  input: ReportFields,
  messages: ReportValidationMessages,
): FieldErrors {
  return describeFieldErrors(findReportFieldErrors(input), messages);
}
