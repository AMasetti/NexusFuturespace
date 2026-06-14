"use client";

import { GripVertical } from "lucide-react";
import { type PanelId, type PanelRect, type ResizeEdge } from "@/lib/panels";

interface FloatingPanelProps {
  panel: PanelRect;
  onDragStart: (e: React.PointerEvent, id: PanelId) => void;
  onResizeStart: (e: React.PointerEvent, id: PanelId, edge: ResizeEdge) => void;
  onFocus: (id: PanelId) => void;
  children: React.ReactNode;
}

export function FloatingPanel({
  panel,
  onDragStart,
  onResizeStart,
  onFocus,
  children,
}: FloatingPanelProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: panel.x,
        top: panel.y,
        width: panel.w,
        height: panel.h,
        zIndex: panel.z,
      }}
      onPointerDown={() => onFocus(panel.id)}
    >
      {/* content */}
      <div className="h-full w-full">{children}</div>

      {/* drag handle */}
      <div
        className="text-hud-border hover:text-hud-primary absolute top-1.5 right-6 z-30 cursor-grab rounded p-1 transition-colors active:cursor-grabbing"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onDragStart(e, panel.id);
        }}
      >
        <GripVertical className="h-3 w-3" />
      </div>

      {/* right edge */}
      <div
        className="group/r absolute top-2 right-0 bottom-2 z-20 w-2 cursor-ew-resize"
        onPointerDown={(e) => {
          e.stopPropagation();
          onResizeStart(e, panel.id, "right");
        }}
      >
        <div className="bg-hud-border/30 group-hover/r:bg-hud-primary/50 absolute inset-y-0 right-0 w-px transition-colors" />
      </div>

      {/* bottom edge */}
      <div
        className="group/b absolute right-2 bottom-0 left-2 z-20 h-2 cursor-ns-resize"
        onPointerDown={(e) => {
          e.stopPropagation();
          onResizeStart(e, panel.id, "bottom");
        }}
      >
        <div className="bg-hud-border/30 group-hover/b:bg-hud-primary/50 absolute inset-x-0 bottom-0 h-px transition-colors" />
      </div>

      {/* corner handle */}
      <div
        className="group/c absolute right-0 bottom-0 z-30 h-4 w-4 cursor-nwse-resize"
        onPointerDown={(e) => {
          e.stopPropagation();
          onResizeStart(e, panel.id, "corner");
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" className="absolute right-0.5 bottom-0.5">
          <line
            x1="6"
            y1="13"
            x2="13"
            y2="13"
            stroke="var(--hud-border)"
            strokeWidth="1.5"
            className="transition-colors group-hover/c:stroke-[var(--hud-primary)]"
          />
          <line
            x1="13"
            y1="6"
            x2="13"
            y2="13"
            stroke="var(--hud-border)"
            strokeWidth="1.5"
            className="transition-colors group-hover/c:stroke-[var(--hud-primary)]"
          />
        </svg>
      </div>
    </div>
  );
}
