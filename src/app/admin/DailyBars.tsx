"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { focusRingClassName } from "@/components/ui";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatNumber } from "@/i18n/format";

// Daily stacked bars from stored timestamps. Time flows from the start of the
// line to the end, so it reads right-to-left on Arabic pages like every other
// timeline in Amanah. Identity never relies on colour alone: a legend, a text
// summary, tooltips on hover or keyboard focus, and a table view carry every
// number. All words arrive from the server in the visitor's language.

export type BarCategory<K extends string> = {
  key: K;
  label: string;
  // Tailwind background class for the mark, e.g. "bg-forest".
  swatch: string;
};

export type BarPoint<K extends string> = {
  key: string;
  // "24 Oct" and the day of the month, already in the visitor's language.
  label: string;
  short: string;
  values: Record<K, number>;
  total: number;
  // "3 reports", and the full spoken description of the day.
  countText: string;
  description: string;
};

export type BarLabels = {
  legend: string;
  group: string;
  showTable: string;
  hideTable: string;
  tableCaption: string;
  day: string;
  total: string;
  otherDaysNone: string;
  // "Oldest" and "Newest" under the axis ends, so the direction of time is named.
  oldest: string;
  newest: string;
};

function niceMax(value: number) {
  if (value <= 4) {
    return 4;
  }
  // Even tops only, so the middle tick is a whole count (no "12.5 reports").
  const step = 10 ** Math.floor(Math.log10(value));
  for (const factor of [1, 2, 3, 4, 5, 6, 8, 10]) {
    const top = factor * step;
    if (value <= top && top % 2 === 0) {
      return top;
    }
  }
  return 10 * step;
}

