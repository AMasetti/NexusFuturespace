// ─── localStorage persistence helpers ────────────────────────────────────────

import type { PanelRect, PanelId } from "./panels";
import type { JointAngles } from "@/components/hud/panels/ServoSliders";

export interface CameraState {
  px: number;
  py: number;
  pz: number; // camera position
  tx: number;
  ty: number;
  tz: number; // orbit target
}

const KEY_PANELS = "robotics:panels:v1";
const KEY_CAMERA = "robotics:camera:v1";

// Returns saved panels only if the saved set of IDs exactly matches
// the expected active IDs. Any mismatch (panels added/removed) → null.
export function loadPanels(activeIds: PanelId[]): PanelRect[] | null {
  try {
    const raw = localStorage.getItem(KEY_PANELS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const saved = parsed as PanelRect[];

    const savedIds = new Set(saved.map((p) => p.id));
    const activeSet = new Set(activeIds);

    // Reject if sets differ in any direction
    if (savedIds.size !== activeSet.size) return null;
    for (const id of savedIds) if (!activeSet.has(id)) return null;

    return saved;
  } catch {
    return null;
  }
}

export function savePanels(panels: PanelRect[]): void {
  try {
    localStorage.setItem(KEY_PANELS, JSON.stringify(panels));
  } catch {
    /* quota exceeded — ignore */
  }
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && isFinite(v);
}

export function loadCamera(): CameraState | null {
  try {
    const raw = localStorage.getItem(KEY_CAMERA);
    if (!raw) return null;
    const c = JSON.parse(raw) as CameraState;
    // Validate all six fields are finite numbers
    if (
      !isFiniteNum(c.px) ||
      !isFiniteNum(c.py) ||
      !isFiniteNum(c.pz) ||
      !isFiniteNum(c.tx) ||
      !isFiniteNum(c.ty) ||
      !isFiniteNum(c.tz)
    )
      return null;
    // Sanity-check camera isn't impossibly far away
    const dist = Math.sqrt(c.px ** 2 + c.py ** 2 + c.pz ** 2);
    if (dist < 0.1 || dist > 20) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveCamera(state: CameraState): void {
  try {
    localStorage.setItem(KEY_CAMERA, JSON.stringify(state));
  } catch {
    /* quota exceeded — ignore */
  }
}

const KEY_JOINTS = "robotics:joints:v1";

export function loadJoints(): JointAngles | null {
  try {
    const raw = localStorage.getItem(KEY_JOINTS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    // Validate every value is a finite number
    for (const v of Object.values(parsed)) {
      if (!isFiniteNum(v)) return null;
    }
    return parsed as JointAngles;
  } catch {
    return null;
  }
}

export function saveJoints(angles: JointAngles): void {
  try {
    localStorage.setItem(KEY_JOINTS, JSON.stringify(angles));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function clearPersistedLayout(): void {
  try {
    localStorage.removeItem(KEY_PANELS);
    localStorage.removeItem(KEY_CAMERA);
    localStorage.removeItem(KEY_JOINTS);
  } catch {
    /* ignore */
  }
}
