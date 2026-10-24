import Link from "next/link";
import { ArrowRightIcon, KeyholeGlyph } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";

const JOURNEY = [
  {
    title: "Report",
    detail: "Describe a lost or found item in your own words.",
  },
  {
    title: "Record privately",
    detail: "Reports are saved privately. There is no public gallery.",
  },
  {
    title: "Match privately",
    detail: "AI suggests possible matches. A suggestion never proves ownership.",
  },
  {
    title: "Verify and decide",
    detail: "The owner answers neutral questions. Staff decide the next step.",
  },
];

// The entrusted pair: the owner who lost something and the finder who hands it
// in. Equal weight, mirrored on wide screens, joined by one keyhole.
const ACTIONS = [
  {
    href: "/report/lost",
    side: "lost",
    title: "Report a lost item",
    description: "Describe what you lost and where you last saw it.",
  },
  {
    href: "/report/found",
    side: "found",
    title: "Report a found item",
    description: "Report an item so it can be returned safely.",
  },
] as const;

// Staggered entrance on load. Without the motion preference nothing moves and
// everything is visible from the start.
const enter = "motion-safe:animate-enter";

export default function Home() {
  return (
    <>
      <div className="bg-ink text-cream">
        <SiteHeader tone="ink" />
        <main id="main">
          <section
            aria-labelledby="brand-line"
            className="mx-auto w-full max-w-[1440px] px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-16 xl:px-12"
          >
            <div className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-8">
              <div>
                <h1
                  id="brand-line"
                  className={`max-w-[15ch] text-balance font-serif text-[2.9rem] font-semibold leading-[1.02] tracking-tight text-cream sm:text-7xl lg:text-[5.1rem] ${enter}`}
                >
                  Every lost item is an amanah.
                </h1>
                <p
                  lang="ar"
                  dir="rtl"
                  className={`mt-4 w-fit font-arabic text-[1.9rem] leading-snug text-sage sm:mt-5 sm:text-[2.6rem] ${enter} motion-safe:[animation-delay:90ms]`}
                >
                  كل مفقود أمانة
                </p>
              </div>
              <div
                className={`mt-7 flex max-w-xl flex-col gap-3 sm:mt-9 lg:mt-0 ${enter} motion-safe:[animation-delay:180ms]`}
              >
                <p className="text-lg leading-relaxed text-cream/90 sm:text-xl">
                  Report a lost or found item. Reports stay private, and staff make
                  the final decision on every claim.
                </p>
                <p className="text-base leading-relaxed text-cream/70">
                  <span className="font-serif text-lg italic text-cream">amanah</span>{" "}
                  (n.) something entrusted to you — to keep safe and to return.
                </p>
              </div>
            </div>

            <h2
              className={`mt-12 font-serif text-[1.75rem] font-semibold leading-tight tracking-tight text-cream sm:mt-16 lg:mt-14 sm:text-[2rem] ${enter} motion-safe:[animation-delay:260ms]`}
            >
              How can we help?
            </h2>
            <div className="group/pair relative mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {ACTIONS.map((action, index) => {
                const found = action.side === "found";
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    data-side={action.side}
                    className={`group flex min-h-48 cursor-pointer flex-col justify-between gap-8 rounded-2xl bg-card p-6 text-foreground transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-accent active:translate-y-0 focus-visible:-translate-y-0.5 sm:min-h-64 sm:p-9 outline-none focus-visible:ring-3 focus-visible:ring-sage focus-visible:ring-offset-3 focus-visible:ring-offset-ink ${
                      found
                      ? "pt-12 sm:pl-16 sm:pt-9"
                        : "pb-12 sm:pb-9 sm:pr-16"
                    } ${enter}`}
                    style={{ animationDelay: `${340 + index * 90}ms` }}
                  >
                    <span className="block">
                      <span className="block text-balance font-serif text-[2rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[2.15rem] lg:text-[2.6rem]">
                        {action.title}
                      </span>
                      <span className="mt-3 block max-w-[30ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
                        {action.description}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-base font-semibold text-foreground">
                      <span className="flex size-11 items-center justify-center rounded-full bg-ink text-cream transition-colors duration-200 group-hover:bg-forest group-focus-visible:bg-forest">
                        <ArrowRightIcon className="size-5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                      </span>
                      Start report
                    </span>
                  </Link>
                );
              })}

              {/* The keyhole sits on the seam and belongs to both choices. */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              >
                <span className="flex size-[4.75rem] items-center justify-center rounded-full bg-ink motion-safe:animate-seal motion-safe:[animation-delay:560ms] sm:size-24">
                  <span className="flex size-14 items-center justify-center rounded-full border-2 border-sage/45 text-sage transition-colors duration-300 group-has-[a:hover]/pair:border-sage group-has-[a:hover]/pair:text-cream group-has-[a:focus-visible]/pair:border-sage group-has-[a:focus-visible]/pair:text-cream sm:size-[4.5rem]">
                    <KeyholeGlyph className="size-9 sm:size-11" />
                  </span>
                </span>
              </span>
            </div>
          </section>

      <div className="flex w-full flex-1 flex-col bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 xl:px-12">
          <section aria-labelledby="journey-title" className="max-w-3xl">
            <h2
              id="journey-title"
              className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[1.9rem]"
            >
              From report to staff decision
            </h2>
            <ol className="mt-4 border-t border-border">
              {JOURNEY.map((step, index) => {
                const last = index === JOURNEY.length - 1;
                return (
                  <li
                    key={step.title}
                    className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-border py-4 sm:grid-cols-[3.5rem_1fr] sm:gap-6 sm:py-5"
                  >
                    <span
                      aria-hidden
                      className={`font-serif text-2xl leading-none tabular-nums sm:text-3xl ${
                        last ? "text-clay-ink" : "text-pine"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold leading-snug text-foreground">
                        <span className="sr-only">Step {index + 1}: </span>
                        {step.title}
                      </h3>
                      <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground">
              <span className="font-semibold">Private by default.</span> Found-item
              details are never shown publicly, and people reporting a loss never
              see a list of found items.
            </p>
          </section>
        </div>
      </div>
        </main>
      </div>
    </>
  );
}
