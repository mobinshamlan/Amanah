# Amanah design guidelines

The reference for any UI change in Amanah: the public site (`/`, `/report/*`) and the local staff workspace (`/admin`). Both are one product with one palette, one type system and one set of shapes. Tokens live in `src/app/globals.css`; shared controls in `src/components/ui.tsx`; site chrome in `src/components/site-header.tsx`; icons in `src/components/icons.tsx`; shared strings in `src/i18n/messages/common.ts`. Product facts (who, what, the privacy promises) are in `PRODUCT.md`.

## The feeling

**A real place where someone can leave an item for safekeeping.** A lost-property desk: deep pine walls, warm paper slips and tags, a little brass on the eyelet. Calm, careful, private. The homepage carries the strongest image (a 3D render of the desk in `public/art/`); every working screen is quiet paper that is easy to read.

## Identity (do not change)

- **Name and mark.** The keyhole (`KeyholeGlyph`, `KeyholeMark`) and the bilingual wordmark **AMANAH | أمانة** (`Wordmark`): Latin in Cormorant Garamond 600 with wide tracking, Arabic in Amiri, a brass hairline between them. The wordmark is always set left-to-right (`dir="ltr"`), Latin first, in both languages. These two faces load only for the wordmark (`font-wordmark-latin`, `font-wordmark-arabic`).
- **Meaning.** «كل مفقود أمانة» / "Every lost item is an amanah." *Amanah*: something entrusted to you, to keep safe and to return. Every surface should feel like that trust is being kept.
- **Palette.** Exact values below. No new hues, no gradients, no dark mode toggle (the pine stage is a field, not a theme).

## Colour

Semantic tokens first (`bg-background`, `text-foreground`, `bg-card`, `bg-secondary`, `text-muted-foreground`, `border-border`, `bg-primary`), brand names for fields and accents. No raw hex in components. Older names (`ink`, `cream`, `charcoal`, `clay`, `clay-ink`) still work and point at the new values.

| Token | Hex | Role | Contrast |
| --- | --- | --- | --- |
| `paper` / `background` / `cream` | `#F5F0E6` | Page ground. Text on pine fields. | 10.96:1 on pine-deep |
| `card` | `#FBF8F1` | Lighter paper: forms, slips, work sheets, field fills | foreground 15.9:1 |
| `secondary` / `muted` / `paper-deep` | `#EAE3D5` | Quiet fills: notices, nav hover, panels | foreground 13.2:1 |
| `accent` | `#DCE6E0` | Tinted pine fill: current step, found cue, info chips | foreground 13.2:1 |
| `border` / `input` | `#D6CDBD` | Table rules, sheet edges (decorative only) | — |
| `foreground` / `charcoal` | `#10201C` | Text; near-black pine | 14.85:1 on paper |
| `muted-foreground` | `#4F5F59` | Secondary text only | 5.94:1 on paper, 5.28:1 on secondary |
| `pine-deep` / `ink` / `primary` | `#163A33` | Homepage stage, footer, primary buttons, inverted rows | paper on it 10.96:1 |
| `pine` | `#1F4A40` | Primary hover, emphasis text, privacy field | 8.76:1 on paper |
| `forest` / `ring` | `#2E5E52` | Trust cues, icons, focus rings, context lines | 6.51:1 on paper |
| `sage` | `#9BB8A8` | Decoration only: dividers, dots on pine | never text on paper |
| `brass` / `clay` | `#B08D57` | **The one accent**: eyelet ring, wordmark divider, one highlighted result per screen. Fill or stroke only | 2.72:1 on paper, so never text |
| `brass-ink` / `clay-ink` | `#7A5A2E` | Brass as text on paper | 5.55:1 on paper, 5.01:1 on brass-soft |
| `brass-light` | `#D9BE86` | Brass as text or focus ring on pine fields | 6.91:1 on pine-deep |
| `brass-soft` | `#F0E4CC` | Pale brass fill behind the highlighted result | brass-ink on it 5.01:1 |
| `destructive` | `#8A2F2F` | Errors, reject actions | 7.31:1 on paper |
| `ok-soft` / `ok-ink` | `#DFEEE3` / `#1D4A35` | Approved, healthy | 8.39:1 |
| `bad-soft` / `bad-ink` | `#F8E4E0` / `#8A2323` | Rejected, failed | 7.32:1 |
| `wait-soft` / `wait-ink` | `#F6E9D6` / `#7A4A17` | Pending, needs attention | 6.22:1 |