export function DailyBars<K extends string>({
  points,
  categories,
  labels,
}: {
  points: BarPoint<K>[];
  // Bottom of the stack first.
  categories: BarCategory<K>[];
  labels: BarLabels;
}) {
  const { locale } = useLocale();
  const [active, setActive] = useState<number | null>(null);
  // Headroom so the busiest day's label stays inside the plot.
  const max = niceMax(Math.max(...points.map((point) => point.total)) * 1.15);
  const busiest = points.reduce(
    (best, point, index) => (point.total > points[best].total ? index : best),
    0,
  );
  const latest = points.findLastIndex((point) => point.total > 0);
  const labelled = new Set([busiest, latest]);
  const activePoints = points.filter((point) => point.total > 0);
  const n = (value: number) => formatNumber(value, locale);

  return (
    <div className="flex flex-col gap-3">
      {categories.length > 1 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-small text-foreground" aria-label={labels.legend}>
          {categories.map((category) => (
            <li key={category.key} className="flex items-center gap-2">
              <span aria-hidden className={`size-3 rounded-[3px] ${category.swatch}`} />
              {category.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div role="group" aria-label={labels.group} className="relative">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2">
          {/* Value axis: three recessive steps at the start of the line. */}
          <div aria-hidden className="relative h-40 text-end text-caption tabular-nums text-muted-foreground sm:h-48">
            {[max, max / 2, 0].map((value, index) => (
              <span
                key={value}
                className="absolute end-0 -translate-y-1/2"
                style={{ top: `${index * 50}%` }}
              >
                {Number.isInteger(value) ? n(value) : value.toFixed(1)}
              </span>
            ))}
          </div>

          <div className="relative h-40 sm:h-48">
            {[0, 50].map((top) => (
              <span
                key={top}
                aria-hidden
                className="absolute inset-x-0 border-t border-dashed border-border"
                style={{ top: `${top}%` }}
              />
            ))}
            <span aria-hidden className="absolute inset-x-0 bottom-0 border-t border-foreground/25" />

            <ol className="absolute inset-0 flex items-end gap-[3px] sm:gap-1.5">
              {points.map((point, index) => (
                <li
                  key={point.key}
                  tabIndex={0}
                  aria-label={point.description}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  className={`group relative flex h-full flex-1 cursor-default flex-col justify-end rounded-sm ${focusRingClassName} ${
                    active === index ? "bg-muted/70" : ""
                  }`}
                >
                  {point.total > 0 && labelled.has(index) ? (
                    <span aria-hidden className="mb-1 text-center text-caption font-semibold tabular-nums text-foreground">
                      {n(point.total)}
                    </span>
                  ) : null}
                  <span
                    aria-hidden
                    className="mx-auto flex w-full max-w-7 flex-col-reverse gap-[2px]"
                    style={{ height: `${(point.total / max) * 100}%` }}
                  >
                    {categories.map((category, categoryIndex) => {
                      const value = point.values[category.key];
                      if (value === 0) {
                        return null;
                      }
                      const top = categories
                        .slice(categoryIndex + 1)
                        .every((next) => point.values[next.key] === 0);
                      return (
                        <span
                          key={category.key}
                          className={`block min-h-[3px] ${category.swatch} ${top ? "rounded-t-[4px]" : ""}`}
                          style={{ flexGrow: value, flexBasis: 0 }}
                        />
                      );
                    })}
                  </span>
                </li>
              ))}
            </ol>

            {active !== null ? (
              <div
                role="presentation"
                className="pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-56 -translate-x-1/2 rounded-xl bg-primary px-3 py-2 text-caption leading-relaxed text-primary-foreground shadow-float rtl:translate-x-1/2"
                style={{ insetInlineStart: `${((active + 0.5) / points.length) * 100}%` }}
              >
                <p className="font-semibold">
                  {points[active].label} · {points[active].countText}
                </p>
                {points[active].total > 0
                  ? categories.map((category) => (
                      <p key={category.key} className="flex items-center gap-1.5">
                        <span aria-hidden className={`size-2 rounded-[2px] ${category.swatch}`} />
                        {category.label}: <span className="tabular-nums">{n(points[active].values[category.key])}</span>
                      </p>
                    ))
                  : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Day ticks: every day from sm up; on phones every other day, counted back from today. */}
        <ol aria-hidden className="ms-10 mt-1.5 flex gap-[3px] text-center text-caption tabular-nums text-muted-foreground sm:gap-1.5">
          {points.map((point, index) => (
            <li
              key={point.key}
              className={`flex-1 ${(points.length - 1 - index) % 2 === 1 ? "invisible sm:visible" : ""}`}
            >
              {point.short}
            </li>
          ))}
        </ol>
        <p aria-hidden className="ms-10 mt-0.5 flex justify-between text-caption text-muted-foreground">
          <span>
            {labels.oldest} · {points[0].label}
          </span>
          <span>
            {labels.newest} · {points[points.length - 1].label}
          </span>
        </p>
      </div>

      <details className="group/table">
        <summary
          className={`-ms-2 inline-flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-full px-2 text-small font-semibold text-foreground [&::-webkit-details-marker]:hidden ${focusRingClassName}`}
        >
          <span className="group-open/table:hidden">{labels.showTable}</span>
          <span className="hidden group-open/table:inline">{labels.hideTable}</span>
          <ChevronDownIcon className="size-4 transition-transform group-open/table:rotate-180" />
        </summary>
        <table className="mt-2 w-full text-start text-small">
          <caption className="sr-only">{labels.tableCaption}</caption>
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="py-1.5 pe-3 text-start font-medium">{labels.day}</th>
              {categories.map((category) => (
                <th key={category.key} scope="col" className="py-1.5 pe-3 text-end font-medium">
                  {category.label}
                </th>
              ))}
              <th scope="col" className="py-1.5 text-end font-medium">{labels.total}</th>
            </tr>
          </thead>
          <tbody>
            {activePoints.map((point) => (
              <tr key={point.key} className="border-b border-border last:border-b-0">
                <td className="py-1.5 pe-3 text-foreground">{point.label}</td>
                {categories.map((category) => (
                  <td key={category.key} className="py-1.5 pe-3 text-end tabular-nums text-foreground">
                    {n(point.values[category.key])}
                  </td>
                ))}
                <td className="py-1.5 text-end font-medium tabular-nums text-foreground">{n(point.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1.5 text-small text-muted-foreground">{labels.otherDaysNone}</p>
      </details>
    </div>
  );
}
