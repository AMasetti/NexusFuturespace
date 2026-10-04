// ─── localStorage persistence helpers ────────────────────────────────────────

export interface CameraState {
  px: number;
  py: number;
  pz: number; // camera position
  tx: number;
  ty: number;
  tz: number; // orbit target
}

const KEY_CAMERA = "robotics:camera:v1";

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && isFinite(v);
}

// Optimus keeps the original key so saved views survive; other robots get their own.
const cameraKey = (robot: string) => (robot === "optimus" ? KEY_CAMERA : `${KEY_CAMERA}:${robot}`);

export function loadCamera(robot = "optimus"): CameraState | null {
  try {
    const raw = localStorage.getItem(cameraKey(robot));
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

export function saveCamera(state: CameraState, robot = "optimus"): void {
  try {
    localStorage.setItem(cameraKey(robot), JSON.stringify(state));
  } catch {
    /* quota exceeded — ignore */
  }
}

// Servo angles per robot, keyed by servo id from robot.json.
const KEY_SERVOS = "robotics:servos:v2";
// Optimus poses saved before robot.json used legacy URDF joint names.
const KEY_JOINTS_V1 = "robotics:joints:v1";
const V1_TO_SERVO: Record<string, string> = {
  "Servo-Hip-L": "l_hip_roll",
  "Servo-Knee-L-Top": "l_hip_pitch",
  "Servo-Knee-L-Bottom": "l_knee",
  "Servo-Ankle-L": "l_ankle_roll",
  "Servo-Hip-R": "r_hip_roll",
  "Servo-Knee-R-Top": "r_hip_pitch",
  "Servo-Knee-R-Bottom": "r_knee",
  "Servo-Ankle-R": "r_ankle_roll",
  "Servo-Showlder-L-Front-Back": "l_shoulder_fb",
  "Servo-Showlder-R-Front-Back": "r_shoulder_fb",
  "Servo-Showlder-L-Inward-Outward": "l_shoulder_lat",
  "Servo-Showlder-R-Inward-Outward": "r_shoulder_lat",
  "Servo-Forearm-L": "l_forearm_lat",
  "Servo-Forearm-R": "r_forearm_lat",
};

/** Saved angles for `robot`, limited to `servoIds`; null when nothing usable is stored. */
export function loadServoAngles(robot: string, servoIds: string[]): Record<string, number> | null {
  try {
    let raw = localStorage.getItem(`${KEY_SERVOS}:${robot}`);
    let parsed: Record<string, unknown> | null = raw ? JSON.parse(raw) : null;
    if (!parsed && robot === "optimus" && (raw = localStorage.getItem(KEY_JOINTS_V1))) {
      const v1 = JSON.parse(raw) as Record<string, unknown>;
      parsed = Object.fromEntries(Object.entries(v1).map(([k, v]) => [V1_TO_SERVO[k] ?? k, v]));
    }
    if (typeof parsed !== "object" || parsed === null) return null;
    const angles: Record<string, number> = {};
    for (const id of servoIds) {
      const v = parsed[id];
      angles[id] = typeof v === "number" && Number.isFinite(v) ? v : 0;
    }
    return angles;
  } catch {
    return null;
  }
}

// Pose sequence per robot (raw JSON; lib/sequence.ts validates it on load).
const KEY_SEQUENCE = "robotics:sequence:v1";

export function loadSequenceRaw(robot: string): unknown {
  try {
    const raw = localStorage.getItem(`${KEY_SEQUENCE}:${robot}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSequenceRaw(robot: string, sequence: unknown): void {
  try {
    localStorage.setItem(`${KEY_SEQUENCE}:${robot}`, JSON.stringify(sequence));
  } catch {
    /* quota exceeded — ignore */
  }
}

const KEY_SIDEBAR_WIDTH = "robotics:sidebar-width:v1";

export function loadSidebarWidth(side: string): number | null {
  try {
    const raw = localStorage.getItem(`${KEY_SIDEBAR_WIDTH}:${side}`);
    const w = raw ? Number(raw) : NaN;
    return Number.isFinite(w) ? w : null;
  } catch {
    return null;
  }
}

export function saveSidebarWidth(side: string, width: number): void {
  try {
    localStorage.setItem(`${KEY_SIDEBAR_WIDTH}:${side}`, String(Math.round(width)));
  } catch {
    /* quota exceeded — ignore */
  }
}

const KEY_SIDEBAR_OPEN = "robotics:sidebar-open:v1";

export function loadSidebarOpen(side: string): boolean | null {
  try {
    const raw = localStorage.getItem(`${KEY_SIDEBAR_OPEN}:${side}`);
    return raw === null ? null : raw === "1";
  } catch {
    return null;
  }
}

export function saveSidebarOpen(side: string, open: boolean): void {
  try {
    localStorage.setItem(`${KEY_SIDEBAR_OPEN}:${side}`, open ? "1" : "0");
  } catch {
    /* quota exceeded — ignore */
  }
}

const KEY_ROBOT = "robotics:robot:v1";

export function loadRobot(): string | null {
  try {
    return localStorage.getItem(KEY_ROBOT);
  } catch {
    return null;
  }
}

export function saveRobot(robot: string): void {
  try {
    localStorage.setItem(KEY_ROBOT, robot);
  } catch {
    /* quota exceeded — ignore */
  }
}

const KEY_OPERATOR = "robotics:operator:v1";

/** Who records episodes from the Record panel, remembered between sessions. */
export function loadOperator(): string | null {
  try {
    return localStorage.getItem(KEY_OPERATOR);
  } catch {
    return null;
  }
}

export function saveOperator(name: string): void {
  try {
    localStorage.setItem(KEY_OPERATOR, name);
  } catch {
    /* quota exceeded — ignore */
  }
}
