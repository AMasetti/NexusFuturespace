// ─── Robot definition (public/models/<id>/robot.json) ─────────────────────────
// One JSON file next to each URDF drives the whole UI for that robot: which
// servos exist and how they move the URDF joints, and which panels can be shown.
// Optional sections (power, imu, mcu, sim, link) hide their panel when absent.
//
// Self-contained on purpose (no imports): scripts/validate-robots.mjs runs it
// directly with Node to check every robot.json against its URDF in CI.

/** One URDF joint driven by a servo: urdf = scale · servo + offset. */
export interface JointTerm {
  joint: string;
  scale: number;
  offsetDeg: number;
}

export interface ServoDef {
  /** Stable key. For robots with a live link this is the firmware joint name. */
  id: string;
  label: string;
  group: string;
  channel?: number;
  /** Travel around the servo's zero, in degrees. */
  limitsDeg: [number, number];
  /** URDF joints this servo turns (several for linkages such as parallelograms). */
  joints: JointTerm[];
  /** URDF joint the part visibly turns around when dragged in 3D. */
  pivot: string;
  /** Key into servoTypes — needed for the Power Draw panel. */
  type?: string;
  /** Firmware #define receiving this servo's offset — enables Copy Pose. */
  configDefine?: string;
}

export interface ServoType {
  idleA: number;
  stallA: number;
}

export interface RtosTask {
  name: string;
  hz: number;
  priority: number;
  stackKB: number;
  /** Share of CPU time, 0–1. */
  load: number;
}

export interface McuDef {
  model: string;
  detail?: string;
  rtos?: {
    version?: string;
    bus?: string;
    tasks: RtosTask[];
    peripherals?: { name: string; bus: string; hz: number }[];
    notes?: string[];
  };
}

