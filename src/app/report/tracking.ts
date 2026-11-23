// A lost reporter's private tracking link carries their submission credential in
// the URL fragment. Browsers never send the fragment to the server or in Referer
// headers, and the credential is random, so the link cannot be guessed from a report ID.

export const TRACK_REPORT_PATH = "/report/track";

export function trackingHref(credential: string) {
  return `${TRACK_REPORT_PATH}#${credential}`;
}

// The report form notes a fresh submission here right before it moves to the
// tracking link, so the first visit can lead with "save your private link".
// It is read and removed once; nothing about the report is stored.
const JUST_SAVED_KEY = "amanah:track:just-saved";

export function rememberJustSaved(credential: string) {
  try {
    sessionStorage.setItem(JUST_SAVED_KEY, credential);
  } catch {
    // Storage may be unavailable; the tracking page then uses the referrer.
  }
}

/** True once for the credential the report form just saved; clears the note. */
export function takeJustSaved(credential: string) {
  try {
    const saved = sessionStorage.getItem(JUST_SAVED_KEY);
    if (saved) {
      sessionStorage.removeItem(JUST_SAVED_KEY);
    }
    if (saved === credential) {
      return true;
    }
  } catch {
    // Fall through to the referrer.
  }
  try {
    const from = document.referrer ? new URL(document.referrer) : null;
    return (
      from !== null && from.origin === window.location.origin && from.pathname === "/report/lost"
    );
  } catch {
    return false;
  }
}
