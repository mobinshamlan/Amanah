/**
 * The page frame shared by header, content and footer: one width, one pair of
 * equal gutters at every size. Kept in its own module so both server and
 * client components can read the string.
 */
export const frameClassName = "mx-auto w-full max-w-[1440px] px-4 sm:px-8 xl:px-12";

/* Focus rings, shared the same way by the site chrome and the controls in ui.tsx. */

export const focusRingClassName =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The same ring on deep pine fields: brass, offset to the field. */
export const focusRingOnDarkClassName =
  "outline-none focus-visible:ring-3 focus-visible:ring-brass-light focus-visible:ring-offset-2 focus-visible:ring-offset-pine-deep";
