"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { loadSidebarWidth, saveSidebarWidth } from "@/lib/persist";
import { HudSurfaceProvider } from "../core/HudSurface";
import type { GlassSection } from "./GlassSidebar";

// Share of the window height: default, smallest and largest sheet.
const DEFAULT_SHARE = 0.45;
const MIN_HEIGHT = 140;
const MAX_SHARE = 0.8;
// Matches the parent's gap-2: a hidden sheet also gives back its gap.
const GAP = 8;

const defaultHeight = () => Math.round(window.innerHeight * DEFAULT_SHARE);
const clampHeight = (h: number) =>
  Math.round(Math.min(Math.max(h, MIN_HEIGHT), window.innerHeight * MAX_SHARE));

/**
 * Mobile counterpart of GlassSidebar: one frosted sheet under the viewer that
 * stacks every panel. Drag the pill on its top edge to resize (double-click
 * resets); `open={false}` slides it away so the viewer takes the screen.
 */
export function GlassBottomSheet({
  sections,
  open = true,
}: {
  sections: GlassSection[];
  open?: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, s.defaultCollapsed ?? false]))
  );
  const [height, setHeight] = useState(320);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{ y0: number; h0: number; h: number } | null>(null);

  // localStorage and window are client-only: size before paint to avoid a jump.
  useLayoutEffect(() => {
    const saved = loadSidebarWidth("bottom");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeight(saved ? clampHeight(saved) : defaultHeight());
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, h0: height, h: height };
    setResizing(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.h = clampHeight(d.h0 - (e.clientY - d.y0));
    setHeight(d.h);
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setResizing(false);
    saveSidebarWidth("bottom", d.h);
  };

  const resetHeight = () => {
    const h = defaultHeight();
    setHeight(h);
    saveSidebarWidth("bottom", h);
  };

  return (
    <HudSurfaceProvider value="glass">
      <div
        className={cn(
          "relative shrink-0",
          resizing ? "select-none" : "transition-[height,margin,opacity] duration-300 ease-out",
          !open && "pointer-events-none overflow-hidden opacity-0"
        )}
        style={{ height: open ? height : 0, marginTop: open ? 0 : -GAP }}
        aria-hidden={!open}
        inert={!open}
      >
        <aside
          aria-label="Panels"
          className="glass-panel glass-scroll flex h-full flex-col gap-2 overflow-y-auto rounded-3xl p-2 pt-5"
        >
          {sections.map((s) => {
            const isCollapsed = collapsed[s.id] ?? false;
            return (
              <div
                key={s.id}
                className="shrink-0"
                style={s.height && !isCollapsed ? { height: s.height } : undefined}
              >
                {s.content(isCollapsed, () => setCollapsed((c) => ({ ...c, [s.id]: !c[s.id] })))}
              </div>
            );
          })}
        </aside>

        {/* Resize grip: an iPhone-style pill on the sheet's top edge. */}
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize panels"
          title="Drag to resize · double-click to reset"
          className="group absolute inset-x-0 top-0 z-10 flex h-5 cursor-row-resize touch-none items-center justify-center"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={resetHeight}
        >
          <div
            className={cn(
              "h-1 rounded-full transition-all duration-200",
              resizing
                ? "w-20 bg-white/70"
                : "w-12 bg-white/25 group-hover:w-16 group-hover:bg-white/50"
            )}
          />
        </div>
      </div>
    </HudSurfaceProvider>
  );
}
