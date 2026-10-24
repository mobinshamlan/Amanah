import Link from "next/link";
import { KeyholeMark } from "@/components/icons";

export function SiteHeader({
  badge,
  tone = "cream",
}: {
  badge?: string;
  tone?: "cream" | "ink";
}) {
  const ink = tone === "ink";
  const offset = ink
    ? "focus-visible:ring-sage/80 focus-visible:ring-offset-ink"
    : "focus-visible:ring-ring/40 focus-visible:ring-offset-background";

  return (
    <header className={ink ? "border-b border-cream/10" : "border-b border-border/70"}>
      <a
        href="#main"
        className={`sr-only rounded-lg bg-cream px-4 py-2 text-sm font-medium text-ink outline-none focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus-visible:ring-3 focus-visible:ring-offset-2 ${offset}`}
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-3 px-5 sm:h-20 sm:px-8 xl:px-12">
        <Link
          href="/"
          aria-label="AMANAH — home"
          className={`flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-offset-2 sm:gap-3 ${offset}`}
        >
          <KeyholeMark className="size-8 sm:size-9" />
          <span
            className={`font-serif text-xl font-semibold leading-none tracking-[0.16em] sm:text-2xl ${
              ink ? "text-cream" : "text-foreground"
            }`}
          >
            AMANAH
          </span>
          <span aria-hidden className={`h-4 w-px ${ink ? "bg-sage/70" : "bg-sage"}`} />
          <span
            lang="ar"
            dir="rtl"
            className={`font-arabic text-xl leading-none sm:text-2xl ${
              ink ? "text-sage" : "text-forest"
            }`}
          >
            أمانة
          </span>
        </Link>
        {badge ? (
          <span className="rounded-full border border-pine/25 bg-accent px-2.5 py-1 text-[0.7rem] font-semibold uppercase leading-none tracking-[0.14em] text-pine">
            {badge}
          </span>
        ) : null}
      </div>
    </header>
  );
}