Rules:
- **One accent per screen.** Brass appears on one thing: the highlighted key result (a possible match, a saved-link card, the decision that is due). Everything else is pine and paper. If a screen already uses brass, status pairs stay in their own soft/ink colours.
- Running text is full `foreground` (or `foreground/85` for intros). `muted-foreground` is for secondary notes only. On pine fields, secondary text is `paper/70–80`, never grey.
- Approval is green and rejection is red every time, on the owner's page and in the staff workspace; each also carries an icon and a word (`StatusChip`).
- **Lost vs found is never colour alone.** Lost is a dashed outline with the lens icon; found is a filled accent with the tag icon (`ReportKindCue`, `LensIcon`, `TagIcon`). Headings say the word.
- Surfaces are separated by a step of tone, not by shadows or hairlines. `shadow-float` only on things that truly float (tooltips, menus).

## Type

| Face | Token | Use |
| --- | --- | --- |
| IBM Plex Sans Arabic | `--font-plex-arabic` | Every line on Arabic pages, Latin included (`html:lang(ar)` sets `--font-sans`) |
| IBM Plex Sans | `--font-plex` | Every line on English pages; Arabic islands still use Plex Sans Arabic |
| Cormorant Garamond 600 / Amiri | `font-wordmark-latin` / `font-wordmark-arabic` | The wordmark only |

`font-serif` now points at the Plex stack, so older headings convert without edits. Do not use it in new code; use the scale below.

### Scale

Fluid sizes with a line-height and tracking that change with the page language. Arabic gets more leading and never any tracking; negative tracking exists only under `html:lang(en)`.

| Utility | Size | Leading en / ar | Tracking en / ar | Use |
| --- | --- | --- | --- | --- |
| `text-display` | 44 → 92px | 1.04 / 1.22 | −0.02em / 0 | The homepage question headline, one per site |
| `text-title` | 34 → 56px | 1.10 / 1.28 | −0.015em / 0 | Page `h1` (`PageHeading`), footer tagline |
| `text-heading` | 24 → 32px | 1.20 / 1.40 | −0.01em / 0 | Section `h2` (`SectionHeading`), card titles |
| `text-subheading` | 20px | 1.6 / 1.85 | 0 | `h3`, slip stage names |
| `text-lead` | 18 → 21px | 1.55 / 1.8 | 0 | The one sentence under a headline |
| `text-body` | 16px | 1.6 / 1.85 | 0 | Running text, buttons, fields |
| `text-small` | 15px | 1.6 / 1.85 | 0 | Notices, nav links, slip values |
| `text-caption` | 13px | 1.5 | 0 | Chips, chart ticks. The minimum |

- Headlines fit in two lines at every width (`text-wrap: balance` is set on `h1–h4`). One question headline, one plain sentence, one key result, one primary action.
- All counts, scores and times are `tabular-nums` (`table`, `time` and `[data-numeric]` get it automatically).
- No small uppercase labels, no 01/02/03 numbering, no eyebrow above a heading. Context goes in a sentence-case line (`PageHeading` `context`) or in the heading itself.
- Measure 45–65 characters for Arabic and English alike (`max-w-[58ch]`).

## Shapes: lost-property stationery

| Piece | Class | Use |
| --- | --- | --- |
| **Tag** with two cut corners on the eyelet side | `.shape-tag` | The two ways in on the homepage; one emphatic panel per screen. The cut corners sit on the start side and flip in RTL automatically |
| **Slip** torn from a pad | `.edge-torn` (bottom edge) | Ordered information: how it works, "After you submit", a report's progress |
| **Perforation** | `.perforation` | Divides parts of one piece (form sections, slip header, footer) |
| **Leader dots** | `.leader` (via `SlipRow`) | Joins a label to its value on a slip |
| **Eyelet** | `.eyelet` | A brass ring: the tag's hole, the one highlighted result |

