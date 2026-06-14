"use client";

import { useState } from "react";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface ColorWheelProps {
  segments?: Segment[];
  size?: number;
  innerLabel?: string;
  animated?: boolean;
  rotatable?: boolean;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const DEFAULT_SEGMENTS: Segment[] = [
  { label: "Navigation", value: 30, color: "var(--hud-primary)" },
  { label: "Power", value: 25, color: "var(--hud-secondary)" },
  { label: "Comms", value: 20, color: "var(--hud-warning)" },
  { label: "Sensors", value: 15, color: "var(--hud-danger)" },
  { label: "Life Sup.", value: 10, color: "var(--hud-text)" },
];

export function ColorWheel({
  segments = DEFAULT_SEGMENTS,
  size = 180,
  innerLabel = "SYSTEM",
}: ColorWheelProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const cx = size / 2;
  const outerR = cx - 10;
  const innerR = outerR * 0.55;
  const total = segments.reduce((a, b) => a + b.value, 0);
  const gap = 2;

  const arcs = segments.reduce<
    Array<(typeof segments)[0] & { start: number; end: number; i: number }>
  >((acc, seg, i) => {
    const prevAngle = i === 0 ? 0 : acc[i - 1].end + gap / 2;
    const sweep = (seg.value / total) * 360 - gap;
    const start = prevAngle;
    const end = prevAngle + sweep;
    return [...acc, { ...seg, start, end, i }];
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="overflow-visible">
        {arcs.map(({ color, start, end, i }) => {
          const isHovered = hovered === i;

          return (
            <path
              key={i}
              d={`M ${polarToCartesian(cx, cx, outerR + (isHovered ? 6 : 0), end).x} ${polarToCartesian(cx, cx, outerR + (isHovered ? 6 : 0), end).y}
                  A ${outerR + (isHovered ? 6 : 0)} ${outerR + (isHovered ? 6 : 0)} 0 ${end - start > 180 ? 1 : 0} 0
                  ${polarToCartesian(cx, cx, outerR + (isHovered ? 6 : 0), start).x} ${polarToCartesian(cx, cx, outerR + (isHovered ? 6 : 0), start).y}
                  L ${polarToCartesian(cx, cx, innerR, start).x} ${polarToCartesian(cx, cx, innerR, start).y}
                  A ${innerR} ${innerR} 0 ${end - start > 180 ? 1 : 0} 1
                  ${polarToCartesian(cx, cx, innerR, end).x} ${polarToCartesian(cx, cx, innerR, end).y} Z`}
              fill={color}
              fillOpacity={isHovered ? 0.95 : 0.65}
              stroke="var(--hud-bg)"
              strokeWidth={1}
              style={{
                filter: isHovered ? `drop-shadow(0 0 6px ${color})` : "none",
                transition: "all 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        {/* Tick marks on outer ring */}
        {Array.from({ length: 36 }, (_, i) => {
          const a = i * 10 - 90;
          const rad = (a * Math.PI) / 180;
          const r1 = outerR + 4;
          const r2 = outerR + 8;
          return (
            <line
              key={i}
              x1={parseFloat((cx + r1 * Math.cos(rad)).toFixed(4))}
              y1={parseFloat((cx + r1 * Math.sin(rad)).toFixed(4))}
              x2={parseFloat((cx + r2 * Math.cos(rad)).toFixed(4))}
              y2={parseFloat((cx + r2 * Math.sin(rad)).toFixed(4))}
              stroke="var(--hud-border)"
              strokeWidth={1}
            />
          );
        })}

        {/* Inner label */}
        <text
          x={cx}
          y={cx + 4}
          textAnchor="middle"
          fill="var(--hud-text)"
          fontSize={12}
          fontFamily="var(--font-mono)"
          letterSpacing="0.1em"
        >
          {hovered !== null ? segments[hovered].label.toUpperCase() : innerLabel}
        </text>
        {hovered !== null && (
          <text
            x={cx}
            y={cx + 18}
            textAnchor="middle"
            fill="var(--hud-text-dim)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {segments[hovered].value}%
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
            <span className="font-label text-hud-text-dim text-[9px] tracking-wide uppercase">
              {seg.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
