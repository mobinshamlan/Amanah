"use client";

import type { ReactNode } from "react";

/**
 * The band's link to a claim on the same sheet. It scrolls to the claim and
 * moves focus there too, so keyboard and screen reader users land on it.
 */
export function NextClaimLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        const hash = href.slice(href.indexOf("#"));
        const target = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
        if (!target || event.metaKey || event.ctrlKey || event.shiftKey) {
          return;
        }
        event.preventDefault();
        history.replaceState(null, "", hash);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        target.focus({ preventScroll: true });
      }}
    >
      {children}
    </a>
  );
}
