import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-center px-5 sm:h-20 sm:px-8">
        <Link
          href="/"
          aria-label="AMANAH — home"
          className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="font-serif text-2xl font-semibold leading-none tracking-[0.18em] text-foreground sm:text-[1.7rem]">
            AMANAH
          </span>
          <span aria-hidden className="h-5 w-px bg-sage" />
          <span
            lang="ar"
            dir="rtl"
            className="font-arabic text-2xl leading-none text-forest sm:text-[1.7rem]"
          >
            أمانة
          </span>
        </Link>
      </div>
    </header>
  );
}
