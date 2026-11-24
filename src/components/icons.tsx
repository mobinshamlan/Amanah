import type { ReactNode } from "react";

// One line-icon style for the whole app: 24-unit grid, 1.75 stroke, round
// joins. Icons are decorative: the text beside them always carries the
// meaning. Directional icons carry `flip-rtl` so they mirror on Arabic pages.

type IconProps = { className?: string };

function Icon({
  className,
  strokeWidth = 1.75,
  children,
}: IconProps & { strokeWidth?: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

function cx(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* Status */

export function CheckIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={2.25}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={2}>
      <path d="M7 7l10 10" />
      <path d="M17 7L7 17" />
    </Icon>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3 2" />
    </Icon>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.75v.01" strokeWidth={2.5} />
    </Icon>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 16.75v.01" strokeWidth={2.5} />
    </Icon>
  );
}

/** A circled check: a saved report, an approved claim. */
export function CheckCircleIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" strokeWidth={2} />
    </Icon>
  );
}

export function QuestionIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.25c-.75.4-1.1 1-1.1 1.75v.25" />
      <path d="M12 16.75v.01" strokeWidth={2.5} />
    </Icon>
  );
}

/* Report cues. Lost and found are told apart by shape, never by colour alone. */

/** Lost cue: a lens over a dotted outline, the item that is not here. */
export function LensIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.4-4.4" />
      <circle cx="10.5" cy="10.5" r="2.75" strokeDasharray="1.2 2" strokeWidth={1.5} />
    </Icon>
  );
}

/** Found cue: a luggage tag with its eyelet, the item waiting at the desk. */
export function TagIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3.5 12.5V5.5a2 2 0 0 1 2-2h7l8 8-8.5 8.5-8.5-7.5Z" />
      <circle cx="8" cy="8" r="1.4" />
    </Icon>
  );
}

/** Found cue, alternative: an open hand holding something up. */
export function HandIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M8 13.5V6a1.5 1.5 0 0 1 3 0v6" />
      <path d="M11 11.5V4.5a1.5 1.5 0 0 1 3 0v7" />
      <path d="M14 11.5V6a1.5 1.5 0 0 1 3 0v8.5" />
      <path d="M8 13.5 6.2 11.2a1.5 1.5 0 0 0-2.4 1.8L7 18.5a6 6 0 0 0 5 2.5h1a4 4 0 0 0 4-4v-2.5" />
    </Icon>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </Icon>
  );
}

/* Trust and privacy */

export function ShieldIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 3 5 6v5.5c0 4.3 3 8 7 9.5 4-1.5 7-5.2 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
      <path d="M12 15v2" strokeWidth={2.25} />
    </Icon>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.3A10.6 10.6 0 0 1 12 5.2c4.5 0 8 3.2 9.5 6.8a11.7 11.7 0 0 1-2.6 3.8" />
      <path d="M6.3 6.9C4.5 8.1 3.2 9.9 2.5 12c1.5 3.6 5 6.8 9.5 6.8 1.6 0 3-.4 4.3-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Icon>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </Icon>
  );
}

/* Actions */

export function CopyIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5" />
    </Icon>
  );
}

export function LinkIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" />
    </Icon>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <Icon className={cx(className, "flip-rtl")}>
      <path d="M20.5 3.5 3.5 10.5l7.5 2.5 2.5 7.5 7-17Z" />
      <path d="m11 13 9.5-9.5" />
    </Icon>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M20 12a8 8 0 0 1-13.9 5.4" />
      <path d="M4 12a8 8 0 0 1 13.9-5.4" />
      <path d="M17.9 2.8v3.8h-3.8" />
      <path d="M6.1 21.2v-3.8h3.8" />
    </Icon>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Icon className={className} strokeWidth={2}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13.5 13.5 0 0 1 0 18" />
      <path d="M12 3a13.5 13.5 0 0 0 0 18" />
    </Icon>
  );
}

/* Arrows. Start/End follow the reading direction; Left/Right are physical. */

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </Icon>
  );
}

/** Points towards the end of the line: "continue", "next". Flips in RTL. */
export function ArrowEndIcon({ className }: IconProps) {
  return <ArrowRightIcon className={cx(className, "flip-rtl")} />;
}

/** Points towards the start of the line: "back". Flips in RTL. */
export function ArrowStartIcon({ className }: IconProps) {
  return <ArrowLeftIcon className={cx(className, "flip-rtl")} />;
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

/* Staff workspace */

/** Two sheets side by side: compare a lost and a found report. */
export function CompareIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="3" y="4" width="7.5" height="16" rx="1.5" />
      <rect x="13.5" y="4" width="7.5" height="16" rx="1.5" />
      <path d="M5.5 8.5h2.5M5.5 12h2.5M16 8.5h2.5M16 12h2.5" />
    </Icon>
  );
}

export function ListIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth={2.5} />
    </Icon>
  );
}

export function PulseIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />
    </Icon>
  );
}

/* Identity */

/** Solid keyhole, the Amanah symbol. Decorative. */
export function KeyholeGlyph({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="9" r="3.15" />
      <path d="M10.15 11.7 8.7 20.2h6.6l-1.45-8.5a3.6 3.6 0 0 1-3.7 0Z" />
    </svg>
  );
}

/**
 * Small trust mark: the keyhole on a pine tile. `tone="paper"` puts a paper
 * tile with a pine keyhole on dark fields.
 */
export function KeyholeMark({
  className = "size-9",
  tone = "pine",
}: IconProps & { tone?: "pine" | "paper" }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${
        tone === "paper" ? "bg-paper text-pine-deep" : "bg-forest text-paper"
      } ${className}`}
    >
      <KeyholeGlyph className="size-[55%]" />
    </span>
  );
}
