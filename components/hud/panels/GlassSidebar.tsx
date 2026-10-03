"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { HudSurfaceProvider } from "../core/HudSurface";

export interface GlassSection {
  id: string;
  defaultCollapsed?: boolean;
  /** Fixed body height for content that fills its parent (maps, charts). */
  height?: number;
  content: (collapsed: boolean, onToggle: () => void) => React.ReactNode;
}

/**
 * Frosted, rounded sidebar that stacks collapsible panels. Panels inside render
 * on the "glass" surface, so regular HudPanels become translucent cards.
 */
export function GlassSidebar({
  sections,
  className,
}: {
  sections: GlassSection[];
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, s.defaultCollapsed ?? false]))
  );

  return (
    <HudSurfaceProvider value="glass">
      <aside
        className={cn(
          "glass-panel glass-scroll flex w-80 shrink-0 flex-col gap-2 overflow-y-auto rounded-3xl p-2",
          className
        )}
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
    </HudSurfaceProvider>
  );
}
