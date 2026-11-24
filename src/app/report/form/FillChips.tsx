"use client";

import { CheckIcon, PlusIcon } from "@/components/icons";
import { focusRingClassName } from "@/components/ui";

/*
  One example per field that writes straight into it. A quiet line under the
  field, not a pill: the lead ("Fill with example:") and the example sit in one
  real button, so the tap target is the whole line and its name says it
  fills. A long example shows its first line with an ellipsis; the button's
  accessible name keeps the full text. Once the field holds exactly that text
  it shows as pressed, so the visitor sees what the tap did.
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
  // The short lead before the example.
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
    <div role="group" aria-label={groupLabel} className="-mt-1 flex min-w-0">
      <button
        id={id}
        type="button"
        aria-pressed={pressed}
        disabled={disabled}
        onClick={() => onFill(text)}
        className={`-ms-2 inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-full px-2 text-start text-small transition-[background-color,color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 ${
          pressed ? "bg-accent pe-3.5 text-pine" : "text-foreground/85 hover:bg-secondary hover:text-foreground"
        } ${focusRingClassName}`}
      >
        {pressed ? (
          <CheckIcon className="size-3.5 shrink-0 text-forest" />
        ) : (
          <PlusIcon className="size-3.5 shrink-0 text-forest" />
        )}
        <span className="shrink-0 font-medium text-forest">{label}:</span>
        <span className="min-w-0 truncate">{text}</span>
      </button>
    </div>
  );
}
