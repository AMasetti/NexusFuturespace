"use client";

import { cn } from "@/lib/utils";

interface Annotation {
  x: number;
  y: number;
  label: string;
}

interface MicroscopyViewerProps {
  imageUrl?: string;
  magnification?: string;
  sectionId?: string;
  crosshair?: boolean;
  scaleBar?: boolean;
  annotations?: Annotation[];
}

export function MicroscopyViewer({
  imageUrl,
  magnification = "X_300:1",
  sectionId = "CROSS_SECTION_M1PU774",
  crosshair = true,
  scaleBar = true,
  annotations = [],
}: MicroscopyViewerProps) {
  return (
    <div className="relative w-full aspect-square bg-hud-surface border border-hud-border rounded-sm overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(var(--hud-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--hud-border) 1px, transparent 1px)
          `,
          backgroundSize: "8% 8%",
        }}
      />

      {/* Image or placeholder */}
      {imageUrl ? (
        <img src={imageUrl} alt="Microscopy view" className="absolute inset-0 w-full h-full object-cover mix-blend-screen" />
      ) : (
        /* Animated cell pattern */
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-3/4 h-3/4 opacity-30">
            {[
              [50, 50, 22], [25, 30, 13], [75, 28, 10], [20, 65, 11], [72, 68, 14], [50, 20, 8],
            ].map(([cx, cy, r], i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--hud-primary)" strokeWidth={0.6} />
                <circle cx={cx} cy={cy} r={r * 0.35} fill="var(--hud-primary)" fillOpacity={0.3} />
              </g>
            ))}
          </svg>
        </div>
      )}

      {/* Crosshair */}
      {crosshair && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-hud-primary/20" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-hud-primary/20" />
          <div className="absolute left-1/2 top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 border border-hud-primary/60 rounded-full" />
        </div>
      )}

      {/* Annotations */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {annotations.map((ann, i) => {
          const tx = ann.x + 12;
          const ty = ann.y - 10;
          return (
            <g key={i}>
              <circle cx={`${ann.x}%`} cy={`${ann.y}%`} r={3} fill="var(--hud-warning)" />
              <line
                x1={`${ann.x}%`} y1={`${ann.y}%`}
                x2={`${tx}%`} y2={`${ty}%`}
                stroke="var(--hud-warning)" strokeWidth={0.5}
              />
              <text
                x={`${tx}%`} y={`${ty - 2}%`}
                fill="var(--hud-warning)"
                fontSize="6"
                fontFamily="var(--font-mono)"
              >
                {ann.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Corner labels */}
      <div className="absolute top-2 left-2 font-mono text-[8px] text-hud-text-dim leading-tight">
        <div>{magnification}</div>
        <div className="text-hud-primary/60">{sectionId}</div>
      </div>

      {/* Scale bar */}
      {scaleBar && (
        <div className="absolute bottom-2 right-2 flex flex-col items-end gap-0.5">
          <div className="w-10 h-0.5 bg-hud-primary/70 relative">
            <div className="absolute left-0 top-0 w-px h-1.5 -mt-0.5 bg-hud-primary/70" />
            <div className="absolute right-0 top-0 w-px h-1.5 -mt-0.5 bg-hud-primary/70" />
          </div>
          <span className="font-mono text-[7px] text-hud-text-dim">10 μm</span>
        </div>
      )}
    </div>
  );
}
