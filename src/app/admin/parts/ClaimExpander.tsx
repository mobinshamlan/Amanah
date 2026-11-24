"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { secondaryButtonClassName } from "@/components/ui";

/**
 * A ready claim that is not the next one: a compact row with a "Review claim"
 * button that reveals its evidence and decision controls. It also opens when
 * the page is linked to this claim (`#verification-<id>`).
 */
export function ClaimExpander({
  claimId,
  label,
  openLabel,
  children,
}: {
  // The id of the claim's list item, as used in links.
  claimId: string;
  label: string;
  openLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    const openIfLinked = () => {
      if (window.location.hash === `#${claimId}`) {
        setOpen(true);
      }
    };
    openIfLinked();
    window.addEventListener("hashchange", openIfLinked);
    return () => window.removeEventListener("hashchange", openIfLinked);
  }, [claimId]);

  return (
    <>
      <div className="px-4 pb-4 sm:px-5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={`${secondaryButtonClassName} w-full sm:w-auto`}
        >
          {open ? openLabel : label}
          <ChevronDownIcon
            className={`size-4 transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </>
  );
}
