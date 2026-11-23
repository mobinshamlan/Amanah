import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HeroPicture } from "@/components/home/HeroPicture";
import "@/components/home/home.css";
import {
  ArrowEndIcon,
  EyeOffIcon,
  LensIcon,
  LockIcon,
  TagIcon,
  UserIcon,
} from "@/components/icons";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import {
  frameClassName,
  primaryOnDarkButtonClassName,
  secondaryOnDarkButtonClassName,
  textLinkOnDarkClassName,
} from "@/components/ui";
import { home } from "@/i18n/messages/home";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(home);
  return { title: t.metaTitle, description: t.metaDescription };
}

// The three scenes of what happens after a report, in order, on one desk.
const SCENES = [
  { src: "/art/guide-compare.png" },
  { src: "/art/guide-question.png" },
  { src: "/art/guide-handover.png" },
] as const;

const PROMISE_ICONS = [EyeOffIcon, LockIcon, UserIcon] as const;

// The outlined pill on pine at the same 48px height as the primary beside it.
const foundButtonClassName = `${secondaryOnDarkButtonClassName.replace("min-h-11 px-5", "min-h-12 px-7")}`;

/** The two ways in, side by side from `sm`, stacked on phones. Lost is the filled pill, found the outlined one; each carries its own cue. */
function ReportActions({
  t,
  label,
}: {
  t: (typeof home)["en"];
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <Link href="/report/lost" className={primaryOnDarkButtonClassName}>
        <LensIcon className="size-5 shrink-0" />
        {t.reportLost}
      </Link>
      <Link href="/report/found" className={foundButtonClassName}>
        <TagIcon className="size-5 shrink-0" />
        {t.reportFound}
      </Link>
    </div>
  );
}

export default async function Home() {
  const t = await getMessages(home);

  return (
    <>
      <SiteHeader tone="pine" />
      <main id="main" className="flex-1">
        {/* First screen: the desk, the question, the two ways in. */}
        <section
          aria-labelledby="hero-title"
          className="relative isolate overflow-hidden bg-pine-deep text-paper lg:flex lg:min-h-[min(52rem,calc(100svh-5rem))] lg:items-center"
        >
          {/*
            The picture. On phones it is a band at the top of the stage; from
            lg it fills the whole stage and the text sits on its calm side.
          */}
          <div className="relative h-[clamp(11rem,28svh,19rem)] w-full lg:absolute lg:inset-0 lg:-z-10 lg:h-auto">
            <HeroPicture alt={t.heroImageAlt} />
            {/* Keeps the headline legible whatever the light does: a plain pine scrim on the text side, the one gradient this page allows. */}
            <span
              aria-hidden
              className="absolute inset-0 hidden bg-[linear-gradient(to_right,var(--color-pine-deep)_0%,color-mix(in_srgb,var(--color-pine-deep)_72%,transparent)_34%,transparent_58%)] lg:block lg:rtl:-scale-x-100"
            />
          </div>

          <div className={`${frameClassName} relative py-6 sm:py-10 lg:py-20`}>
            <div className="flex max-w-[34rem] flex-col items-start gap-5 sm:gap-6 lg:max-w-[min(50%,42rem)] lg:gap-8">
              <h1
                id="hero-title"
                className="home-hero-title text-display text-paper motion-safe:animate-rise"
              >
                {t.heroHeadline}
              </h1>
              <p className="max-w-[36ch] text-lead text-paper/90 motion-safe:animate-rise motion-safe:[animation-delay:90ms]">
                {t.heroSentence}
              </p>
              <div className="flex w-full flex-col gap-4 motion-safe:animate-rise motion-safe:[animation-delay:180ms] sm:gap-5">
                <ReportActions t={t} label={t.actionsLabel} />
                <p className="flex flex-wrap items-center gap-x-2 text-small text-paper/80">
                  <span>{t.trackPrompt}</span>
                  <Link href="/report/track" className={`${textLinkOnDarkClassName} text-small`}>
                    {t.trackLink}
                    <ArrowEndIcon className="size-4" />
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What happens after a report: three scenes along one counter. */}
        <section aria-labelledby="after-title" className="overflow-hidden bg-background text-foreground">
          <div
            className={`${frameClassName} grid gap-3 pt-20 sm:pt-28 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-end lg:gap-12 lg:pt-32`}
          >
            <h2 id="after-title" className="text-title text-foreground">
              {t.afterTitle}
            </h2>
            <p className="max-w-[40ch] text-lead text-foreground/85 lg:pb-2">{t.afterIntro}</p>
          </div>

          <div className="relative mt-4 sm:mt-6 lg:mt-8">
            {/* The counter: one field of deeper paper the three scenes stand on, bleeding to both edges. */}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 top-0 bg-secondary sm:top-10 lg:top-[4.5rem]"
            />
            <ol
              className={`${frameClassName} relative grid gap-12 pb-16 pt-6 sm:grid-cols-3 sm:gap-6 sm:pb-20 sm:pt-0 lg:gap-10 lg:pb-24`}
            >
              {SCENES.map((scene, index) => {
                const copy = t.scenes[index];
                return (
                  <li
                    key={scene.src}
                    className="home-scene flex min-w-0 flex-col items-center gap-5 sm:items-stretch"
                  >
                    <Image
                      src={scene.src}
                      alt={copy.alt}
                      width={1200}
                      height={900}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 31vw, 86vw"
                      className="-mt-[10%] h-auto w-full max-w-[22rem] sm:max-w-none"
                    />
                    <div className="flex max-w-[34ch] flex-col gap-2 text-center sm:text-start">
                      <h3 className="text-subheading text-foreground">{copy.title}</h3>
                      <p className="text-body text-foreground/85">{copy.caption}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* The promise, and the way back to the two actions. */}
        <section aria-labelledby="promise-title" className="bg-pine text-paper">
          <div
            className={`${frameClassName} grid gap-12 py-20 sm:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20 lg:py-32`}
          >
            <div className="flex flex-col items-start gap-8">
              <h2 id="promise-title" className="text-title text-paper">
                {t.promiseTitle}
              </h2>
              <ul className="flex flex-col gap-5">
                {t.promises.map((promise, index) => {
                  const Icon = PROMISE_ICONS[index];
                  return (
                    <li key={promise.title} className="flex items-start gap-4">
                      <Icon className="mt-1 size-6 shrink-0 text-brass-light" />
                      <p className="min-w-0 text-body text-paper/90">
                        <strong className="block text-subheading font-semibold text-paper">
                          {promise.title}
                        </strong>
                        {promise.body}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex flex-col justify-end gap-6 lg:items-end lg:text-end">
              <p className="max-w-[16ch] text-title text-paper">{t.closeLine}</p>
              <ReportActions t={t} label={t.actionsLabel} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
