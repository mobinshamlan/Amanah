"use client";

import { useState } from "react";
import type { DailySeries } from "@/utils/monitoring/snapshot";

// Daily stacked bars from stored timestamps. Identity never relies on colour
// alone: legend, a text summary, tooltips on hover or keyboard focus, and a
// table view carry every number.

export type BarCategory<K extends string> = {
  key: K;
  label: string;
  // Tailwind background class for the mark, e.g. "bg-forest".
  swatch: string;
};

function niceMax(value: number) {
  if (value <= 4) {
    return 4;
  }
  const step = 10 ** Math.floor(Math.log10(value));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    if (value <= factor * step) {
      return factor * step;
    }
  }
  return 10 * step;
}

export function DailyBars<K extends string>({
  title,
  series,
  categories,
  unit,
}: {
  title: string;
  series: DailySeries<K>;
  // Bottom of the stack first.
  categories: BarCategory<K>[];
  unit: [one: string, many: string];
}) {
  const [active, setActive] = useState<number | null>(null);
  // Headroom so the busiest day's label stays inside the plot.
  const max = niceMax(Math.max(...series.points.map((point) => point.total)) * 1.15);
  const busiest = series.points.reduce(
    (best, point, index) => (point.total > series.points[best].total ? index : best),
    0,
  );
  const latest = series.points.findLastIndex((point) => point.total > 0);
  const labelled = new Set([busiest, latest]);
  const count = (n: number) => `${n} ${n === 1 ? unit[0] : unit[1]}`;
  const describe = (index: number) => {
    const point = series.points[index];
    const parts = categories.map((category) => `${point.values[category.key]} ${category.label.toLowerCase()}`);
    return `${point.label}: ${count(point.total)}${point.total > 0 ? ` (${parts.join(", ")})` : ""}`;
  };
  const activePoints = series.points.filter((point) => point.total > 0);

  return (
    <div className="flex flex-col gap-3">
      {categories.length > 1 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground" aria-label={`${title} legend`}>
          {categories.map((category) => (
            <li key={category.key} className="flex items-center gap-2">
              <span aria-hidden className={`size-3 rounded-[3px] ${category.swatch}`} />
              {category.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div role="group" aria-label={`${title}, last ${series.points.length} days`} className="relative">
        <div className="grid grid-cols-[1.75rem_1fr] gap-2">
          {/* Value axis: three recessive steps. */}
          <div aria-hidden className="relative h-40 text-right text-xs tabular-nums text-muted-foreground sm:h-48">
            {[max, max / 2, 0].map((value, index) => (
              <span
                key={value}
                className="absolute right-0 -translate-y-1/2"
                style={{ top: `${index * 50}%` }}
              >
                {Number.isInteger(value) ? value : value.toFixed(1)}
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
              {series.points.map((point, index) => (
                <li
                  key={point.key}
                  tabIndex={0}
                  aria-label={describe(index)}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  className={`group relative flex h-full flex-1 cursor-default flex-col justify-end rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${
                    active === index ? "bg-muted/70" : ""
                  }`}
                >
                  {point.total > 0 && labelled.has(index) ? (
                    <span
                      aria-hidden
                      className="mb-1 text-center text-xs font-semibold tabular-nums text-foreground"
                    >
                      {point.total}
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
                className="pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-56 -translate-x-1/2 rounded-xl bg-primary px-3 py-2 text-[0.8125rem] leading-relaxed text-primary-foreground shadow-float"
                style={{
                  left: `${((active + 0.5) / series.points.length) * 100}%`,
                }}
              >
                <p className="font-semibold">
                  {series.points[active].label} · {count(series.points[active].total)}
                </p>
                {series.points[active].total > 0
                  ? categories.map((category) => (
                      <p key={category.key} className="flex items-center gap-1.5">
                        <span aria-hidden className={`size-2 rounded-[2px] ${category.swatch}`} />
                        {category.label}: {series.points[active].values[category.key]}
                      </p>
                    ))
                  : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Day ticks: every day from sm up; on phones every other day, counted back from today. */}
        <ol aria-hidden className="ml-9 mt-1.5 flex gap-[3px] text-center text-[0.7rem] tabular-nums text-muted-foreground sm:gap-1.5 sm:text-xs">
          {series.points.map((point, index) => (
            <li
              key={point.key}
              className={`flex-1 ${(series.points.length - 1 - index) % 2 === 1 ? "invisible sm:visible" : ""}`}
            >
              {point.short}
            </li>
          ))}
        </ol>
        <p aria-hidden className="ml-9 mt-0.5 flex justify-between text-xs text-muted-foreground">
          <span>{series.points[0].label}</span>
          <span>{series.points[series.points.length - 1].label}</span>
        </p>
      </div>

      <details className="group/table">
        <summary className="-ml-2 inline-flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-foreground outline-none transition-colors hover:text-forest focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
          <span className="group-open/table:hidden">Show as table</span>
          <span className="hidden group-open/table:inline">Hide table</span>
        </summary>
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">{title}, days with activity</caption>
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="py-1.5 pr-3 font-medium">Day</th>
              {categories.map((category) => (
                <th key={category.key} scope="col" className="py-1.5 pr-3 text-right font-medium">
                  {category.label}
                </th>
              ))}
              <th scope="col" className="py-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {activePoints.map((point) => (
              <tr key={point.key} className="border-b border-border last:border-b-0">
                <td className="py-1.5 pr-3 text-foreground">{point.label}</td>
                {categories.map((category) => (
                  <td key={category.key} className="py-1.5 pr-3 text-right tabular-nums text-foreground">
                    {point.values[category.key]}
                  </td>
                ))}
                <td className="py-1.5 text-right font-medium tabular-nums text-foreground">{point.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Every other day in the last {series.points.length} days had none.
        </p>
      </details>
    </div>
  );
}
