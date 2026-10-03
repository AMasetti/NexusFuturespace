// ─── Spot Micro joint model ───────────────────────────────────────────────────
// 12 servos: per leg a shoulder (abduction, X axis), a leg (hip pitch, Y axis)
// and a foot (knee, Y axis). Keys are the URDF joint names; limits come from
// public/models/spotmicro/spotmicroai.urdf.

export type SpotAngles = Record<string, number>;

const LEGS = [
  { id: "front_left", label: "Front Left" },
  { id: "front_right", label: "Front Right" },
  { id: "rear_left", label: "Rear Left" },
  { id: "rear_right", label: "Rear Right" },
] as const;

const PARTS = [
  { id: "shoulder", label: "Shoulder", sublabel: "abduction", limits: [-0.548, 0.548] },
  { id: "leg", label: "Leg", sublabel: "hip pitch", limits: [-2.666, 1.548] },
  { id: "foot", label: "Foot", sublabel: "knee", limits: [-2.59, 0.1] },
] as const;

export interface SpotJointDef {
  key: string;
  label: string;
  sublabel: string;
  /** [lower, upper] in radians. */
  limits: readonly [number, number];
}

export const SPOT_JOINT_GROUPS: { label: string; joints: SpotJointDef[] }[] = LEGS.map((leg) => ({
  label: leg.label,
  joints: PARTS.map((part) => ({
    key: `${leg.id}_${part.id}`,
    label: `${part.label} ${leg.label
      .split(" ")
      .map((w) => w[0])
      .join("")}`,
    sublabel: `${leg.id}_${part.id} · ${part.sublabel}`,
    limits: part.limits,
  })),
}));

const ALL_JOINTS = SPOT_JOINT_GROUPS.flatMap((g) => g.joints);

export const SPOT_JOINTS: Record<string, SpotJointDef> = Object.fromEntries(
  ALL_JOINTS.map((j) => [j.key, j])
);

export const DEFAULT_SPOT_ANGLES: SpotAngles = Object.fromEntries(
  ALL_JOINTS.map((j) => [j.key, 0])
);
