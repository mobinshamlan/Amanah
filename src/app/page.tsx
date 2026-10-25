import Link from "next/link";
import { ArrowRightIcon, KeyholeGlyph } from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { SlipRow } from "@/components/ui";

// The two ways in. Each is a paper tag, like the one tied to an item at a
// lost-property desk; its eyelet is the Amanah keyhole.
const CHOICES = [
  {
    href: "/report/lost",
    title: "I lost something",
    description:
      "Describe the item and where you last had it. You get a private link to follow your report.",
    action: "Report a lost item",
  },
  {
    href: "/report/found",
    title: "I found something",
    description:
      "Describe the item and where you found it. Its details are never shown publicly.",
    action: "Report a found item",
  },
] as const;

// What actually happens, in order, and who does each part.
const JOURNEY = [
  {
    stage: "When a report is made",
    rows: [
      { what: "The item and where it was are described", who: "You" },
      { what: "The report is saved privately", who: "Amanah" },
      { what: "It is compared with reports of the other kind", who: "AI, privately" },
    ],
  },
  {
    stage: "If there is a possible match",
    rows: [
      { what: "The owner answers a few questions about the item", who: "Owner" },
      { what: "Staff review the claim", who: "Staff" },
    ],
  },
] as const;

const PRIVACY = [
  {
    title: "No public gallery.",
    body: "Found-item details are never shown publicly, and nobody can browse found items.",
  },
  {
    title: "Only your own report.",
    body: "If you lost something, your private link shows your report’s progress, never a list of found items.",
  },
  {
    title: "Questions in your own words.",
    body: "After a possible match, you answer a few questions about your item. You never see the found report or the answers staff expect.",
  },
  {
    title: "People decide, not AI.",
    body: "An AI suggestion never proves ownership. Staff review every claim and make the final decision.",
  },
] as const;

const tagFocus =
  "outline-none focus-visible:ring-3 focus-visible:ring-sage focus-visible:ring-offset-4 focus-visible:ring-offset-ink";

