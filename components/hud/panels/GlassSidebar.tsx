"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { loadSidebarWidth, saveSidebarWidth } from "@/lib/persist";
import { HudSurfaceProvider } from "../core/HudSurface";

export interface GlassSection {
  id: string;
  defaultCollapsed?: boolean;
  /** Fixed body height for content that fills its parent (maps, charts). */
  height?: number;
  content: (collapsed: boolean, onToggle: () => void) => React.ReactNode;
}

const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 240;
// Never let one sidebar take more than this share of the window.
const MAX_SHARE = 0.45;
// Matches the parent's gap-3: a hidden sidebar also gives back its gap.
const GAP = 12;

const clampWidth = (w: number) =>
  Math.round(Math.min(Math.max(w, MIN_WIDTH), window.innerWidth * MAX_SHARE));

/**
 * Frosted, rounded sidebar that stacks collapsible panels. Panels inside render
 * on the "glass" surface, so regular HudPanels become translucent cards.
 * A pill-shaped grip on the inner edge resizes it (double-click resets);
 * `open={false}` slides it away so the viewer takes the space.
 */
export function GlassSidebar({
  side,
  sections,
  open = true,
  className,
}: {
  side: "left" | "right";
  sections: GlassSection[];
  open?: boolean;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, s.defaultCollapsed ?? false]))
  );
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{ x0: number; w0: number; w: number } | null>(null);

  // localStorage is client-only: restore before paint to avoid a width jump.
  useLayoutEffect(() => {
    const saved = loadSidebarWidth(side);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setWidth(clampWidth(saved));
  }, [side]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x0: e.clientX, w0: width, w: width };
    setResizing(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x0) * (side === "left" ? 1 : -1);
    d.w = clampWidth(d.w0 + dx);
    setWidth(d.w);
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setResizing(false);
    saveSidebarWidth(side, d.w);
  };

  const resetWidth = () => {
    setWidth(DEFAULT_WIDTH);
    saveSidebarWidth(side, DEFAULT_WIDTH);
  };

  return (
    <HudSurfaceProvider value="glass">
      <div
        className={cn(
          "relative shrink-0",
          resizing ? "select-none" : "transition-[width,margin,opacity] duration-300 ease-out",
          !open && "pointer-events-none opacity-0"
        )}
        style={{
          width: open ? width : 0,
          [side === "left" ? "marginRight" : "marginLeft"]: open ? 0 : -GAP,
        }}
        aria-hidden={!open}
        inert={!open}
      >
        <div className={cn("h-full overflow-hidden", side === "right" && "flex justify-end")}>
          {/* Fixed width so panels don't reflow while the sidebar slides closed. */}
          <aside
            className={cn(
              "glass-panel glass-scroll flex h-full shrink-0 flex-col gap-2 overflow-y-auto rounded-3xl p-2",
              className
            )}
            style={{ width }}
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
        </div>

        {/* Resize grip: an iPhone-style pill centred in the gap beside the sidebar. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${side} sidebar`}
          title="Drag to resize · double-click to reset"
          className={cn(
            "group absolute top-0 z-10 flex h-full w-3 cursor-col-resize touch-none items-center justify-center",
            side === "left" ? "-right-3" : "-left-3"
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={resetWidth}
        >
          <div
            className={cn(
              "w-1 rounded-full transition-all duration-200",
              resizing
                ? "h-20 bg-white/70"
                : "h-12 bg-white/25 group-hover:h-16 group-hover:bg-white/50"
            )}
          />
        </div>
      </div>
    </HudSurfaceProvider>
  );
}
