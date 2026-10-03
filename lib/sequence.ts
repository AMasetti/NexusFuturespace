// ─── Pose sequences ───────────────────────────────────────────────────────────
// A sequence is a list of poses; each pose holds every servo angle and how long
// the move from the previous pose takes. Joints travel between poses along a
// normalised logistic ("sigmoid") curve: slow start, fast middle, slow arrival,
// so servos have time to settle. Pure functions — no React.

import type { RobotDef, ServoAngles } from "./robot-def";

export interface Pose {
  id: string;
  name: string;
  angles: ServoAngles;
  /**
   * Seconds to move here from the previous pose. For the first pose: seconds
   * to return to it from the last one when looping.
   */
  durationS: number;
}

export interface Sequence {
  /** Animation name, e.g. "wave" — used in the export file name. */
  name: string;
  poses: Pose[];
  loop: boolean;
}

export const DEFAULT_SEQUENCE_NAME = "untitled";
const MAX_NAME = 40;

/** File-name-safe name: lowercase, runs of anything else → "-". */
export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || DEFAULT_SEQUENCE_NAME;

/** `<robot>_<name>_sequence.json` */
export const sequenceFileName = (robot: string, name: string) =>
  `${robot}_${slugify(name)}_sequence.json`;

/** Name from a `<robot>_<name>_sequence.json` file name, or null if it doesn't match. */
export function nameFromFileName(fileName: string, robot: string): string | null {
  const m = fileName.match(new RegExp(`^${robot}_(.+)_sequence\\.json$`, "i"));
  return m ? m[1] : null;
}

export const DEFAULT_DURATION_S = 1;
export const MIN_DURATION_S = 0.1;
/** Steepness of the logistic curve; 10 ≈ smooth start/stop, near-linear middle. */
export const SIGMOID_K = 10;
export const EXPORT_HZ = 50;

const logistic = (x: number) => 1 / (1 + Math.exp(-SIGMOID_K * (x - 0.5)));
const L0 = logistic(0);
const L1 = logistic(1);

/** Logistic curve rescaled so it maps 0 → 0 and 1 → 1 exactly. */
export function sigmoidEase(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return (logistic(x) - L0) / (L1 - L0);
}

export const newPoseId = () => Math.random().toString(36).slice(2, 10);

export function singlePoseSequence(angles: ServoAngles): Sequence {
  return {
    name: DEFAULT_SEQUENCE_NAME,
    poses: [
      { id: newPoseId(), name: "Pose 1", angles: { ...angles }, durationS: DEFAULT_DURATION_S },
    ],
    loop: false,
  };
}

interface Segment {
  from: Pose;
  to: Pose;
  start: number;
  duration: number;
}

/** Transitions in play order; with loop on, the last one returns to pose 1. */
export function segments(seq: Sequence): Segment[] {
  const out: Segment[] = [];
  let t = 0;
  const { poses } = seq;
  for (let i = 1; i < poses.length; i++) {
    out.push({ from: poses[i - 1], to: poses[i], start: t, duration: poses[i].durationS });
    t += poses[i].durationS;
  }
  if (seq.loop && poses.length > 1) {
    out.push({
      from: poses[poses.length - 1],
      to: poses[0],
      start: t,
      duration: poses[0].durationS,
    });
  }
  return out;
}

export function totalDuration(seq: Sequence): number {
  return segments(seq).reduce((sum, s) => sum + s.duration, 0);
}

/** Time at which each pose is reached (pose 1 at 0). */
export function poseTimes(seq: Sequence): number[] {
  const times = [0];
  for (let i = 1; i < seq.poses.length; i++) times.push(times[i - 1] + seq.poses[i].durationS);
  return times;
}

/** Angles at time t (seconds from pose 1). */
export function sampleAt(seq: Sequence, t: number, servoIds: string[]): ServoAngles {
  const segs = segments(seq);
  if (segs.length === 0) return { ...seq.poses[0].angles };
  const seg = segs.find((s) => t < s.start + s.duration) ?? segs[segs.length - 1];
  const e = sigmoidEase((t - seg.start) / seg.duration);
  const out: ServoAngles = {};
  for (const id of servoIds) {
    const a = seg.from.angles[id] ?? 0;
    const b = seg.to.angles[id] ?? 0;
    out[id] = a + (b - a) * e;
  }
  return out;
}

