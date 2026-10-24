import type { ReactNode } from "react";

// One line-icon style for the whole app. Icons are decorative: the text beside
// them always carries the meaning.

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

export function PinIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.25" />
    </Icon>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 3 5 6v5.5c0 4.3 3 8 7 9.5 4-1.5 7-5.2 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
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

export function BoxIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
    </Icon>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Icon>
  );
}

/** Solid keyhole, the Amanah symbol. Decorative. */
export function KeyholeGlyph({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="9" r="3.15" />
      <path d="M10.15 11.7 8.7 20.2h6.6l-1.45-8.5a3.6 3.6 0 0 1-3.7 0Z" />
    </svg>
  );
}

/** Small trust mark: a keyhole on a forest tile, as in the Amanah deck. */
export function KeyholeMark({ className = "size-9" }: IconProps) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-forest text-cream ${className}`}
    >
      <KeyholeGlyph className="size-[55%]" />
    </span>
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
