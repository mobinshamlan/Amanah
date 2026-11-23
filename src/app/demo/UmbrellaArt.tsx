/*
  The demo's one picture: the lost blue folding umbrella, drawn flat in the
  desk's own language (one fill, one stroke, square geometry). Its two colours
  belong to the story, not the palette: blue is what the owner reported, and
  the yellow handle is the clue only the found report mentions. The handle is
  a blank dashed hook until staff verify the colour; then it fills in yellow.
*/

export type Handle = "unknown" | "yellow";

const BLUE = "#3b6aa0";
const BLUE_DEEP = "#2a4f7c";
const YELLOW = "#e4b43c";

export function UmbrellaArt({
  handle = "unknown",
  className = "",
  title,
}: {
  handle?: Handle;
  className?: string;
  // Pass a title when the picture carries meaning on its own; otherwise it is decorative.
  title?: string;
}) {
  const known = handle === "yellow";
  return (
    <svg
      viewBox="0 0 160 160"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      data-handle={handle}
    >
      {/* Canopy: a dome with four scallops along its edge. */}
      <path
        d="M18 92A62 62 0 0 1 142 92q-15.5-12-31 0q-15.5-12-31 0q-15.5-12-31 0q-15.5-12-31 0Z"
        fill={BLUE}
      />
      <path
        d="M80 30 49 92M80 30v62M80 30l31 62"
        stroke={BLUE_DEEP}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      <path d="M80 30V19" stroke={BLUE_DEEP} strokeWidth="4" strokeLinecap="round" />

      {/* Shaft and the white strap that both reports mention. */}
      <path d="M80 92v42" stroke="var(--color-pine-deep)" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M80 100c10 3 11 12 5 19"
        stroke="var(--color-border)"
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M80 100c10 3 11 12 5 19"
        stroke="var(--color-card)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* The handle: dashed and blank until verified, then drawn in yellow. */}
      <path
        className="demo-handle-blank"
        d="M80 134v4a12 12 0 0 1-24 0v-5"
        stroke="var(--color-border)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray="0.5 11"
        fill="none"
      />
      <path
        className="demo-handle-fill"
        d="M80 134v4a12 12 0 0 1-24 0v-5"
        pathLength={100}
        stroke={YELLOW}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />

      {/* The badge on the handle: a question until staff verify, then a check. */}
      <g className="demo-handle-badge">
        <circle
          cx="52"
          cy="146"
          r="12"
          fill={known ? "var(--color-forest)" : "var(--color-brass)"}
          stroke="var(--color-card)"
          strokeWidth="3"
        />
        {known ? (
          <path
            d="m46.5 146.5 3.6 3.5 7.4-7.6"
            stroke="var(--color-paper)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : (
          <g stroke="var(--color-paper)" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M48.4 142.6a3.7 3.7 0 1 1 5 3.5c-1 .4-1.4 1-1.4 2.1" />
            <path d="M52 152h.01" strokeWidth="3.2" />
          </g>
        )}
      </g>
    </svg>
  );
}

/** The umbrella as a line icon on the icons' 24-unit grid, for the homepage entry and the phone strip. */
export function UmbrellaGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12.5a9 9 0 0 1 18 0q-1.5-1.6-3 0q-1.5-1.6-3 0q-1.5-1.6-3 0q-1.5-1.6-3 0q-1.5-1.6-3 0q-1.5-1.6-3 0Z" />
      <path d="M12 3.5v-1M12 12.5v6a2 2 0 0 1-4 0v-.5" />
    </svg>
  );
}