/** Index of the pose being moved towards at time t (pose 1 while idle). */
export function activePoseAt(seq: Sequence, t: number): number {
  const segs = segments(seq);
  const i = segs.findIndex((s) => t < s.start + s.duration);
  if (i < 0) return seq.loop ? 0 : seq.poses.length - 1;
  return (i + 1) % seq.poses.length;
}

// ─── Export / import ──────────────────────────────────────────────────────────

export const SEQUENCE_FORMAT = "nexus-pose-sequence";

/**
 * Everything a program needs to replay the sequence: the keyframes with their
 * timing, the servo table, and the trajectory pre-sampled at EXPORT_HZ (one
 * pass; with loop on it ends back at pose 1). Angles are radians around each
 * servo's zero — the same values the robot link sends as set_joints.
 */
export function exportSequence(def: RobotDef, seq: Sequence) {
  const ids = def.servos.map((s) => s.id);
  const total = totalDuration(seq);
  const times = poseTimes(seq);
  const frames: number[][] = [];
  const n = Math.max(1, Math.round(total * EXPORT_HZ) + 1);
  for (let k = 0; k < n; k++) {
    const a = sampleAt(seq, Math.min(total, k / EXPORT_HZ), ids);
    frames.push(ids.map((id) => Number(a[id].toFixed(5))));
  }
  return {
    format: SEQUENCE_FORMAT,
    version: 1,
    robot: def.id,
    name: seq.name,
    angleUnit: "rad",
    interpolation: { type: "sigmoid", k: SIGMOID_K },
    loop: seq.loop,
    durationS: Number(total.toFixed(3)),
    servos: def.servos.map((s) => ({
      id: s.id,
      label: s.label,
      channel: s.channel ?? null,
      limitsDeg: s.limitsDeg,
    })),
    poses: seq.poses.map((p, i) => ({
      name: p.name,
      timeS: Number(times[i].toFixed(3)),
      durationS: p.durationS,
      angles: Object.fromEntries(ids.map((id) => [id, Number((p.angles[id] ?? 0).toFixed(5))])),
    })),
    trajectory: { hz: EXPORT_HZ, servoOrder: ids, frames },
  };
}

/**
 * Reads a sequence from an export file or local storage. Unknown servos are
 * dropped, missing ones read 0; angles are clamped to each servo's limits.
 */
export function parseSequence(raw: unknown, def: RobotDef): Sequence {
  if (typeof raw !== "object" || raw === null) throw new Error("not a sequence file");
  const r = raw as Record<string, unknown>;
  if (r.robot !== undefined && r.robot !== def.id)
    throw new Error(`sequence is for "${String(r.robot)}", not ${def.name}`);
  if (!Array.isArray(r.poses) || r.poses.length === 0) throw new Error("no poses");
  const poses: Pose[] = r.poses.map((p: unknown, i: number) => {
    const q = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>;
    const src = (typeof q.angles === "object" && q.angles !== null ? q.angles : {}) as Record<
      string,
      unknown
    >;
    const angles: ServoAngles = {};
    for (const s of def.servos) {
      const v = typeof src[s.id] === "number" ? (src[s.id] as number) : 0;
      const [lo, hi] = s.limitsDeg.map((d) => (d * Math.PI) / 180);
      angles[s.id] = Math.min(hi, Math.max(lo, v));
    }
    const d = typeof q.durationS === "number" && q.durationS > 0 ? q.durationS : DEFAULT_DURATION_S;
    return {
      id: typeof q.id === "string" ? q.id : newPoseId(),
      name: typeof q.name === "string" ? q.name : `Pose ${i + 1}`,
      angles,
      durationS: Math.max(MIN_DURATION_S, d),
    };
  });
  const name =
    typeof r.name === "string" && r.name.trim()
      ? r.name.trim().slice(0, MAX_NAME)
      : DEFAULT_SEQUENCE_NAME;
  return { name, poses, loop: r.loop === true };
}
