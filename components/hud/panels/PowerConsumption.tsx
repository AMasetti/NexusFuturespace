"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HudPanel } from "../core/HudPanel";
import { servoGroups, type RobotDef, type ServoAngles } from "@/lib/robot-def";

// Max realistic servo slew rate used to normalise angular velocity → load fraction
const MAX_SLEW = Math.PI; // rad/s ≈ 180°/s

// Group colours, assigned in the order groups appear in robot.json.
const GROUP_COLORS = [
  "rgba(0,200,255,0.85)",
  "rgba(0,255,156,0.85)",
  "rgba(180,120,255,0.85)",
  "rgba(255,190,90,0.85)",
  "rgba(255,120,170,0.85)",
];

interface ServoSpec {
  idle: number; // A held at rest
  extra: number; // A added at full slew (stall − idle)
}

/** Everything the panel needs, derived from robot.json (power + servoTypes). */
interface PowerModel {
  busV: number;
  keys: string[];
  spec: Record<string, ServoSpec>;
  baselineW: number;
  peakExtraW: number;
  maxW: number;
  groups: { label: string; color: string; keys: string[] }[];
  types: { name: string; count: number; stallA: number }[];
}

function buildPowerModel(def: RobotDef): PowerModel {
  const busV = def.power?.busV ?? 0;
  const spec: Record<string, ServoSpec> = {};
  for (const s of def.servos) {
    const t = def.servoTypes?.[s.type ?? ""] ?? { idleA: 0, stallA: 0 };
    spec[s.id] = { idle: t.idleA, extra: t.stallA - t.idleA };
  }
  const keys = def.servos.map((s) => s.id);
  const baselineW = keys.reduce((sum, k) => sum + busV * spec[k].idle, 0);
  const peakExtraW = keys.reduce((sum, k) => sum + busV * spec[k].extra, 0);
  const groups = servoGroups(def).map((g, i) => ({
    label: g.label,
    color: GROUP_COLORS[i % GROUP_COLORS.length],
    keys: g.servos.map((s) => s.id),
  }));
  const types = Object.entries(def.servoTypes ?? {})
    .map(([name, t]) => ({
      name,
      stallA: t.stallA,
      count: def.servos.filter((s) => s.type === name).length,
    }))
    .filter((t) => t.count > 0);
  return { busV, keys, spec, baselineW, peakExtraW, maxW: baselineW + peakExtraW, groups, types };
}

// ── Rolling buffer ────────────────────────────────────────────────────────────
const WINDOW_S = 5;
const SAMPLE_HZ = 20;
const BUFFER_LEN = WINDOW_S * SAMPLE_HZ; // 100 samples

// ── Colours ───────────────────────────────────────────────────────────────────
const C_LINE = "rgba(0,200,255,0.90)";
const C_FILL = "rgba(0,200,255,0.10)";
const C_PEAK = "rgba(0,255,156,0.85)";
const C_IDLE = "rgba(0,255,156,0.75)";
const C_GRID = "rgba(0,200,255,0.12)";
const C_DIM = "rgba(0,200,255,0.50)";
const C_VAL = "rgba(0,200,255,0.95)";

// ── Type scale — four sizes, used everywhere in the panel ─────────────────────
const MONO: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono, monospace)",
  fontVariantNumeric: "tabular-nums",
};
const T_LABEL: React.CSSProperties = {
  ...MONO,
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: C_DIM,
};
const T_VALUE: React.CSSProperties = { ...MONO, fontSize: 13, fontWeight: 700 };
const T_UNIT: React.CSSProperties = { ...MONO, fontSize: 11, color: C_DIM, marginLeft: 3 };
const T_HERO: React.CSSProperties = { ...MONO, fontSize: 34, fontWeight: 700, lineHeight: 1 };

const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
};

// ── Chart ─────────────────────────────────────────────────────────────────────
// The SVG stretches to the panel width, so it only draws geometry (with
// non-scaling strokes); labels and the live dot are HTML laid over it.
const CH_H = 96;

