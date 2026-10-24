import Link from "next/link";
import { ArrowRightIcon, KeyholeIllustration } from "@/components/icons";
import { SiteHeader } from "@/components/site-header";
import { focusRingClassName } from "@/components/ui";

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

const ACTIONS = [
  {
    href: "/report/lost",
    title: "Report a lost item",
    description: "Describe what you lost and where you last saw it.",
  },
  {
    href: "/report/found",
    title: "Report a found item",
    description: "Report an item so it can be returned safely.",
  },
];

export default function Home() {
  return (
    <>
      <div className="bg-ink text-cream">
        <SiteHeader tone="ink" />
        <main id="main">
        <section className="mx-auto grid w-full max-w-5xl items-center gap-6 px-5 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_180px] lg:gap-10">
          <div className="max-w-xl">
            <p className="flex items-baseline gap-4">
              <span
                lang="ar"
                dir="rtl"
                className="font-arabic text-4xl leading-none text-sage sm:text-5xl"
              >
                أمانة
              </span>
              <span aria-hidden className="h-8 w-px bg-sage/80 sm:h-10" />
              <span className="font-serif text-4xl font-semibold leading-none tracking-[0.08em] text-cream sm:text-5xl">
                AMANAH
              </span>
            </p>
            <h1 className="mt-6 max-w-lg font-serif text-[2.35rem] font-medium italic leading-[1.12] tracking-tight text-cream sm:text-5xl">
              Lost belongings. Rightful owners. Securely reunited.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-cream/80 sm:text-lg">
              Report a lost or found item. Reports stay private, and staff make
              the final decision on every claim.
            </p>
            <p className="mt-6 max-w-md border-t border-sage/50 pt-4 text-sm leading-relaxed text-sage sm:text-base">
              <span className="font-serif text-lg italic text-cream">amanah</span>{" "}
              <span className="text-cream/70">(n.)</span> something entrusted to
              you — to keep safe and to return.
            </p>
          </div>
          <KeyholeIllustration className="mx-auto h-36 w-auto text-sage sm:h-44 lg:mx-0 lg:h-64" />
        </section>

        <div className="mx-auto w-full max-w-5xl px-5 pb-10 sm:px-8 sm:pb-12">
          <h2 className="font-serif text-[2rem] font-semibold leading-tight tracking-tight text-cream sm:text-4xl">
            How can we help?
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-cream/15 bg-card text-foreground shadow-card">
            {ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`group flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0 hover:bg-accent sm:px-6 sm:py-5 ${focusRingClassName}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[1.45rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[1.7rem]">
                    {action.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {action.description}
                  </span>
                </span>
                <ArrowRightIcon className="size-4 shrink-0 text-forest transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            ))}
          </div>
        </div>

      <div className="flex w-full flex-1 flex-col bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-3xl flex-col px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-12">
          <section aria-labelledby="journey-title">
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
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {step.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-foreground sm:text-base">
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