- Shapes are **fills, never outlines**. Put `.shape-tag` on an `aria-hidden` layer behind the content (`absolute inset-0 -z-10`, parent `relative isolate`) so focus rings are never clipped.
- At most one tag and one slip per screen. Never put real report details on decorative or public pieces.
- Radii: panels `rounded-[1.5rem]`–`rounded-[1.75rem]`, inner blocks `rounded-2xl`, fields `rounded-xl`, pills and chips `rounded-full`. Tags and slips are square-edged.

## Controls (`src/components/ui.tsx`)

| Export | What it is |
| --- | --- |
| `primaryButtonClassName`, `primaryButtonLargeClassName` | Filled pine pill, 44px / 48px. One per screen |
| `secondaryButtonClassName` | Outlined pill for the second action |
| `quietButtonClassName` | Borderless pill: cancel, close |
| `rejectButtonClassName` | Outlined destructive, for staff rejection |
| `primaryOnDarkButtonClassName`, `secondaryOnDarkButtonClassName` | The same pair on pine fields |
| `textLinkClassName`, `textLinkOnDarkClassName` | The quiet underlined second action beside a primary button (pair with `ArrowEndIcon`) |
| `linkClassName` | Small inline link inside text or a slip row |
| `fieldClassName`, `textareaClassName`, `selectClassName`, `labelClassName`, `hintClassName`, `FieldError` | Fields: 48px, card fill, forest focus ring, `aria-invalid` turns the border red. Visible label, hint under it, error under the field, all linked with `aria-describedby` |
| `focusRingClassName`, `focusRingOnDarkClassName` | Forest ring on paper, brass ring on pine |
| `PageShell` | Header, `main#main`, back link (RTL-aware arrow, translated), footer. `width="narrow" | "wide"`, `backHref`, `backLabel`, `hideBack` |
| `PageHeading` | Context line, `h1` at `text-title`, intro at `text-lead`; `saved` adds the check seal; `headingRef` for focus moves |
| `SectionHeading` | `h2`/`h3` at `text-heading` with an optional intro |
| `Notice` | `tone="info" | "success" | "warning" | "error"`, optional `title`, `surface` for info fills, `role="alert"` or `"status"` |
| `StatusChip` | `tone="ok" | "bad" | "wait" | "info" | "neutral"`, icon plus words |
| `ReportKindCue` | `kind="lost" | "found"`: dashed lens vs filled tag |
| `Spinner`, `LoadingRow`, `SlipRow` | Busy ring, visible loading line, slip row with leader dots |
| `BackLink`, `frameClassName` | Re-exported from the chrome |

- Buttons are full width on phones and natural width from `sm`. Labels may wrap; a button never exceeds its container.
- Never combine conflicting utilities (`min-h-11 min-h-12`, `bg-background bg-card`). Use a variant export or a prop.
- Icons come from `icons.tsx` only: one stroke, one grid. Directional ones (`ArrowStartIcon`, `ArrowEndIcon`, `ChevronEndIcon`, `SendIcon`) flip in RTL by themselves; `ArrowLeftIcon`/`ArrowRightIcon` are physical and do not.

## Layout

- Frame: `frameClassName` (`max-w-[1440px]`, gutters `px-4 sm:px-8 xl:px-12`), the same in header, content and footer. Narrow pages use `max-w-3xl`.
- Phone first. `sm` (640) is the type break; `lg` (1024) is the two-column break.
- **Public pages:** `PageShell`. The homepage alternates whole fields: pine-deep stage → paper → pine → pine-deep footer. Section padding `py-20 sm:py-28 lg:py-32`.
- **Header:** wordmark, the two report links, a quieter "Check my report", the language switch. On phones the links take a second row; nothing hides in a menu. `tone="pine"` on the homepage stage, `tone="paper"` elsewhere.
- **Footer:** wordmark at full size, «كل مفقود أمانة», its one-line meaning, the three links, a perforation, the privacy line and the language switch.
- **Report forms:** at `lg`, title and guidance in the start column (5 of 12), the form sheet in the end column (7 of 12). DOM order is title → form → guidance, which is also the phone order.
- **Staff workspace (`AdminShell`):** paper ground, a 16rem sidebar, one card work sheet per section. Narrow panels lay out by their own width with container queries (`@container`, `@md:flex-row`), not viewport breakpoints.
- No content may extend past the viewport at 390px. Wide tables scroll inside a focusable, labelled region; everything else wraps (`min-w-0`, `break-words`).

