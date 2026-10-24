# Amanah design guidelines

Visual rules transferred from the established Amanah design. Use this when building or changing UI. **Do not introduce different colors, fonts, or UI styles without approval.**

This document describes design only. It does not require copying old screens, components, or architecture.

## Source of truth

- **Documented** items come from the previous project’s design guide.
- **Inferred** items come from that project’s theme, layout, and representative screens (homepage, report forms, shared controls).
- Where those disagree, the conflict is listed. Do not invent a winner.

The current homepage, report forms, and local admin dashboard should match this guide.

---

## Principles (documented)

- **Minimal.** One clear job per screen. No marketing sections, extra navigation, or decoration that does not help the user.
- **Premium and warm.** Cream surfaces, charcoal type, restrained green accents, an elegant serif for headings.
- **Calm and private.** Soft borders and light shadows. Motion is small and only answers a user action.
- **Responsive.** Phone first, then enlarge.

---

## Colors (documented)

Defined once as CSS variables / Tailwind tokens. Prefer semantic class names (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`). Use brand names (`text-forest`, `bg-sage/25`) only for the accents below. Do not put raw hex values in components.

| Name | Hex | Token | Use |
| --- | --- | --- | --- |
| Charcoal | `#101D22` | `foreground`, `primary` | Text, primary buttons |
| Cream | `#F4F3EE` | `background` | Page background; text on dark fills |
| Sage | `#8FAE9A` | `sage` | Soft accent fills and dividers (**decoration only**) |
| Forest | `#426D58` | `forest`, `ring` | Focus rings, hover cues, icons, trust cues |

Supporting neutrals:

| Token | Hex | Use |
| --- | --- | --- |
| `card`, `popover` | `#FBFAF7` | Card and dialog surfaces |
| `muted-foreground` | `#55656A` | Secondary text |
| `border`, `input` | `#DAD8CE` | Borders and dividers |
| `secondary`, `muted` | `#E9E8E0` | Quiet fills |
| `accent` | `#E1EAE4` | Light sage hover fill |

Rules:

- **Sage is decoration only.** Contrast on cream is too low for text or essential icons.
- Text pairs measured against WCAG AA: charcoal on cream, muted on cream, forest on cream, cream on forest.
- Do not add purple, bright, or gradient colors.
- **Documented:** there is no dark mode yet.
- **Conflict:** shared control styles also include `dark:` variants. Do not enable a dark theme unless that conflict is resolved.

Selection highlight (inferred from global CSS): a translucent sage wash with charcoal text.

---

## Fonts (documented)

| Font | Utility | Use |
| --- | --- | --- |
| Cormorant Garamond | `font-serif` (also `font-heading`) | Headings, card titles, the wordmark |
| DM Sans | `font-sans` (default) | Body, buttons, all interface text |
| Amiri | `font-arabic` | Arabic text only |

- Cormorant reads small: use larger sizes than a sans-serif heading.
- Homepage heading (documented): `text-[2.75rem]` on mobile, `sm:text-6xl`, `font-semibold`, `tracking-tight`, tight line height.
- Card titles (documented): `text-[1.65rem]`, `sm:text-[1.9rem]`.
- Body and secondary text: `text-base` to `text-lg`, `leading-relaxed`, `text-muted-foreground`.
- Use `text-balance` on short centered text.

### Arabic / RTL (documented)

- Arabic text must use `lang="ar"` and `dir="rtl"`.
- Set Arabic in `font-arabic`.
- **Inferred:** the wordmark pair is Latin `AMANAH` (serif, wide letter-spacing, charcoal) beside Arabic `أمانة` (forest), separated by a thin sage divider.

---

## Shape, borders, elevation (documented)

- Base radius `--radius: 0.75rem`. Cards `rounded-2xl`, icon tiles `rounded-xl`, pills and circular controls `rounded-full`.
- Borders are 1px `border-border`.
- Shadows: `shadow-card` at rest; `shadow-card-hover` on hover (faint forest tint). Do not add new shadows.

**Inferred shadow tokens:**

- Rest: `0 1px 2px rgb(16 29 34 / 0.05), 0 6px 20px rgb(16 29 34 / 0.04)`
- Hover: `0 2px 4px rgb(16 29 34 / 0.05), 0 14px 32px rgb(66 109 88 / 0.14)`

**Inferred:** inner controls often use `rounded-lg` (smaller than cards).

---

## Layout and spacing

- Shared desktop frame: `max-w-[1440px]`, with the wordmark and page content aligned to the same left edge. The frame may sit centered in the viewport; individual content should not be centered within it by default.
- Header and page frame share the same width and horizontal gutters.
- Report pages use a wider desktop composition: page title first, then the form as the main column and guidance as a secondary column. On phones, show the form first and guidance after it.
- Local admin uses section navigation and displays one work area at a time: possible matches, ownership claims, or saved reports.
- Horizontal padding: `px-5` on mobile, `sm:px-8` from the `sm` breakpoint (640px).
- Generous whitespace. Group related items; separate groups clearly.

**Amanah homepage direction:** keep the ink brand stage and make the next action obvious. Align the headline and supporting copy to the shared frame; keep both report choices left-aligned, equal in weight, and joined by the keyhole mark.

**Report pages:** back link, serif page title and muted intro, then guidance beside the form at desktop widths. Keep the form readable and comfortable; use the saved 44px field and submit-button height. Vertical padding around `pt-6 pb-16` / `sm:pt-10 sm:pb-24`.

---

## Buttons (documented + inferred)

**Documented:** primary action is charcoal fill with cream text (`bg-primary text-primary-foreground`). Focus uses a forest ring. Never remove visible focus styles.

**Inferred variants from shared button styles:**

- Default / primary: charcoal fill, cream text, slightly transparent charcoal on hover.
- Outline: cream/background fill, `border-border`, muted hover fill.
- Secondary: quiet beige fill.
- Ghost: no border, muted hover fill.
- Link: charcoal text, underline on hover.
- Disabled: `opacity-50`, not clickable.

**Conflict — control height:**

- Shared default button height is compact (`h-8`, `text-sm`).
- Report forms override the submit button to **44px (`h-11`)**, `text-base`, full width on mobile and auto width from `sm` up (touch-friendly).

Until decided, keep compact buttons for dense chrome and 44px-tall buttons for primary form actions.

---

## Forms (mostly inferred; documented as undecided)

**Documented:** forms were “not yet decided” in the original design guide; propose in the same style and get approval.

**Inferred from the implemented report forms** (overrides the default compact inputs):

- Visible labels above fields, `text-base`, stacked with `gap-2`.
- Fields `h-11`, `px-3`, `text-base`, `rounded-lg`, `bg-background`.
- Borders stronger than the default input token: `border-foreground/50`, slightly darker on hover.
- Focus: forest border and forest ring (`ring-3 ring-ring/50`).
- Errors: message under the field, `text-sm font-medium text-foreground`, with a small destructive-colored icon. Invalid fields use `aria-invalid`.
- Disabled: reduced opacity; keep entered text.
- Primary submit uses the 44px treatment above.

**Conflict:** default shared inputs are `h-8` with `border-input` (`#DAD8CE`). Report forms are taller with darker borders. Do not mix both on one form.

---

## Interactive cards (documented)

Model for large clickable surfaces:

- Rest: `bg-card`, 1px `border-border`, `shadow-card`.
- Hover: lift 2px, forest-tinted border, `shadow-card-hover`; icon tile turns forest; trailing control turns charcoal.
- Keyboard focus: forest border and forest focus ring.
- Pressed: return to rest position.
- Responsive: compact horizontal row on mobile; taller stacked card from `sm` up.
- Equal visual weight for actions at the same level.

**Inferred:** two-column grid from `sm` (`gap-3` / `sm:gap-5`); icon tile `bg-sage/25 text-forest` at rest.

---

## Responsive behavior (documented)

- Design mobile first.
- Layout and type size up at `sm` (640px).
- Keep tap targets usable on a phone (see form-height conflict above).

---

## Accessibility (documented)

- Every control needs a visible focus state and a clear name.
- WCAG AA contrast or better.
- Honor `prefers-reduced-motion` (shorten animation and transition).
- Use real buttons and links, not clickable `div`s.
- Include loading, empty, error, and success states on new screens.
- Mark decorative icons `aria-hidden`.

**Inferred:** one simple line-icon style; do not mix icon families on a screen. Do not add an icon library unless asked.

---

## Privacy in the interface (documented)

- Never show found-item photos or details in any public or browsable view.
- Never present an automated match as confirmed ownership.
- Use fictional data in demos and examples.

---

## Conflicts and open decisions

1. **Form and button height.** Compact shared controls (`h-8`) vs 44px report-form controls. Which is the default for new screens?
2. **Form borders.** Token `border-input` (`#DAD8CE`) vs stronger `border-foreground/50` on report fields.
3. **Dark mode.** Guide forbids it; some control styles still contain `dark:` classes. Keep light-only until approved.
4. **Error color.** Forms use charcoal error copy plus a destructive icon, not red body text. Confirm for all future errors.
5. **Applying this palette to the current app.** Homepage, forms, and admin still use teal/zinc starter styles. Restyling is a separate task.
6. **Staff/admin chrome.** Use the shared wordmark and 1440px frame, with a small muted “Local admin” label. Keep review work in one section at a time.

When a conflict blocks a UI change, ask before choosing.
