# Amanah design guidelines

The reference for any UI change in Amanah: the public site (`/`, `/report/*`) and the local staff workspace (`/admin`). Both are one product with one palette, one set of faces, and one set of shapes. Tokens live in `src/app/globals.css`; shared controls live in `src/components/ui.tsx` and `src/components/site-header.tsx`.

## Identity (do not change)

- **Name and mark.** The keyhole (`KeyholeGlyph`, `KeyholeMark` in `src/components/icons.tsx`) and the bilingual wordmark **AMANAH | أمانة** (`Wordmark`): Latin in the serif with wide tracking, Arabic in Amiri, a thin sage divider between them.
- **Meaning.** "Every lost item is an amanah." / «كل مفقود أمانة». *amanah* (n.): something entrusted to you, to keep safe and to return. Every surface should feel like that trust is being kept: private, calm, careful.
- **Palette.** Exact values below. No new hues, gradients, or dark mode.

## The idea: lost-property stationery

Amanah's shapes come from a lost-property desk, and each one has a meaning:

| Piece | Class | Use |
| --- | --- | --- |
| **Tag**: a luggage tag with two cut corners, its eyelet punched as the keyhole | `.shape-tag` on a decorative layer | The two ways in on the homepage; one emphatic panel per screen (found-item guidance, hand-in step) |
| **Slip**: a sheet torn from a pad, zigzag bottom edge | `.edge-torn` | Ordered information: how it works, "After you submit", a report's progress |
| **Perforation**: a row of round dots | `.perforation` (block element) | Divides parts of one piece (form sections, slip header, footer) |
| **Leader dots** | `.leader` (via `SlipRow`) | Joins a row's label to its value on a slip |

Rules:
- Shapes are **fills, never outlines**. Put `.shape-tag` on an `aria-hidden` layer *behind* the content (`absolute inset-0 -z-10`, parent `relative isolate`) so focus rings on the content are never clipped.
- Use at most one tag and one slip per screen. Decorative use dilutes the meaning.
- Never put real report details on decorative or public pieces.

## Colour

Semantic tokens first (`bg-background`, `text-foreground`, `bg-card`, `bg-secondary`, `text-muted-foreground`, `border-border`, `bg-primary`). Brand names for accents and fields. No raw hex in components.

| Token | Hex | Role |
| --- | --- | --- |
| `ink` | `#0C191E` | Homepage stage, footer, inverted slip row, active filter |
| `charcoal` / `foreground` / `primary` | `#101D22` | Text, primary buttons |
| `cream` / `background` | `#F4F3EE` | Page ground; text on ink and forest |
| `card` | `#FBFAF7` | Paper: forms, slips, the staff work sheet |
| `secondary` / `muted` | `#E9E8E0` | Quiet fills: notices, nav active pill, panels |
| `accent` | `#E1EAE4` | Current step, possible-match result, tag hover |
| `forest` / `ring` | `#426D58` | Trust cues, focus rings, icons, the privacy field |
| `pine` | `#214C43` | Primary button hover, emphasis text |
| `sage` | `#8FAE9A` | Decoration only: dividers, eyelet ring, Arabic on ink |
| `clay` / `clay-ink` | `#C87742` / `#9A5326` | Lost-item cue, "ready for decision" ring, attention counts |
| `muted-foreground` | `#55656A` | Secondary text |
| `border` / `input` | `#DAD8CE` | Table rules, sheet edges |
| `destructive` | `#8A2F2F` | Errors, reject actions |
| `ok-soft` / `ok-ink` | `#E3F1E8` / `#1D4A35` | Approved decisions, healthy monitoring |
| `bad-soft` / `bad-ink` | `#FDECEA` / `#8A2323` | Rejected decisions, failures |
| `wait-soft` / `wait-ink` | `#FBF0E6` / `#7A3F17` | Pending review, "needs attention" |

- Sage never carries text on cream or forest.
- Running text is full `foreground` (or `foreground/75–90` for intros). Grey (`muted-foreground`) is for secondary notes only.
- Approval is green and rejection is red, every time, on both the owner's page and the staff workspace.
- Surfaces are separated by a step of tone, not by shadows. `shadow-float` is only for things that truly float (chart tooltips).

## Type

| Face | Utility | Use |
| --- | --- | --- |
| Cormorant Garamond | `font-serif` | Page titles, section headings, card titles, item names, the wordmark |
| DM Sans | `font-sans` (default) | Body, labels, buttons, **all numbers** |
| Amiri | `font-arabic` | Arabic only, with `lang="ar" dir="rtl"` |