export interface RobotDef {
  id: string;
  name: string;
  description: string;
  /** Absolute URL of the URDF. */
  urdf: string;
  /** What the sliders read at the servo's zero (Optimus: 90 → 0–180 scale; else 0). */
  zeroDeg: number;
  servos: ServoDef[];
  servoTypes?: Record<string, ServoType>;
  power?: { busV: number };
  imu?: { model: string };
  mcu?: McuDef;
  sim?: { engine: string; params: Record<string, string> };
  link?: {
    protocol: "firmware-ws";
    port: number;
    ros?: { jointStates: string; command: string; bridgeStatus: string };
    copyPoseTarget?: string;
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/**
 * Parses and validates a robot.json. `baseUrl` is the folder it was loaded from
 * (used to resolve the URDF path). Throws one Error listing every problem.
 */
export function parseRobotDef(raw: unknown, id: string, baseUrl: string): RobotDef {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);
  if (!isObj(raw)) throw new Error(`${id}: robot.json must be an object`);

  if (!isStr(raw.name)) err("name: required string");
  if (!isStr(raw.urdf)) err("urdf: required path, relative to robot.json");
  if (raw.zeroDeg !== undefined && !isNum(raw.zeroDeg)) err("zeroDeg: number");

  const servos: ServoDef[] = [];
  if (!Array.isArray(raw.servos) || raw.servos.length === 0)
    err("servos: non-empty array required");
  const seen = new Set<string>();
  for (const [i, s] of (Array.isArray(raw.servos) ? raw.servos : []).entries()) {
    const at = `servos[${i}]`;
    if (!isObj(s)) {
      err(`${at}: object`);
      continue;
    }
    if (!isStr(s.id)) err(`${at}.id: required`);
    else if (seen.has(s.id)) err(`${at}.id: duplicate "${s.id}"`);
    else seen.add(s.id);
    if (!isStr(s.label)) err(`${at}.label: required`);
    if (!isStr(s.group)) err(`${at}.group: required`);
    const lim = s.limitsDeg;
    if (
      !Array.isArray(lim) ||
      lim.length !== 2 ||
      !isNum(lim[0]) ||
      !isNum(lim[1]) ||
      lim[0] >= lim[1]
    )
      err(`${at}.limitsDeg: [min, max] with min < max`);
    const joints: JointTerm[] = [];
    if (!Array.isArray(s.joints) || s.joints.length === 0) err(`${at}.joints: non-empty array`);
    for (const [k, t] of (Array.isArray(s.joints) ? s.joints : []).entries()) {
      if (!isObj(t) || !isStr(t.joint)) {
        err(`${at}.joints[${k}].joint: required`);
        continue;
      }
      if (t.scale !== undefined && !isNum(t.scale)) err(`${at}.joints[${k}].scale: number`);
      if (t.offsetDeg !== undefined && !isNum(t.offsetDeg))
        err(`${at}.joints[${k}].offsetDeg: number`);
      joints.push({
        joint: t.joint,
        scale: isNum(t.scale) ? t.scale : 1,
        offsetDeg: isNum(t.offsetDeg) ? t.offsetDeg : 0,
      });
    }
    const pivot = isStr(s.pivot) ? s.pivot : joints[0]?.joint;
    if (pivot && !joints.some((t) => t.joint === pivot))
      err(`${at}.pivot: "${pivot}" must be one of its joints`);
    servos.push({
      id: String(s.id),
      label: String(s.label),
      group: String(s.group),
      channel: isNum(s.channel) ? s.channel : undefined,
      limitsDeg: Array.isArray(lim) ? [Number(lim[0]), Number(lim[1])] : [-90, 90],
      joints,
      pivot: pivot ?? "",
      type: isStr(s.type) ? s.type : undefined,
      configDefine: isStr(s.configDefine) ? s.configDefine : undefined,
    });
  }

  const servoTypes = isObj(raw.servoTypes)
    ? (raw.servoTypes as Record<string, ServoType>)
    : undefined;
  for (const [name, t] of Object.entries(servoTypes ?? {}))
    if (!isObj(t) || !isNum(t.idleA) || !isNum(t.stallA) || t.stallA < t.idleA)
      err(`servoTypes.${name}: { idleA, stallA } with stallA ≥ idleA`);
  for (const s of servos)
    if (s.type && !servoTypes?.[s.type]) err(`servo ${s.id}: type "${s.type}" not in servoTypes`);

  const power = isObj(raw.power) ? raw.power : undefined;
  if (power && !isNum(power.busV)) err("power.busV: number");
  const imu = isObj(raw.imu) ? raw.imu : undefined;
  if (imu && !isStr(imu.model)) err("imu.model: required");
  const mcu = isObj(raw.mcu) ? raw.mcu : undefined;
  if (mcu && !isStr(mcu.model)) err("mcu.model: required");
  if (mcu && isObj(mcu.rtos) && !Array.isArray(mcu.rtos.tasks)) err("mcu.rtos.tasks: array");
  const link = isObj(raw.link) ? raw.link : undefined;
  if (link && (link.protocol !== "firmware-ws" || !isNum(link.port)))
    err('link: { protocol: "firmware-ws", port }');

  if (errors.length) throw new Error(`${id}/robot.json:\n  - ${errors.join("\n  - ")}`);

  return {
    id,
    name: String(raw.name),
    description: isStr(raw.description) ? raw.description : "",
    urdf: new URL(String(raw.urdf), new URL(baseUrl, "http://x")).pathname,
    zeroDeg: isNum(raw.zeroDeg) ? raw.zeroDeg : 0,
    servos,
    servoTypes,
    power: power ? { busV: Number(power.busV) } : undefined,
    imu: imu ? { model: String(imu.model) } : undefined,
    mcu: mcu as McuDef | undefined,
    sim: isObj(raw.sim) ? (raw.sim as RobotDef["sim"]) : undefined,
    link: link as RobotDef["link"],
  };
}

/** Problems with a definition's references into its URDF (empty when consistent). */
export function checkAgainstUrdf(def: RobotDef, urdfJoints: Set<string>): string[] {
  const problems: string[] = [];
  for (const s of def.servos)
    for (const t of s.joints)
      if (!urdfJoints.has(t.joint)) problems.push(`servo ${s.id}: joint "${t.joint}" not in URDF`);
  return problems;
}

// ─── Panel availability ───────────────────────────────────────────────────────

/** Power Draw needs a bus voltage and a known servo type for every servo. */
export const hasPower = (d: RobotDef) =>
  !!d.power && d.servos.every((s) => s.type && d.servoTypes?.[s.type]);
export const hasImu = (d: RobotDef) => !!d.imu;
export const hasRtos = (d: RobotDef) => !!d.mcu?.rtos;
export const hasLink = (d: RobotDef) => !!d.link;
export const canCopyPose = (d: RobotDef) => hasLink(d) && d.servos.every((s) => s.configDefine);

/** Servo groups in file order. */
export function servoGroups(d: RobotDef): { label: string; servos: ServoDef[] }[] {
  const groups: { label: string; servos: ServoDef[] }[] = [];
  for (const s of d.servos) {
    const g = groups.find((x) => x.label === s.group);
    if (g) g.servos.push(s);
    else groups.push({ label: s.group, servos: [s] });
  }
  return groups;
}

export type ServoAngles = Record<string, number>;

export const zeroAngles = (d: RobotDef): ServoAngles =>
  Object.fromEntries(d.servos.map((s) => [s.id, 0]));
