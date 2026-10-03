"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HudPanel } from "../core/HudPanel";
import type { JointAngles } from "./ServoSliders";

// ── Servo specs at 6 V ────────────────────────────────────────────────────────
// SG995 (Tower Pro) — legs (8 servos: 4 per leg × 2 legs)
//   No-load hold current: 360 mA   (motor energised, no mechanical load)
//   Stall current:       2000 mA
//   Movement extra:      2000 - 360 = 1640 mA at full slew
//
// Futaba S3003 — arms (6 servos: shoulder FB ×2, shoulder lat ×2, forearm ×2)
//   No-load hold current: 150 mA   (holding pose against light gravity load)
//   Stall current:         600 mA
//   Movement extra:        600 - 150 = 450 mA at full slew

const SUPPLY_V = 6.0;

const SG995 = { idle: 0.36, extra: 1.64 }; // amps
const S3003 = { idle: 0.15, extra: 0.45 }; // amps

// Max realistic servo slew rate used to normalise angular velocity → load fraction
const MAX_SLEW = Math.PI; // rad/s ≈ 180°/s

// ── Joint → servo type mapping ────────────────────────────────────────────────
const JOINT_KEYS = [
  "Servo-Hip-L",
  "Servo-Hip-R",
  "Servo-Knee-L-Top",
  "Servo-Knee-R-Top",
  "Servo-Knee-L-Bottom",
  "Servo-Knee-R-Bottom",
  "Servo-Ankle-L",
  "Servo-Ankle-R",
  "Servo-Showlder-L-Front-Back",
  "Servo-Showlder-R-Front-Back",
  "Servo-Showlder-L-Inward-Outward",
  "Servo-Showlder-R-Inward-Outward",
  "Servo-Forearm-L",
  "Servo-Forearm-R",
] as const satisfies readonly (keyof JointAngles)[];

type JointKey = (typeof JOINT_KEYS)[number];

const SERVO_TYPE: Record<JointKey, typeof SG995> = {
  "Servo-Hip-L": SG995,
  "Servo-Hip-R": SG995,
  "Servo-Knee-L-Top": SG995,
  "Servo-Knee-R-Top": SG995,
  "Servo-Knee-L-Bottom": SG995,
  "Servo-Knee-R-Bottom": SG995,
  "Servo-Ankle-L": SG995,
  "Servo-Ankle-R": SG995,
  "Servo-Showlder-L-Front-Back": S3003,
  "Servo-Showlder-R-Front-Back": S3003,
  "Servo-Showlder-L-Inward-Outward": S3003,
  "Servo-Showlder-R-Inward-Outward": S3003,
  "Servo-Forearm-L": S3003,
  "Servo-Forearm-R": S3003,
};

// ── Derived power constants ───────────────────────────────────────────────────
// Baseline = sum of all idle draws (what the robot consumes standing still)
const BASELINE_W = JOINT_KEYS.reduce((s, k) => s + SUPPLY_V * SERVO_TYPE[k].idle, 0);
// ≈ 8 × 6 × 0.360 + 6 × 6 × 0.150 = 17.28 + 5.40 = 22.68 W

// Max additional movement power (all servos at full slew simultaneously)
const PEAK_EXTRA_W = JOINT_KEYS.reduce((s, k) => s + SUPPLY_V * SERVO_TYPE[k].extra, 0);
// ≈ 8 × 6 × 1.640 + 6 × 6 × 0.450 = 78.72 + 16.20 = 94.92 W

const MAX_W = BASELINE_W + PEAK_EXTRA_W; // ≈ 117.60 W

// ── Groups ────────────────────────────────────────────────────────────────────
const GROUPS: {
  label: string;
  model: string;
  color: string;
  keys: readonly JointKey[];
}[] = [
  {
    label: "LEFT LEG",
    model: "SG995",
    color: "rgba(0,200,255,0.85)",
    keys: ["Servo-Hip-L", "Servo-Knee-L-Top", "Servo-Knee-L-Bottom", "Servo-Ankle-L"],
  },
  {
    label: "RIGHT LEG",
    model: "SG995",
    color: "rgba(0,255,156,0.85)",
    keys: ["Servo-Hip-R", "Servo-Knee-R-Top", "Servo-Knee-R-Bottom", "Servo-Ankle-R"],
  },
  {
    label: "ARMS",
    model: "S3003",
    color: "rgba(180,120,255,0.85)",
    keys: [
      "Servo-Showlder-L-Front-Back",
      "Servo-Showlder-R-Front-Back",
      "Servo-Showlder-L-Inward-Outward",
      "Servo-Showlder-R-Inward-Outward",
      "Servo-Forearm-L",
      "Servo-Forearm-R",
    ],
  },
];

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
const C_ARMS = "rgba(180,120,255,0.85)";

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

