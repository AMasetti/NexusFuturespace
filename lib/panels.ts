// ─── Panel canvas types & constants ───────────────────────────────────────────

export type PanelId =
  | "joint-status"
  | "power-systems"
  | "nav-overlay"
  | "motor-telemetry"
  | "system-metrics"
  | "mission-status"
  | "servo-control";

export type ResizeEdge = "right" | "bottom" | "corner";

export interface PanelRect {
  id: PanelId;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}

export interface Interaction {
  id: PanelId;
  kind: "drag" | "resize";
  edge?: ResizeEdge;
  mx0: number;
  my0: number;
  px0: number;
  py0: number;
  pw0: number;
  ph0: number;
}

// GRID matches the body background grid (40 px) so every snap position lands on a dot.
export const GRID = 40;
export const MIN_W = 200; // 5 cells
export const MIN_H = 120; // 3 cells

// All positions and dimensions are multiples of GRID.
// Gap between panels = 1 cell (40 px).
export const INITIAL_PANELS: PanelRect[] = [
  { id: "joint-status", x: 0, y: 0, w: 240, h: 400, z: 1 },
  { id: "power-systems", x: 0, y: 440, w: 240, h: 240, z: 1 },
  { id: "nav-overlay", x: 760, y: 0, w: 280, h: 360, z: 1 },
  { id: "motor-telemetry", x: 280, y: 520, w: 440, h: 160, z: 1 },
  { id: "system-metrics", x: 760, y: 400, w: 280, h: 280, z: 1 },
  { id: "mission-status", x: 280, y: 0, w: 440, h: 120, z: 1 },
  { id: "servo-control", x: 1080, y: 0, w: 280, h: 800, z: 1 },
];

// Snap v (canvas-space) so that canvas_origin + v is a multiple of GRID.
// originMod = canvasOrigin % GRID (the misalignment we must correct).
export function snapAligned(v: number, originMod: number): number {
  return Math.round((v + originMod) / GRID) * GRID - originMod;
}
