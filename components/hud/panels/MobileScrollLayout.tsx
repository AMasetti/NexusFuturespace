"use client";

import React, { useState, useRef } from "react";
import { HudStatusDot } from "../core/HudStatusDot";
import { HudBadge } from "../core/HudBadge";
import { useRosStatus } from "@/lib/ros";
import { ScrollLockProvider } from "@/lib/scroll-lock";

interface MobilePanel {
  id: string;
  /** Render prop — receives collapse state and toggle callback to wire into HudPanel. */
  content: (collapsed: boolean, onToggle: () => void) => React.ReactNode;
  defaultCollapsed?: boolean;
}

interface MobileScrollLayoutProps {
  viewer: React.ReactNode;
  panels: MobilePanel[];
}

export function MobileScrollLayout({ viewer, panels }: MobileScrollLayoutProps) {
  const rosStatus = useRosStatus();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialise collapsed set from panels with defaultCollapsed: true
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(panels.filter((p) => p.defaultCollapsed).map((p) => p.id))
  );

  const toggle = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const rosLabel =
    rosStatus === "connected" ? "LIVE" : rosStatus === "connecting" ? "CONN…" : "OFFLINE";
  const rosDotColor =
    rosStatus === "connected"
      ? "var(--hud-secondary)"
      : rosStatus === "connecting"
        ? "var(--hud-warning)"
        : "rgba(0,200,255,0.25)";

  return (
    <div
      className="flex h-dvh flex-col"
      style={{ background: "var(--hud-bg)", overflow: "hidden" }}
    >
      {/* ── Compact fixed header ──────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid rgba(13,74,107,0.6)", background: "var(--hud-bg)" }}
      >
        <div className="flex items-center gap-2">
          <HudStatusDot status="online" size="sm" pulse />
          <span
            className="font-display font-bold tracking-widest uppercase"
            style={{ fontSize: 14, color: "var(--hud-primary)" }}
          >
            NEXUS
          </span>
          <HudBadge variant="info" label="PROTO-02" size="sm" />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, color: "rgba(0,200,255,0.45)", letterSpacing: "0.12em" }}
          >
            {rosLabel}
          </span>
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: rosDotColor }} />
        </div>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <ScrollLockProvider scrollRef={scrollRef}>
        <div
          ref={scrollRef}
          className="flex flex-1 flex-col gap-3 overflow-y-auto p-3"
          style={{ minHeight: 0 }}
        >
          {/* 3D viewer — fixed height, never collapses */}
          <div className="w-full shrink-0 overflow-hidden rounded" style={{ height: "50vh" }}>
            {viewer}
          </div>

          {/* Panel cards with collapse support */}
          {panels.map((panel) => {
            const isCollapsed = collapsedIds.has(panel.id);
            return <div key={panel.id}>{panel.content(isCollapsed, () => toggle(panel.id))}</div>;
          })}
        </div>
      </ScrollLockProvider>
    </div>
  );
}
