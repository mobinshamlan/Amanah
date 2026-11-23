"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowStartIcon, LensIcon, TagIcon } from "@/components/icons";
import { focusRingOnDarkClassName } from "@/components/ui";

/*
  The first row of the report page: the homepage's pine stage continued.
  The question in the visitor's words, one sentence, the kind's mark, and
  the desk render for this kind. On wide screens the render hangs past the
  band's bottom edge onto the paper, so the band reads as the wall behind
  the counter and the form sheet beside it sits on the desk.
*/

const ART = {
  lost: "/art/guide-compare.png",
  found: "/art/guide-handover.png",
} as const;

/** The kind's mark on pine: a lens in a dashed ring for lost, a tag on a paper tile for found. */
function KindMark({ kind }: { kind: "lost" | "found" }) {
  return kind === "lost" ? (
    <span
      aria-hidden
      className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-paper/70 text-paper"
    >
      <LensIcon className="size-5" />
    </span>
  ) : (
    <span
      aria-hidden
      className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-paper text-pine-deep"
    >
      <TagIcon className="size-5" />
    </span>
  );
}

export function FormStage({
  kind,
  title,
  intro,
  artAlt,
  backLabel,
}: {
  kind: "lost" | "found";
  title: ReactNode;
  intro: ReactNode;
  artAlt: string;
  backLabel: ReactNode;
}) {
  return (
    <header className="col-start-1 row-start-1 flex min-w-0 flex-col items-start text-paper">
      <Link
        href="/"
        className={`-ms-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-2 text-sm font-medium text-paper/80 transition-colors hover:text-paper ${focusRingOnDarkClassName}`}
      >
        <ArrowStartIcon className="size-4" />
        {backLabel}
      </Link>
      <div className="mt-4 flex items-center gap-4 motion-safe:animate-rise sm:mt-6">
        <KindMark kind={kind} />
        <h1 className="max-w-[14ch] text-title text-paper">{title}</h1>
      </div>
      <p className="mt-4 max-w-[42ch] text-lead text-paper/90 motion-safe:animate-rise motion-safe:[animation-delay:90ms]">
        {intro}
      </p>
      {/*
        The desk. On phones a low band under the sentence, with its front
        edge tucked under the form sheet; from lg it hangs past the band.
      */}
      <div className="form-desk relative mt-4 h-44 w-full max-w-[22rem] self-center overflow-hidden sm:h-56 sm:max-w-[26rem] lg:-mb-24 lg:mt-6 lg:h-auto lg:max-w-[30rem] lg:self-start lg:overflow-visible">
        <Image
          src={ART[kind]}
          alt={artAlt}
          width={1200}
          height={900}
          priority
          sizes="(min-width: 1024px) 36vw, (min-width: 640px) 26rem, 22rem"
          className="h-full w-full object-cover object-[50%_42%] lg:h-auto lg:object-contain"
        />
      </div>
    </header>
  );
}
