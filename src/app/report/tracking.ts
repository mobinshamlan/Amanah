// A lost reporter's private tracking link carries their submission credential in
// the URL fragment. Browsers never send the fragment to the server or in Referer
// headers, and the credential is random, so the link cannot be guessed from a report ID.

export const TRACK_REPORT_PATH = "/report/track";

export function trackingHref(credential: string) {
  return `${TRACK_REPORT_PATH}#${credential}`;
}