## Arabic and RTL

- Arabic is the default language and the first draft of every string. English is written to be equally direct, not translated word for word.
- Every string goes through a catalogue (`src/i18n/messages/*.ts`, `Catalogue<typeof en>`): `getMessages` in server components, `useMessages` in client components. Never branch on locale inside JSX for copy.
- **Logical properties everywhere:** `ms/me/ps/pe`, `start/end`, `text-start`, `border-s`, `rounded-s-*`. Never `ml/mr/left/right/text-left` for layout.
- Directional icons flip (`flip-rtl` class, already on the `*Start`/`*End` icons). Progress and timelines read start → end. Numbers, codes and the wordmark stay LTR (`dir="ltr"`).
- Mixed-language islands set `lang` (`lang="ar"` for Arabic on an English page, `lang="en"` for Latin names on an Arabic page) so the right face and rhythm apply.
- Dates and numbers come from `src/i18n/format.ts` (`ar-SA` with Latin digits and the Gregorian calendar).

## Motion

- Small, meaningful, once: tags swing onto their string (`animate-swing`), page content rises (`animate-rise`), homepage sections reveal on scroll (`.reveal`, CSS scroll-driven; visible where unsupported), the progress line draws once (`animate-grow`).
- Feedback on every control: colour change on hover, a 1px press, the arrow nudges, a tag tilts by 1°. Transform and opacity only, 150–300ms.
- `prefers-reduced-motion` removes travel and animation globally. Content never depends on motion to appear.

## Accessibility

- WCAG AA contrast (the table above). Visible focus on every control: forest ring on paper, brass ring on pine.
- Touch targets at least 44px with at least 8px between them. The browser's own parts are themed: selection (brass), caret and `accent-color` (forest), scrollbar (pine).
- Real `<button>` and `<a>`, labelled landmarks, a skip link on every layout, `aria-current` on the active section or filter.
- Live status lines (`role="status"`) stay mounted; move focus to the new heading when content is replaced in place (`PageHeading` `headingRef`).
- Decorative icons and shapes are `aria-hidden`. Colour is never the only signal: chips carry icons and words, lost/found differ by shape, charts carry legends and a table view.
- Every screen has loading, empty, error and success states.

## Copy voice

Direct question, plain sentence, one key result, one action. Saudi Arabic that sounds like a person at the desk; English that is just as short.

| Moment | Arabic | English |
| --- | --- | --- |
| Homepage headline | ضيّعت شي؟ ولا لقيت شي؟ | Lost something? Found something? |
| Under it | بلّغ هنا، ونحفظه لك بخصوصية لين يرجع لصاحبه. | Report it here. We keep it private until it gets back to its owner. |
| Primary | بلّغ عن مفقود | Report a lost item |
| Quiet link | لقيت شي؟ بلّغ عنه | Found something? Report it |
| Saved | تم حفظ بلاغك. | Your report is saved. |
| Possible match | في احتمال تطابق. الخطوة الجاية أسئلة بسيطة عن غرضك. | There is a possible match. Next, a few simple questions about your item. |
| Did not finish | ما اكتمل الفحص. هذا ما يعني إنه ما في تطابق. جرّب بعد شوي. | Checking did not finish. That does not mean no match. Try again in a bit. |
| Staff decision | الموظف هو اللي يقرر، مو الذكاء الاصطناعي. | Staff decide, not the AI. |

- Buttons name the action ("Report a lost item", not "Submit"). Errors name the problem and the way out.
- No eyebrows, no exclamation marks, no "welcome back". No promises the system does not keep.

## Privacy in the interface

- Never show found-item details in any public or browsable view. Lost reporters never see a list of found items.
- An AI suggestion is never presented as confirmed ownership; staff decide every claim, and approval means "ownership follow-up", not an automatic return.
- Describe only what the product actually does. No invented notifications, hand-in locations, timelines or guarantees.
- Monitoring shows counts and times only. Demos and screenshots use fictional data.