export default function Home() {
  return (
    <>
      <SiteHeader tone="ink" />
      <main id="main" className="flex-1">
        {/* First screen: the promise and the two ways in. */}
        <section aria-labelledby="brand-line" className="bg-ink text-cream">
          <div className="mx-auto grid w-full max-w-[1440px] gap-12 px-4 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,33rem)] lg:items-center lg:gap-16 lg:pb-32 xl:px-12">
            <div className="flex flex-col">
              <h1
                id="brand-line"
                className="max-w-[12ch] text-balance font-serif text-[3.25rem] font-semibold leading-[0.98] tracking-[-0.025em] text-cream motion-safe:animate-rise sm:text-7xl lg:text-[6.25rem]"
              >
                Every lost item is an amanah.
              </h1>
              <p
                lang="ar"
                dir="rtl"
                className="mt-5 w-fit font-arabic text-[2rem] leading-snug text-sage motion-safe:animate-rise motion-safe:[animation-delay:80ms] sm:text-[2.75rem]"
              >
                كل مفقود أمانة
              </p>
              <p className="mt-8 max-w-[44ch] text-pretty text-lg leading-relaxed text-cream/90 motion-safe:animate-rise motion-safe:[animation-delay:160ms] sm:text-xl">
                Amanah is a private lost-and-found service. Report what you lost
                or found; possible matches are checked privately, and staff make
                the final decision on every claim.
              </p>
              <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-cream/70 motion-safe:animate-rise motion-safe:[animation-delay:220ms]">
                <span className="font-serif text-xl italic text-cream">amanah</span>{" "}
                (n.) something entrusted to you, to keep safe and to return.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <h2 className="font-serif text-[1.75rem] font-semibold leading-tight text-cream sm:text-[2rem]">
                What happened?
              </h2>
              <ul className="flex flex-col gap-5">
                {CHOICES.map((choice, index) => (
                  <li
                    key={choice.href}
                    className="origin-[2.5rem_50%] motion-safe:animate-swing"
                    style={{ animationDelay: `${260 + index * 140}ms` }}
                  >
                    <Link
                      href={choice.href}
                      className={`group relative isolate flex min-h-44 cursor-pointer items-center gap-5 py-7 pl-5 pr-6 text-foreground transition-transform duration-300 ease-out hover:-rotate-1 focus-visible:-rotate-1 sm:gap-7 sm:py-8 sm:pl-6 sm:pr-8 motion-reduce:hover:rotate-0 ${tagFocus}`}
                    >
                      <span
                        aria-hidden
                        className="shape-tag absolute inset-0 -z-10 bg-card transition-colors duration-200 group-hover:bg-accent group-focus-visible:bg-accent"
                      />
                      {/* The eyelet: punched through to the ink behind. */}
                      <span
                        aria-hidden
                        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ink text-sage ring-[5px] ring-sage/35 transition-colors duration-200 group-hover:text-cream sm:size-16"
                      >
                        <KeyholeGlyph className="size-8 sm:size-9" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-2">
                        <span className="font-serif text-[2rem] font-semibold leading-none tracking-[-0.015em] sm:text-[2.4rem]">
                          {choice.title}
                        </span>
                        <span className="text-pretty text-base leading-relaxed text-foreground/75">
                          {choice.description}
                        </span>
                        <span className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-pine">
                          {choice.action}
                          <ArrowRightIcon className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* The journey, printed as a slip from the desk's pad. */}
        <section aria-labelledby="journey-title" className="bg-background">
          <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:py-36 xl:px-12">
            <div className="reveal flex flex-col gap-5">
              <h2
                id="journey-title"
                className="max-w-[14ch] text-balance font-serif text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-6xl"
              >
                From report to decision
              </h2>
              <p className="max-w-[40ch] text-pretty text-lg leading-relaxed text-foreground/85">
                Nothing is published along the way. Matching happens privately,
                and an AI suggestion is only ever a starting point for people to
                check.
              </p>
              <p className="max-w-[40ch] text-pretty text-base leading-relaxed text-muted-foreground">
                If you found something, your part ends once your report is saved.
                You are not shown whether it matched anyone.
              </p>
            </div>

            <div className="reveal lg:pt-2">
              <div className="edge-torn mx-auto w-full max-w-xl rotate-[0.6deg] bg-card px-5 pt-7 sm:px-9 sm:pt-9 lg:mx-0">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-serif text-[1.75rem] font-semibold leading-tight">
                    Your report, step by step
                  </h3>
                  <KeyholeGlyph className="size-7 shrink-0 text-forest" />
                </div>
                <span aria-hidden className="perforation mt-5 block text-foreground/25" />
                {JOURNEY.map((group) => (
                  <div key={group.stage} className="mt-7">
                    <h4 className="text-base font-bold text-foreground">{group.stage}</h4>
                    <ol className="mt-2 text-base leading-snug">
                      {group.rows.map((row) => (
                        <SlipRow key={row.what} label={row.what} value={row.who} />
                      ))}
                    </ol>
                  </div>
                ))}
                <p className="mt-8 flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-ink px-4 py-2.5 text-cream">
                  <span className="font-semibold">Every claim ends with a staff decision</span>
                  <span className="text-cream/75">Staff</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What stays private, on a full field of forest. */}
        <section aria-labelledby="privacy-title" className="bg-forest text-cream">
          <div className="mx-auto grid w-full max-w-[1440px] gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16 lg:py-32 xl:px-12">
            <div className="reveal flex flex-col gap-5">
              <h2
                id="privacy-title"
                className="max-w-[12ch] text-balance font-serif text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.02em] text-cream sm:text-6xl"
              >
                What stays private
              </h2>
              <p className="max-w-[36ch] text-pretty text-lg leading-relaxed text-cream/90">
                Private by default. Reports are for staff to review, never for
                the public to browse.
              </p>
            </div>
            <ul className="reveal grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {PRIVACY.map((point) => (
                <li key={point.title} className="flex flex-col gap-3">
                  <KeyholeGlyph className="size-7 text-sage" />
                  <h3 className="font-serif text-[1.75rem] font-semibold leading-tight text-cream">
                    {point.title}
                  </h3>
                  <p className="max-w-[38ch] text-pretty text-base leading-relaxed text-cream/90">
                    {point.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
