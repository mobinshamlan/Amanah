import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const cardClassName =
  "group flex h-full w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-card outline-none transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-card-hover focus-visible:border-forest focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:shadow-card sm:min-h-56 sm:flex-col sm:items-stretch sm:gap-0 sm:p-7";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 pb-12 pt-10 sm:px-8 sm:pb-20 sm:pt-12">
          <h1 className="text-balance text-center font-serif text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            How can we help?
          </h1>
          <p className="mt-4 max-w-sm text-balance text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
            A simple place to report lost or found items and help them get back
            to their owners.
          </p>

          <div className="mt-10 grid w-full gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-5">
            <Link href="/report/lost" className={cardClassName}>
              <span className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[1.9rem]">
                Report a lost item
              </span>
              <span className="mt-1 text-sm leading-relaxed text-muted-foreground sm:mt-2 sm:text-base">
                Describe what you lost and where you last saw it.
              </span>
            </Link>
            <Link href="/report/found" className={cardClassName}>
              <span className="font-serif text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[1.9rem]">
                Report a found item
              </span>
              <span className="mt-1 text-sm leading-relaxed text-muted-foreground sm:mt-2 sm:text-base">
                Report an item so it can be returned safely.
              </span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
