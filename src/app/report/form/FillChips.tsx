"use client";

import { CheckIcon, PlusIcon } from "@/components/icons";
import { focusRingClassName } from "@/components/ui";

/*
  One example per field that writes straight into it. The chip is a real
  button labelled with the words it fills in; once the field holds exactly
  that text it shows as pressed, so the visitor sees what the tap did. The
  short lead ("Try an example") says the tap fills, not sends.
*/
export function FillChip({
  id,
  label,
  groupLabel,
  text,
  value,
  disabled,
  onFill,
}: {
  id: string;
  // The short lead before the chip.
  label: string;
  groupLabel: string;
  // What the tap writes into the field.
  text: string;
  value: string;
  disabled?: boolean;
  onFill: (text: string) => void;
}) {
  const pressed = value.trim() === text;
  return (
    <div role="group" aria-label={groupLabel} className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span id={id} className="text-small font-medium text-forest">
        {label}
      </span>
      <button
        type="button"
        aria-pressed={pressed}
        disabled={disabled}
        onClick={() => onFill(text)}
        className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-3.5 py-1.5 text-start text-small font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${
          pressed
            ? "border-accent bg-accent text-pine"
            : "border-foreground/30 bg-background text-foreground hover:border-pine hover:bg-secondary"
        } ${focusRingClassName}`}
      >
        {pressed ? (
          <CheckIcon className="size-3.5 shrink-0" />
        ) : (
          <PlusIcon className="size-3.5 shrink-0 text-forest" />
        )}
        <span className="min-w-0 break-words">{text}</span>
      </button>
    </div>
  );
}