const pctOf = (w: number) => Math.max(0, Math.min(1, w / MAX_W)) * 100;

function PowerChart({ samples, peakW }: { samples: number[]; peakW: number }) {
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
}: {
  idlePct: number;
  movePct: number;
  color: string;
  height: number;
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
    </div>
  );
}

// ── Group watts (idle + movement) ─────────────────────────────────────────────
function calcGroupW(keys: readonly JointKey[], vel: Partial<Record<JointKey, number>>) {
  let idleW = 0;
  let moveW = 0;
  for (const key of keys) {
    const spec = SERVO_TYPE[key];
    idleW += SUPPLY_V * spec.idle;
    const load = Math.min(Math.abs(vel[key] ?? 0) / MAX_SLEW, 1);
    moveW += SUPPLY_V * spec.extra * load;
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
  angles: JointAngles;
  /** Mobile collapse state — forwarded to the inner HudPanel. */
  collapsed?: boolean;
  /** Mobile toggle callback — forwarded to the inner HudPanel. */
  onToggle?: () => void;
}

interface SessionStats {
  seconds: number;
  peakW: number;
  avgW: number;
  energyWh: number;
}

const freshSession = () => ({ start: performance.now(), energyJ: 0, peakW: BASELINE_W });

export function PowerConsumption({ angles, collapsed, onToggle }: PowerConsumptionProps) {
  const prevAngles = useRef<JointAngles>(angles);
  const prevTime = useRef<number>(0);
  const smoothedW = useRef(BASELINE_W);
  const velocities = useRef<Partial<Record<JointKey, number>>>({});
  const session = useRef({ start: 0, energyJ: 0, peakW: BASELINE_W });
  const anglesRef = useRef(angles);
  useLayoutEffect(() => {
    anglesRef.current = angles;
  }, [angles]);

  const [samples, setSamples] = useState<number[]>(() => Array(BUFFER_LEN).fill(BASELINE_W));
  const [displayW, setDisplayW] = useState(BASELINE_W);
  const [velSnap, setVelSnap] = useState<Partial<Record<JointKey, number>>>({});
  const [stats, setStats] = useState<SessionStats>({
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
    session.current = freshSession();
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
        for (const key of JOINT_KEYS) {
          const instantV = Math.abs(cur[key] - prev[key]) / dt;
          const decayed = (vel[key] ?? 0) * Math.exp(-dt / TAU_DECAY);
          vel[key] = Math.max(instantV, decayed);
        }
        prevAngles.current = { ...cur };
        velocities.current = vel;

        // Total power = baseline + velocity-driven movement draw
        let movementW = 0;
        for (const key of JOINT_KEYS) {
          const spec = SERVO_TYPE[key];
          const load = Math.min((vel[key] ?? 0) / MAX_SLEW, 1);
          movementW += SUPPLY_V * spec.extra * load;
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
        const seconds = (now - sess.start) / 1000;

        setSamples((p) => [...(p.length >= BUFFER_LEN ? p.slice(1) : p), w]);
        setDisplayW(w);
        setVelSnap({ ...vel });
        setStats({
          seconds,
          peakW: sess.peakW,
          avgW: seconds > 0.5 ? sess.energyJ / seconds : w,
          energyWh: sess.energyJ / 3600,
        });
        lastTick = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const resetSession = () => {
    session.current = freshSession();
    setSamples(Array(BUFFER_LEN).fill(smoothedW.current));
    setStats({ seconds: 0, peakW: smoothedW.current, avgW: smoothedW.current, energyWh: 0 });
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
          <PowerChart samples={samples} peakW={stats.peakW} />
        </div>

        {/* ── Per-group breakdown ───────────────────────────── */}
        <div className="flex flex-col gap-2.5">
          <span style={T_LABEL}>By group</span>
          {GROUPS.map((g) => {
            const { idleW, moveW, totalW } = calcGroupW(g.keys, velSnap);
            const spec = SERVO_TYPE[g.keys[0]];
            const gMax = g.keys.length * SUPPLY_V * (spec.idle + spec.extra);
            return (
              <div key={g.label} className="flex flex-col gap-1">
                <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3">
                  <span style={{ ...T_LABEL, color: g.color }}>{g.label}</span>
                  <span style={T_LABEL}>{g.model}</span>
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
                />
              </div>
            );
          })}
        </div>

        {/* ── Servo specs ───────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Legs × 8", model: "SG995", detail: "2 A stall", color: C_VAL },
            { label: "Arms × 6", model: "S3003", detail: "0.6 A stall", color: C_ARMS },
            { label: "Bus", model: `${SUPPLY_V.toFixed(1)} V`, detail: "fixed", color: C_PEAK },
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
