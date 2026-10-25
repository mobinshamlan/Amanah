import Link from "next/link";
import { KeyholeMark } from "@/components/icons";

type Tone = "cream" | "ink";

const NAV = [
  { href: "/report/lost", label: "Report lost" },
  { href: "/report/found", label: "Report found" },
] as const;

function focusFor(tone: Tone) {
  return tone === "ink"
    ? "outline-none focus-visible:ring-3 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
    : "outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
}

/** AMANAH | أمانة beside the keyhole mark. */
export function Wordmark({
  tone = "cream",
  size = "md",
}: {
  tone?: Tone;
  size?: "md" | "lg";
}) {
  const ink = tone === "ink";
  const large = size === "lg";
  return (
    <span className={`flex items-center ${large ? "gap-4" : "gap-2.5 sm:gap-3"}`}>
      <KeyholeMark className={large ? "size-12 sm:size-14" : "size-8 sm:size-9"} />
      <span
        className={`font-serif font-semibold leading-none tracking-[0.16em] ${
          large ? "text-4xl sm:text-5xl" : "text-xl sm:text-2xl"
        } ${ink ? "text-cream" : "text-foreground"}`}
      >
        AMANAH
      </span>
      <span aria-hidden className={`${large ? "h-8" : "h-4"} w-px ${ink ? "bg-sage/70" : "bg-sage"}`} />
      <span
        lang="ar"
        dir="rtl"
        className={`font-arabic leading-none ${large ? "text-4xl sm:text-5xl" : "text-xl sm:text-2xl"} ${
          ink ? "text-sage" : "text-forest"
        }`}
      >
        أمانة
      </span>
    </span>
  );
}

export function SiteHeader({ tone = "cream" }: { tone?: Tone }) {
  const ink = tone === "ink";
  const focus = focusFor(tone);

  return (
    <header className={ink ? "bg-ink text-cream" : "bg-background text-foreground"}>
      <a
        href="#main"
        className={`sr-only rounded-full bg-cream px-4 py-2 text-sm font-semibold text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-20 ${focus}`}
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:h-20 sm:px-8 xl:px-12">
        <Link href="/" aria-label="AMANAH — home" className={`rounded-lg ${focus}`}>
          <Wordmark tone={tone} />
        </Link>
        <nav aria-label="Report an item" className="hidden sm:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 text-[0.9375rem] font-medium transition-colors ${focus} ${
                    ink
                      ? "text-cream/85 hover:bg-cream/10 hover:text-cream"
                      : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/** The close of every public page: the name returns at full size with its meaning. */
export function SiteFooter() {
  const focus = focusFor("ink");
  return (
    <footer className="bg-ink text-cream">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 pb-10 pt-16 sm:px-8 sm:pt-20 xl:px-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-5">
            <Wordmark tone="ink" size="lg" />
            <p className="max-w-[34ch] text-lg leading-relaxed text-cream/80">
              Every lost item is an amanah: something entrusted to us, to keep
              safe and to return.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-col gap-1 sm:flex-row sm:gap-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`-ml-3 inline-flex min-h-11 items-center rounded-full px-3 text-base font-medium text-cream/85 underline-offset-4 transition-colors hover:text-cream hover:underline sm:ml-0 ${focus}`}
                  >
                    {item.label === "Report lost" ? "Report a lost item" : "Report a found item"}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <span aria-hidden className="perforation block text-sage/40" />
        <p className="text-sm text-cream/65">
          Reports are private. Found-item details are never shown publicly.
        </p>
      </div>
    </footer>
  );
}
