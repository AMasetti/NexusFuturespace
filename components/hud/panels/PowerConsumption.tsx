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
const C_PEAK = "rgba(0,255,156,0.80)";
const C_GRID = "rgba(0,200,255,0.10)";
const C_DIM = "rgba(0,200,255,0.40)";
const C_VAL = "rgba(0,200,255,0.95)";

// ── Chart ─────────────────────────────────────────────────────────────────────
const CH_W = 240;
const CH_H = 120;

function PowerChart({ samples, peakW }: { samples: number[]; peakW: number }) {
  const toX = (i: number) => (i / (BUFFER_LEN - 1)) * CH_W;
  const toY = (w: number) => CH_H - Math.max(0, Math.min(1, w / MAX_W)) * CH_H;

  const pts = samples.map((w, i) => `${toX(i).toFixed(1)},${toY(w).toFixed(1)}`).join(" ");
  const area =
    `M${toX(0).toFixed(1)},${CH_H} ` +
    samples.map((w, i) => `L${toX(i).toFixed(1)},${toY(w).toFixed(1)}`).join(" ") +
    ` L${toX(samples.length - 1).toFixed(1)},${CH_H} Z`;

  const baselineY = toY(BASELINE_W);
  const peakY = toY(peakW);

  // Grid lines at meaningful wattage marks
  const gridMarks = [BASELINE_W, MAX_W * 0.5, MAX_W * 0.75, MAX_W].map((w) => ({
    y: toY(w),
    label: `${w.toFixed(0)}W`,
    isBaseline: w === BASELINE_W,
  }));

  return (
    <svg
      viewBox={`0 0 ${CH_W} ${CH_H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: CH_H, display: "block" }}
    >
      {/* Grid */}
      {gridMarks.map(({ y, label, isBaseline }) => (
        <g key={label}>
          <line
            x1={0}
            y1={y}
            x2={CH_W}
            y2={y}
            stroke={isBaseline ? "rgba(0,255,156,0.18)" : C_GRID}
            strokeWidth={isBaseline ? 1 : 0.7}
          />
          <text
            x={2}
            y={y - 2}
            fill={isBaseline ? "rgba(0,255,156,0.50)" : C_DIM}
            fontSize={6}
            fontFamily="var(--font-jetbrains-mono, monospace)"
          >
            {label}
          </text>
        </g>
      ))}

      {/* Baseline label on right */}
      <text
        x={CH_W - 2}
        y={baselineY - 2}
        fill="rgba(0,255,156,0.55)"
        fontSize={5.5}
        fontFamily="var(--font-jetbrains-mono, monospace)"
        textAnchor="end"
      >
        IDLE FLOOR
      </text>

      {/* Area under curve */}
      {samples.length > 1 && <path d={area} fill={C_FILL} />}

      {/* Peak dashed line */}
      {peakW > BASELINE_W + 1 && (
        <>
          <line
            x1={0}
            y1={peakY}
            x2={CH_W}
            y2={peakY}
            stroke={C_PEAK}
            strokeWidth={0.9}
            strokeDasharray="3 2"
          />
          <text
            x={CH_W - 2}
            y={peakY - 2}
            fill={C_PEAK}
            fontSize={5.5}
            fontFamily="var(--font-jetbrains-mono, monospace)"
            textAnchor="end"
          >
            PEAK
          </text>
        </>
      )}

      {/* Main waveform */}
      {samples.length > 1 && (
        <polyline
          points={pts}
          fill="none"
          stroke={C_LINE}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      )}

      {/* Live dot */}
      {samples.length > 0 && (
        <circle
          cx={toX(samples.length - 1)}
          cy={toY(samples[samples.length - 1])}
          r={2.8}
          fill={C_LINE}
        />
      )}
    </svg>
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

// ── Public component ──────────────────────────────────────────────────────────
interface PowerConsumptionProps {
  angles: JointAngles;
  /** Mobile collapse state — forwarded to the inner HudPanel. */
  collapsed?: boolean;
  /** Mobile toggle callback — forwarded to the inner HudPanel. */
  onToggle?: () => void;
}

export function PowerConsumption({ angles, collapsed, onToggle }: PowerConsumptionProps) {
  const prevAngles = useRef<JointAngles>(angles);
  const prevTime = useRef<number>(0);
  const smoothedW = useRef(BASELINE_W);
  const velocities = useRef<Partial<Record<JointKey, number>>>({});
  const anglesRef = useRef(angles);
  useLayoutEffect(() => {
    anglesRef.current = angles;
  }, [angles]);

  const [samples, setSamples] = useState<number[]>(() => Array(BUFFER_LEN).fill(BASELINE_W));
  const [peakW, setPeakW] = useState(BASELINE_W);
  const [displayW, setDisplayW] = useState(BASELINE_W);
  const [velSnap, setVelSnap] = useState<Partial<Record<JointKey, number>>>({});

  useEffect(() => {
    const intervalMs = 1000 / SAMPLE_HZ;
    const TAU_DECAY = 0.25; // velocity decay time constant (seconds)
    const ALPHA_UP = 0.4; // wattage smoothing — fast rise
    const ALPHA_DOWN = 0.1; // wattage smoothing — slow decay

    prevTime.current = performance.now();
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

        setSamples((p) => [...(p.length >= BUFFER_LEN ? p.slice(1) : p), w]);
        setPeakW((p) => Math.max(p, w));
        setDisplayW(w);
        setVelSnap({ ...vel });
        lastTick = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Auto-reset peak after 30 s idle
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setPeakW(BASELINE_W), 30_000);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [displayW]);

  const movementW = displayW - BASELINE_W;
  const movePct = (movementW / PEAK_EXTRA_W) * 100;

  const MONO: React.CSSProperties = {
    fontFamily: "var(--font-jetbrains-mono, monospace)",
    letterSpacing: "0.08em",
  };
  const LABEL: React.CSSProperties = {
    ...MONO,
    fontSize: 9,
    color: "rgba(0,200,255,0.55)",
    textTransform: "uppercase" as const,
  };
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
        {/* ── Servo model badges ─────────────────────────── */}
        <div className="flex gap-2">
          <div
            className="flex flex-col gap-0.5 rounded px-2 py-1"
            style={{ border: "1px solid rgba(0,200,255,0.18)", background: "rgba(0,200,255,0.05)" }}
          >
            <span style={{ ...MONO, fontSize: 8, color: "rgba(0,200,255,0.50)" }}>LEGS × 8</span>
            <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: "rgba(0,200,255,0.95)" }}>
              SG995
            </span>
            <span style={{ ...MONO, fontSize: 9, color: "rgba(0,200,255,0.65)" }}>
              360 mA · 2 A stall
            </span>
          </div>
          <div
            className="flex flex-col gap-0.5 rounded px-2 py-1"
            style={{
              border: "1px solid rgba(180,120,255,0.18)",
              background: "rgba(180,120,255,0.05)",
            }}
          >
            <span style={{ ...MONO, fontSize: 8, color: "rgba(180,120,255,0.50)" }}>ARMS × 6</span>
            <span
              style={{ ...MONO, fontSize: 11, fontWeight: 700, color: "rgba(180,120,255,0.95)" }}
            >
              S3003
            </span>
            <span style={{ ...MONO, fontSize: 9, color: "rgba(180,120,255,0.65)" }}>
              150 mA · 600 mA stall
            </span>
          </div>
          <div
            className="ml-auto flex flex-col items-end gap-0.5 rounded px-2 py-1"
            style={{ border: "1px solid rgba(0,255,156,0.15)", background: "rgba(0,255,156,0.04)" }}
          >
            <span style={{ ...MONO, fontSize: 8, color: "rgba(0,255,156,0.50)" }}>BUS</span>
            <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: "rgba(0,255,156,0.90)" }}>
              6.0 V
            </span>
            <span style={{ ...MONO, fontSize: 9, color: "rgba(0,255,156,0.55)" }}>fixed</span>
          </div>
        </div>

        {/* ── Big total + stats row ──────────────────────── */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <span style={LABEL}>Total draw</span>
            <span
              className="tabular-nums"
              style={{ ...MONO, fontSize: 36, fontWeight: 700, color: C_VAL, lineHeight: 1 }}
            >
              {displayW.toFixed(1)}
              <span style={{ fontSize: 16, color: "rgba(0,200,255,0.55)", marginLeft: 5 }}>W</span>
            </span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-col items-end gap-0">
              <span style={LABEL}>Movement</span>
              <span
                className="tabular-nums"
                style={{ ...MONO, fontSize: 16, fontWeight: 700, color: C_LINE }}
              >
                +{movementW.toFixed(1)} W
              </span>
            </div>
            <div className="flex flex-col items-end gap-0">
              <span style={LABEL}>Session peak</span>
              <span
                className="tabular-nums"
                style={{ ...MONO, fontSize: 16, fontWeight: 700, color: C_PEAK }}
              >
                {peakW.toFixed(1)} W
              </span>
            </div>
          </div>
        </div>

        {/* ── Load bar ───────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span style={{ ...LABEL }}>Idle floor</span>
            <span style={{ ...MONO, fontSize: 10, color: "rgba(0,255,156,0.75)", fontWeight: 700 }}>
              {BASELINE_W.toFixed(1)} W
            </span>
            <span style={LABEL}>Move +{movePct.toFixed(0)}%</span>
            <span style={{ ...MONO, fontSize: 10, color: "rgba(0,200,255,0.70)", fontWeight: 700 }}>
              max {MAX_W.toFixed(0)} W
            </span>
          </div>
          <div
            className="relative h-3 w-full overflow-hidden rounded"
            style={{ background: "rgba(0,200,255,0.06)", border: "1px solid rgba(0,200,255,0.12)" }}
          >
            {/* Idle floor */}
            <div
              className="absolute top-0 left-0 h-full"
              style={{
                width: `${(BASELINE_W / MAX_W) * 100}%`,
                background: "rgba(0,255,156,0.28)",
              }}
            />
            {/* Movement */}
            <div
              className="absolute top-0 h-full transition-none"
              style={{
                left: `${(BASELINE_W / MAX_W) * 100}%`,
                width: `${(movementW / MAX_W) * 100}%`,
                background:
                  movePct > 80
                    ? "rgba(255,90,50,0.90)"
                    : movePct > 50
                      ? "rgba(255,200,60,0.90)"
                      : "rgba(0,200,255,0.80)",
              }}
            />
            {/* Boundary tick */}
            <div
              className="absolute top-0 h-full w-0.5"
              style={{ left: `${(BASELINE_W / MAX_W) * 100}%`, background: "rgba(0,255,156,0.70)" }}
            />
          </div>
        </div>

        {/* ── Rolling chart ──────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <span style={LABEL}>5 s rolling · {SAMPLE_HZ} Hz</span>
          <PowerChart samples={samples} peakW={peakW} />
        </div>

        {/* ── Per-group breakdown ────────────────────────── */}
        <div className="flex flex-col gap-3">
          <span style={LABEL}>Group breakdown</span>
          {GROUPS.map((g) => {
            const { idleW, moveW, totalW } = calcGroupW(g.keys, velSnap);
            const gMax =
              g.keys.length * SUPPLY_V * (SERVO_TYPE[g.keys[0]].idle + SERVO_TYPE[g.keys[0]].extra);
            const idlePct = (idleW / gMax) * 100;
            const gMovePct = (moveW / gMax) * 100;
            return (
              <div key={g.label} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: g.color }}>
                    {g.label}
                  </span>
                  <span style={{ ...MONO, fontSize: 9, color: "rgba(0,200,255,0.55)" }}>
                    {g.model}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{ ...MONO, fontSize: 12, fontWeight: 700, color: g.color }}
                  >
                    {totalW.toFixed(1)} W
                  </span>
                </div>
                <div
                  className="relative h-2 w-full overflow-hidden rounded"
                  style={{
                    background: "rgba(0,200,255,0.06)",
                    border: "1px solid rgba(0,200,255,0.10)",
                  }}
                >
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{ width: `${idlePct}%`, background: g.color, opacity: 0.22 }}
                  />
                  <div
                    className="absolute top-0 h-full transition-none"
                    style={{
                      left: `${idlePct}%`,
                      width: `${gMovePct}%`,
                      background: g.color,
                      opacity: 0.9,
                    }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5"
                    style={{ left: `${idlePct}%`, background: g.color, opacity: 0.55 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </HudPanel>
  );
}
