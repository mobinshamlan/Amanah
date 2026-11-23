"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import {
  CheckIcon,
  ArrowStartIcon,
  HandIcon,
  LensIcon,
  LinkIcon,
  QuestionIcon,
  XIcon,
} from "@/components/icons";
import { focusRingOnDarkClassName, frameClassName } from "@/components/ui";
import { useMessages } from "@/i18n/LocaleProvider";
import { common } from "@/i18n/messages/common";
import "@/app/report/track/parts/track.css";

/*
  Every after-report screen is the next scene at the lost-property desk, laid
  out like the report forms: the pine wall carries the status in plain words;
  the one thing to act on sits on the counter beside it, crossing the wall's
  edge, with the desk render for this moment resting on the same edge.
  On phones a task (a question, a fresh save) comes straight after the intro
  and the render waits for wider screens; anything secondary sits below.
*/
export type SceneArt = "compare" | "question" | "handover";
export type SceneMark = "lens" | "pause" | "question" | "hand" | "check" | "x" | "link";

const ART: Record<SceneArt, string> = {
  compare: "/art/guide-compare.png",
  question: "/art/guide-question.png",
  handover: "/art/guide-handover.png",
};

function PauseGlyph() {
  return (
    <span className="flex gap-[4px]">
      <span className="h-4 w-[3px] rounded-full bg-current" />
      <span className="h-4 w-[3px] rounded-full bg-current" />
    </span>
  );
}

/** The moment's mark beside the headline. Decorative: the headline says it in words. */
function Mark({ mark }: { mark: SceneMark }) {
  const glyph = {
    lens: <LensIcon className="size-5" />,
    pause: <PauseGlyph />,
    question: <QuestionIcon className="size-5" />,
    hand: <HandIcon className="size-5" />,
    check: <CheckIcon className="size-5" />,
    x: <XIcon className="size-5" />,
    link: <LinkIcon className="size-5" />,
  }[mark];
  const filled = mark === "check" || mark === "x" || mark === "link";
  return (
    <span
      aria-hidden
      className={`hidden size-10 shrink-0 items-center justify-center rounded-full sm:flex ${
        filled ? "bg-paper text-pine-deep" : "border-2 border-dashed border-paper/70 text-paper"
      }`}
    >
      {glyph}
    </span>
  );
}

export function TrackScene({
  art,
  mark,
  title,
  intro,
  headingRef,
  sheet,
  aside,
  stage = "status",
}: {
  art: SceneArt;
  mark: SceneMark;
  title: ReactNode;
  intro: ReactNode;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  // The one thing to act on, on the counter.
  sheet: ReactNode;
  // Secondary: the compact link, a note, the quieter actions.
  aside?: ReactNode;
  // "task": the sheet asks for something, so phones skip the render.
  // "recovery": a short help screen with a smaller render, wide screens only.
  stage?: "status" | "task" | "recovery";
}) {
  const c = useMessages(common);
  const artOnPhones = stage === "status";
  return (
    <section className="relative isolate overflow-x-clip pb-20 sm:pb-28">
      <div
        className={`${frameClassName} grid gap-x-12 gap-y-0 pt-3 sm:pt-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-16 lg:pt-8`}
      >
        <span
          aria-hidden
          className={`track-band-bg pointer-events-none relative -z-10 col-span-full -mt-3 self-stretch sm:-mt-5 lg:row-[1/2] lg:-mt-8 ${
            artOnPhones ? "row-[1/3]" : "row-[1/2]"
          }`}
        />

        <header className="col-start-1 row-start-1 flex min-w-0 flex-col items-start pb-10 text-paper lg:pb-12">
          <Link
            href="/"
            className={`-ms-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-2 text-sm font-medium text-paper/80 transition-colors hover:text-paper ${focusRingOnDarkClassName}`}
          >
            <ArrowStartIcon className="size-4" />
            {c.backHome}
          </Link>
          <div className="mt-4 flex items-start motion-safe:animate-rise sm:mt-6 sm:gap-4">
            <span className="mt-1 sm:mt-1.5">
              <Mark mark={mark} />
            </span>
            <h1
              ref={headingRef}
              tabIndex={headingRef ? -1 : undefined}
              className="track-title max-w-[24ch] text-balance text-paper outline-none"
            >
              {title}
            </h1>
          </div>
          <p className="mt-4 max-w-[46ch] text-lead text-paper/90 motion-safe:animate-rise motion-safe:[animation-delay:90ms]">
            {intro}
          </p>
        </header>

        {/* The desk render rests on the wall's edge, the same edge the sheet crosses. */}
        <div
          className={`track-desk relative col-start-1 row-start-2 -mt-6 mb-0 h-44 w-full max-w-[22rem] self-start justify-self-center overflow-hidden sm:h-56 sm:max-w-[26rem] lg:-mt-16 lg:block lg:h-auto lg:justify-self-start lg:overflow-visible ${
            artOnPhones ? "" : "hidden"
          } ${stage === "recovery" ? "lg:max-w-[20rem]" : "lg:max-w-[27rem]"}`}
        >
          <Image
            src={ART[art]}
            alt=""
            width={1200}
            height={900}
            priority={artOnPhones}
            sizes="(min-width: 1024px) 27rem, (min-width: 640px) 26rem, 22rem"
            className="h-full w-full object-cover object-[50%_42%] lg:h-auto lg:object-contain"
          />
        </div>

        <div
          className={`track-sheet relative flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-20 ${
            artOnPhones ? "-mt-7" : "-mt-7 row-start-2"
          }`}
        >
          {sheet}
        </div>

        {aside ? (
          <div className="flex min-w-0 flex-col gap-6 pt-10 lg:col-start-1 lg:row-start-3 lg:pt-8">{aside}</div>
        ) : null}
      </div>
    </section>
  );
}

/** A short line with a glyph, for notes under the desk. */
export function SceneNote({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex max-w-[52ch] items-start gap-2.5 text-small text-foreground/85">
      <span className="mt-1 shrink-0 text-forest">{icon}</span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}
