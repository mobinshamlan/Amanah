"use client";

import { CheckIcon } from "@/components/icons";
import { focusRingClassName } from "@/components/ui";

/*
  Suggestions that write straight into a field. Each chip is a real button
  labelled with the word it fills in; the one that matches the field's
  current value shows as pressed, so the visitor sees what the tap did.
*/
export function FillChips({
  id,
  label,
  groupLabel,
  items,
  value,
  disabled,
  onFill,
}: {
  id: string;
  label: string;
  groupLabel: string;
  items: readonly string[];
  value: string;
  disabled?: boolean;
  onFill: (item: string) => void;
}) {
  const current = value.trim();
  return (
    <div role="group" aria-label={groupLabel} className="flex flex-wrap items-center gap-2">
      <span id={id} className="me-1 text-small font-medium text-forest">
        {label}
      </span>
      {items.map((item) => {
        const pressed = current === item;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={pressed}
            disabled={disabled}
            onClick={() => onFill(item)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-small font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-55 ${
              pressed
                ? "border-accent bg-accent text-pine"
                : "border-foreground/30 bg-background text-foreground hover:border-pine hover:bg-secondary"
            } ${focusRingClassName}`}
          >
            {pressed ? <CheckIcon className="size-3.5 shrink-0" /> : null}
            {item}
          </button>
        );
      })}
    </div>
  );
}
