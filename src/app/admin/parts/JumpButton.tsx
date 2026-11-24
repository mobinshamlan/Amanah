"use client";

import { ChevronDownIcon } from "@/components/icons";
import { linkClassName } from "@/components/ui";

/**
 * Moves to and focuses an element further down the same claim, without
 * touching the URL (its hash already names the linked claim).
 */
export function JumpButton({ targetId, label, className = "" }: { targetId: string; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const target = document.getElementById(targetId);
        if (!target) {
          return;
        }
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        target.focus({ preventScroll: true });
      }}
      className={`${linkClassName} min-h-11 ${className}`}
    >
      {label}
      <ChevronDownIcon className="size-4" />
    </button>
  );
}
