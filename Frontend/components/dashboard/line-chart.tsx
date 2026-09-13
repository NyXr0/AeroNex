"use client";

// Minimal hand-rolled SVG line chart - no charting library is installed
// (see coverage-matrix.tsx's note: this sandbox has no npm-install network
// access, and a single polyline doesn't need Recharts/Plotly anyway).
// Used by both Price Trend and CPI Analysis so the scaling/path math lives
// in one place instead of being copy-pasted per page.

type Point = { date: string; value: number };

const WIDTH = 600;
const HEIGHT = 200;
const PAD = 24;

export function LineChart({
  series,
  referenceValue,
  referenceLabel,
}: {
  series: Point[];
  /** Optional flat reference line (e.g. the MoSPI CPI figure) drawn behind the series. */
  referenceValue?: number;
  referenceLabel?: string;
}) {
  if (series.length < 2) {
    return (
      <p className="py-8 text-center text-caption text-muted-foreground">
        Not enough history yet to draw a trend line.
      </p>
    );
  }

  const values = series.map((p) => p.value);
  const allValues = referenceValue !== undefined ? [...values, referenceValue] : values;
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const x = (i: number) => PAD + (i / (series.length - 1)) * (WIDTH - PAD * 2);
  const y = (v: number) => HEIGHT - PAD - ((v - min) / range) * (HEIGHT - PAD * 2);

  const path = series.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");
  const last = series[series.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[200px] w-full" preserveAspectRatio="none">
        {referenceValue !== undefined && (
          <>
            <line
              x1={PAD}
              x2={WIDTH - PAD}
              y1={y(referenceValue)}
              y2={y(referenceValue)}
              stroke="hsl(var(--color-muted-foreground))"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            <text x={WIDTH - PAD} y={y(referenceValue) - 6} textAnchor="end" className="fill-muted-foreground text-[10px]">
              {referenceLabel ?? "reference"}
            </text>
          </>
        )}
        <path d={path} fill="none" stroke="hsl(var(--color-accent))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(series.length - 1)} cy={y(last.value)} r="3.5" className="fill-accent" />
      </svg>
      <div className="mt-1 flex justify-between text-caption text-muted-foreground">
        <span>{series[0].date}</span>
        <span>{last.date}</span>
      </div>
    </div>
  );
}
