"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { GlobeIcon } from "@/components/icons";
import { setLocale } from "@/i18n/actions";
import { useLocale, useMessages } from "@/i18n/LocaleProvider";
import { common } from "@/i18n/messages/common";

type Tone = "paper" | "pine";

const toneClassName: Record<Tone, string> = {
  paper:
    "border-foreground/20 text-foreground hover:border-foreground/45 hover:bg-secondary focus-visible:ring-ring focus-visible:ring-offset-background",
  pine:
    "border-paper/25 text-paper hover:border-paper/50 hover:bg-paper/10 focus-visible:ring-brass-light focus-visible:ring-offset-pine-deep",
};

/**
 * Switches between Arabic and English and keeps the visitor on the same page.
 * A quiet outlined pill; pass `tone="pine"` on dark fields. `className` adds
 * to the default look (position, margins), it does not replace it.
 */
export function LanguageSwitch({
  tone = "paper",
  className = "",
}: {
  tone?: Tone;
  className?: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const t = useMessages(common);
  const [pending, startTransition] = useTransition();
  const next = locale === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      lang={next}
      dir={next === "ar" ? "rtl" : "ltr"}
      aria-label={t.switchToLabel}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() =>
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        })
      }
      className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-small font-medium outline-none transition-[background-color,border-color,color] duration-150 focus-visible:ring-3 focus-visible:ring-offset-2 disabled:cursor-progress disabled:opacity-60 ${toneClassName[tone]} ${className}`}
    >
      <GlobeIcon className="size-4.5 shrink-0" />
      {t.switchTo}
    </button>
  );
}