- Cormorant draws old-style figures (`1` reads as `I`, `0` as `O`). **Set every count, score and statistic in DM Sans** with `tabular-nums`.
- Scale: hero `text-[3.25rem]` → `lg:text-[6.25rem]`; page title `text-[2.75rem]` → `sm:text-6xl`; section `text-[2.6rem]` → `sm:text-6xl`; card title `1.5–2rem`; body `text-base`/`text-lg`; small `0.9375rem`; minimum `0.8125rem` (13px). Chart ticks may be 11–12px.
- Display tracking `-0.02em`, leading `~1.0`. Body leading relaxed, measure 40–60ch (`max-w-[46ch]`).
- Headlines fit in two lines at every width. Use `text-balance` on headings and `text-pretty` on paragraphs.
- No small uppercase labels and no 01/02/03 numbering. Put the context in a sentence-case line (`PageHeading` `context`) or in the heading itself. Order lives in `<ol>` and position.

## Shape and controls

- **Buttons:** one shape, a full pill (`rounded-full`), at least 44px tall (`min-h-11`); the main public form action is 48px (`primaryButtonLargeClassName`). Use `primaryButtonClassName`, `secondaryButtonClassName` and `rejectButtonClassName` from `ui.tsx`. Buttons are full width on phones and natural width from `sm`. **Labels may wrap and a button never exceeds its container** (`max-w-full min-w-0`, no `whitespace-nowrap`).
- **Fields:** `fieldClassName` / `textareaClassName`. 48px, `rounded-xl`, `border-foreground/45`, forest focus ring, `aria-invalid` turns the border destructive. Visible label, hint under it, error under the field (`FieldError`, charcoal copy with a destructive icon), linked with `aria-describedby`.
- **Radii:** panels `rounded-[1.5rem]`–`rounded-[1.75rem]`, inner blocks `rounded-2xl`, fields `rounded-xl`, pills and chips `rounded-full`. Tags and slips are square-edged shapes.
- **Never combine conflicting utilities** (for example `min-h-11 min-h-12`, or `bg-background bg-card`). Tailwind gives no reliable winner. Use a variant export or a prop (`Notice surface=…`).

## Layout

- Frame: `max-w-[1440px]`, gutters `px-4 sm:px-8 xl:px-12`, the same in header, content and footer.
- Phone first. `sm` (640) is the type break; `lg` (1024) is the two-column break.
- **Public pages:** `PageShell` (header, back link, content, `SiteFooter`). Homepage sections alternate whole fields: ink (stage) → cream (slip) → forest (privacy) → ink (footer). Section padding is `py-20 sm:py-28 lg:py-32+`.
- **Report forms:** at `lg`, the title and guidance sit in the left column (5 of 12) and the form sheet in the right (7 of 12, `lg:grid-rows-[auto_1fr]`). The DOM order is title → form → guidance, which is also the phone order.
- **Tracking and confirmation:** `LostConfirmation` is a container (`@container`). At `@4xl` it sets the progress slip beside the result and next steps; narrower containers stack them.
- **Staff workspace (`AdminShell`):** a cream ground, a 16rem sidebar (wordmark, labelled section links as pills, workspace note, "Local admin"), and one paper work sheet per section with a serif title. Below `lg`: a top bar plus section links (a 2×2 grid on phones, a row from `sm`). Show one section at a time with the existing `/admin?section=…` links.
- **Narrow panels lay out by their own width.** Controls inside a side column (the staff decision panel, Run matching) use container queries (`@container`, `@md:flex-row`), not viewport breakpoints. The decision column sits beside the evidence only from `xl`.
- No content may extend past the viewport at 390px. Wide tables scroll inside a focusable, labelled region (`role="region" tabIndex={0}`); everything else wraps (`min-w-0`, `break-words`).

## Motion

- Small, meaningful, once: tags swing onto their string (`animate-swing`), page content rises (`animate-rise`), homepage sections reveal on scroll (`.reveal`, CSS scroll-driven; content is visible where unsupported).
- Feedback on every control: colour changes on hover, a 1px press, the arrow nudges, a tag tilts by 1°.
- Transform and opacity only, 150–300ms for feedback.
- `prefers-reduced-motion` removes travel and animation globally (`globals.css`). Content never depends on motion to appear.

## Accessibility

- WCAG AA contrast. Visible focus on every control: `focusRingClassName` (forest ring), or a sage ring on ink.
- Touch targets at least 44px, with at least 8px between them.
- Real `<button>` and `<a>`, labelled navigation landmarks, a skip link on every layout, `aria-current` on the active section or filter.
- Live status lines (`role="status"`) stay mounted; move focus to the new heading when content is replaced in place.
- Decorative icons and shapes are `aria-hidden`. Colour is never the only signal: chips carry text and icons, charts carry legends, labels and a table view.
- Every screen has loading, empty, error and success states.

## Privacy in the interface

- Never show found-item details in any public or browsable view. Lost reporters never see a list of found items.
- An AI suggestion is never presented as confirmed ownership; staff decide every claim, and approval means "ownership follow-up", not an automatic return.
- Describe only what the product actually does. No invented notifications, hand-in locations, timelines or guarantees.
- Monitoring shows counts and times only. Demos and screenshots use fictional data.
