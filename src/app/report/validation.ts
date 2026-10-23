export const ITEM_NAME_MAX = 200;
export const DESCRIPTION_MAX = 2000;
export const LOCATION_MAX = 500;

export type FieldErrors = {
  itemName?: string;
  description?: string;
  location?: string;
};

export type ReportFields = {
  itemName: string;
  description: string;
  location: string;
};

export function validateReportFields(
  input: ReportFields,
  locationRequiredMessage: string,
): FieldErrors {
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
    fieldErrors.location = locationRequiredMessage;
  } else if (location.length > LOCATION_MAX) {
    fieldErrors.location = `Location must be ${LOCATION_MAX} characters or fewer.`;
  }

  return fieldErrors;
}