function PowerChart({ pm, samples, peakW }: { pm: PowerModel; samples: number[]; peakW: number }) {
  const { baselineW: BASELINE_W, maxW: MAX_W } = pm;
  const pctOf = (w: number) => Math.max(0, Math.min(1, w / MAX_W)) * 100;
  const toX = (i: number) => (i / (BUFFER_LEN - 1)) * 100;
  const toY = (w: number) => 100 - pctOf(w);

  const line = samples.map((w, i) => `${toX(i).toFixed(2)},${toY(w).toFixed(2)}`).join(" ");
  const area = `M0,100 L${line.replaceAll(" ", " L")} L${toX(samples.length - 1).toFixed(2)},100 Z`;
  const last = samples[samples.length - 1] ?? BASELINE_W;
  const marks = [MAX_W, MAX_W * 0.5, BASELINE_W];

  return (
    <div className="relative mt-3 w-full" style={{ height: CH_H }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        {marks.map((w) => (
          <line
            key={w}
            x1={0}
            x2={100}
            y1={toY(w)}
            y2={toY(w)}
            stroke={w === BASELINE_W ? "rgba(0,255,156,0.25)" : C_GRID}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {samples.length > 1 && <path d={area} fill={C_FILL} />}
        {peakW > BASELINE_W + 1 && (
          <line
            x1={0}
            x2={100}
            y1={toY(peakW)}
            y2={toY(peakW)}
            stroke={C_PEAK}
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {samples.length > 1 && (
          <polyline
            points={line}
            fill="none"
            stroke={C_LINE}
            strokeWidth={1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {marks.map((w) => (
        <span
          key={w}
          className="absolute left-0 -translate-y-full pb-0.5"
          style={{
            ...T_LABEL,
            fontSize: 9,
            top: `${toY(w)}%`,
            color: w === BASELINE_W ? C_IDLE : C_DIM,
          }}
        >
          {w.toFixed(0)} W{w === BASELINE_W ? " · idle" : ""}
        </span>
      ))}
      {peakW > BASELINE_W + 1 && (
        <span
          className="absolute right-0 -translate-y-full pb-0.5"
          style={{ ...T_LABEL, fontSize: 9, top: `${toY(peakW)}%`, color: C_PEAK }}
        >
          peak
        </span>
      )}
      <span
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: "100%", top: `${toY(last)}%`, background: C_LINE }}
      />
    </div>
  );
}

// ── Stacked bar: idle floor + movement on top ─────────────────────────────────
function LoadBar({
  idlePct,
  movePct,
  color,
  height,
  peakPct,
}: {
  idlePct: number;
  movePct: number;
  color: string;
  height: number;
  /** Session peak as % of the bar — drawn as a tick. */
  peakPct?: number;
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-full"
      style={{ height, background: "rgba(255,255,255,0.05)" }}
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: `${idlePct}%`, background: color, opacity: 0.25 }}
      />
      <div
        className="absolute inset-y-0"
        style={{ left: `${idlePct}%`, width: `${movePct}%`, background: color }}
      />
      {peakPct !== undefined && peakPct > idlePct + 0.5 && (
        <div
          className="absolute inset-y-0 w-0.5 -translate-x-1/2"
          style={{ left: `${Math.min(peakPct, 99.5)}%`, background: C_PEAK }}
        />
      )}
    </div>
  );
}

// ── Group watts (idle + movement) ─────────────────────────────────────────────
function calcGroupW(pm: PowerModel, keys: readonly string[], vel: Record<string, number>) {
  let idleW = 0;
  let moveW = 0;
  for (const key of keys) {
    const spec = pm.spec[key];
    idleW += pm.busV * spec.idle;
    const load = Math.min(Math.abs(vel[key] ?? 0) / MAX_SLEW, 1);
    moveW += pm.busV * spec.extra * load;
  }
  return { idleW, moveW, totalW: idleW + moveW };
}

const fmtDuration = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;

// ── Public component ──────────────────────────────────────────────────────────
interface PowerConsumptionProps {
  def: RobotDef;
  angles: ServoAngles;
  /** Mobile collapse state — forwarded to the inner HudPanel. */
  collapsed?: boolean;
  /** Mobile toggle callback — forwarded to the inner HudPanel. */
  onToggle?: () => void;
}

interface SessionStats {
  groupPeakW: Record<string, number>;
  seconds: number;
  peakW: number;
  avgW: number;
  energyWh: number;
}

const idleGroupW = (pm: PowerModel) =>
  Object.fromEntries(pm.groups.map((g) => [g.label, calcGroupW(pm, g.keys, {}).idleW]));

const freshSession = (pm: PowerModel) => ({
  start: performance.now(),
  energyJ: 0,
  peakW: pm.baselineW,
  groupPeakW: idleGroupW(pm),
});

export function PowerConsumption({ def, angles, collapsed, onToggle }: PowerConsumptionProps) {
  const pm = useMemo(() => buildPowerModel(def), [def]);
  const { baselineW: BASELINE_W, peakExtraW: PEAK_EXTRA_W, maxW: MAX_W } = pm;
  const prevAngles = useRef<ServoAngles>(angles);
  const prevTime = useRef<number>(0);
  const smoothedW = useRef(BASELINE_W);
  const velocities = useRef<Record<string, number>>({});
  const session = useRef(freshSession(pm));
  const anglesRef = useRef(angles);
  useLayoutEffect(() => {
    anglesRef.current = angles;
  }, [angles]);

  const [samples, setSamples] = useState<number[]>(() => Array(BUFFER_LEN).fill(BASELINE_W));
  const [displayW, setDisplayW] = useState(BASELINE_W);
  const [velSnap, setVelSnap] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<SessionStats>({
    groupPeakW: idleGroupW(pm),
    seconds: 0,
    peakW: BASELINE_W,
    avgW: BASELINE_W,
    energyWh: 0,
  });

  useEffect(() => {
    const intervalMs = 1000 / SAMPLE_HZ;
    const TAU_DECAY = 0.25; // velocity decay time constant (seconds)
    const ALPHA_UP = 0.4; // wattage smoothing — fast rise
    const ALPHA_DOWN = 0.1; // wattage smoothing — slow decay

    prevTime.current = performance.now();
    session.current = freshSession(pm);
    let rafId: number;
    let lastTick = performance.now();

    const tick = (now: number) => {
      if (now - lastTick >= intervalMs) {
        const dt = Math.max(0.001, (now - prevTime.current) / 1000);
        prevTime.current = now;

        const cur = anglesRef.current;
        const prev = prevAngles.current;
        const vel = velocities.current;

        // Per-joint velocity with exponential decay
        for (const key of pm.keys) {
          const instantV = Math.abs((cur[key] ?? 0) - (prev[key] ?? 0)) / dt;
          const decayed = (vel[key] ?? 0) * Math.exp(-dt / TAU_DECAY);
          vel[key] = Math.max(instantV, decayed);
        }
        prevAngles.current = { ...cur };
        velocities.current = vel;

        // Total power = baseline + velocity-driven movement draw
        let movementW = 0;
        for (const key of pm.keys) {
          const spec = pm.spec[key];
          const load = Math.min((vel[key] ?? 0) / MAX_SLEW, 1);
          movementW += pm.busV * spec.extra * load;
        }

        const target = BASELINE_W + movementW;
        const alpha = target > smoothedW.current ? ALPHA_UP : ALPHA_DOWN;
        smoothedW.current = Math.max(
          BASELINE_W,
          Math.min(MAX_W, smoothedW.current + alpha * (target - smoothedW.current))
        );
        const w = smoothedW.current;

        // Session accumulators: energy integrates W·dt, average = energy / time.
        const sess = session.current;
        sess.energyJ += w * dt;
        sess.peakW = Math.max(sess.peakW, w);
        for (const g of pm.groups) {
          const gw = calcGroupW(pm, g.keys, vel).totalW;
          sess.groupPeakW[g.label] = Math.max(sess.groupPeakW[g.label] ?? 0, gw);
        }
        const seconds = (now - sess.start) / 1000;

        setSamples((p) => [...(p.length >= BUFFER_LEN ? p.slice(1) : p), w]);
        setDisplayW(w);
        setVelSnap({ ...vel });
        setStats({
          seconds,
          peakW: sess.peakW,
          avgW: seconds > 0.5 ? sess.energyJ / seconds : w,
          energyWh: sess.energyJ / 3600,
          groupPeakW: { ...sess.groupPeakW },
        });
        lastTick = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [pm, BASELINE_W, MAX_W]);

  const resetSession = () => {
    session.current = freshSession(pm);
    setSamples(Array(BUFFER_LEN).fill(smoothedW.current));
    setStats({
      seconds: 0,
      peakW: smoothedW.current,
      avgW: smoothedW.current,
      energyWh: 0,
      groupPeakW: { ...session.current.groupPeakW },
    });
  };

  const movementW = displayW - BASELINE_W;
  const movePct = (movementW / PEAK_EXTRA_W) * 100;
  const moveColor =
    movePct > 80 ? "rgba(255,90,50,0.95)" : movePct > 50 ? "rgba(255,200,60,0.95)" : C_LINE;

  return (
    <HudPanel
      title="Power Draw"
      status="online"
      cornerBrackets
      className="h-full"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-4 overflow-auto p-3">
        {/* ── Session ───────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <span style={T_LABEL}>
            Session · <span style={{ color: C_VAL }}>{fmtDuration(stats.seconds)}</span>
          </span>
          <button
            onClick={resetSession}
            title="Reset peak, average, energy and the chart"
            className="rounded-full px-3 py-1 transition-colors hover:bg-white/10"
            style={{ ...T_LABEL, color: C_VAL, border: "1px solid rgba(255,255,255,0.12)" }}
          >
            Reset
          </button>
        </div>

        {/* ── Live total ────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span style={T_LABEL}>Total draw</span>
            <span style={{ ...T_HERO, color: C_VAL }}>
              {displayW.toFixed(1)}
              <span style={{ ...T_UNIT, fontSize: 14 }}>W</span>
            </span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span style={T_LABEL}>Movement</span>
            <span style={{ ...T_VALUE, color: moveColor }}>
              +{movementW.toFixed(1)}
              <span style={T_UNIT}>W · {movePct.toFixed(0)}%</span>
            </span>
          </div>
        </div>

        {/* ── Load bar ──────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <LoadBar
            idlePct={(BASELINE_W / MAX_W) * 100}
            movePct={(movementW / MAX_W) * 100}
            color={moveColor}
            height={8}
          />
          <div className="flex justify-between">
            <span style={{ ...T_LABEL, color: C_IDLE }}>Idle {BASELINE_W.toFixed(1)} W</span>
            <span style={T_LABEL}>Max {MAX_W.toFixed(0)} W</span>
          </div>
        </div>

        {/* ── Session stats ─────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Peak", value: stats.peakW.toFixed(1), unit: "W", color: C_PEAK },
            { label: "Average", value: stats.avgW.toFixed(1), unit: "W", color: C_VAL },
            { label: "Energy", value: stats.energyWh.toFixed(2), unit: "Wh", color: C_VAL },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1 rounded-xl px-2.5 py-2" style={CARD}>
              <span style={T_LABEL}>{s.label}</span>
              <span style={{ ...T_VALUE, color: s.color }}>
                {s.value}
                <span style={T_UNIT}>{s.unit}</span>
              </span>
            </div>
          ))}
        </div>

        {/* ── Rolling chart ─────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <span style={T_LABEL}>
            Last {WINDOW_S} s · {SAMPLE_HZ} Hz
          </span>
          <PowerChart pm={pm} samples={samples} peakW={stats.peakW} />
        </div>

        {/* ── Per-group breakdown ───────────────────────────── */}
        <div className="flex flex-col gap-2.5">
          <span style={T_LABEL}>By group</span>
          {pm.groups.map((g) => {
            const { idleW, moveW, totalW } = calcGroupW(pm, g.keys, velSnap);
            const gMax = g.keys.reduce(
              (sum, k) => sum + pm.busV * (pm.spec[k].idle + pm.spec[k].extra),
              0
            );
            const gPeak = stats.groupPeakW[g.label] ?? idleW;
            return (
              <div key={g.label} className="flex flex-col gap-1">
                <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3">
                  <span style={{ ...T_LABEL, color: g.color }}>{g.label}</span>
                  <span style={{ ...T_LABEL, color: C_PEAK }}>peak {gPeak.toFixed(1)} W</span>
                  <span
                    className="min-w-[4.5rem] text-right"
                    style={{ ...T_VALUE, color: g.color }}
                  >
                    {totalW.toFixed(1)}
                    <span style={T_UNIT}>W</span>
                  </span>
                </div>
                <LoadBar
                  idlePct={(idleW / gMax) * 100}
                  movePct={(moveW / gMax) * 100}
                  color={g.color}
                  height={5}
                  peakPct={(gPeak / gMax) * 100}
                />
              </div>
            );
          })}
        </div>

        {/* ── Servo specs ───────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            ...pm.types.map((t, i) => ({
              label: `× ${t.count}`,
              model: t.name,
              detail: `${t.stallA} A stall`,
              color: GROUP_COLORS[i % GROUP_COLORS.length],
            })),
            { label: "Bus", model: `${pm.busV.toFixed(1)} V`, detail: "fixed", color: C_PEAK },
          ].map((c) => (
            <div key={c.label} className="flex flex-col gap-1 rounded-xl px-2.5 py-2" style={CARD}>
              <span style={T_LABEL}>{c.label}</span>
              <span style={{ ...T_VALUE, color: c.color }}>{c.model}</span>
              <span
                className="whitespace-nowrap"
                style={{ ...T_LABEL, fontSize: 9, letterSpacing: "0.04em", textTransform: "none" }}
              >
                {c.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </HudPanel>
  );
}
