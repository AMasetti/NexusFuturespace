"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useIsMobile } from "@/lib/use-is-mobile";
import { MobileScrollLayout } from "@/components/hud/panels/MobileScrollLayout";

import {
  HudBadge,
  HudPanel,
  HudSeparator,
  HudStatusDot,
  MujocoViewer,
  ModelInfoPanel,
  type ModelInfo,
} from "@/components/hud";
import { GlassSidebar, type GlassSection } from "@/components/hud/panels/GlassSidebar";
import { Check, ChevronDown, PanelLeft, PanelRight } from "lucide-react";
import { ServoControl } from "@/components/hud/panels/ServoControl";
import { PowerConsumption } from "@/components/hud/panels/PowerConsumption";
import { PoseTimeline } from "@/components/hud/panels/PoseTimeline";
import {
  exportSequence,
  parseSequence,
  poseTimes,
  sampleAt,
  singlePoseSequence,
  totalDuration,
  type Sequence,
} from "@/lib/sequence";
import { RosProvider, useRosTopic, useRosStatus, useRosPublish } from "@/lib/ros";
import { RobotWsProvider, useRobotWs } from "@/lib/robot-ws";
import { useRobotDefs } from "@/lib/use-robot-defs";
import {
  canCopyPose,
  hasImu,
  hasPower,
  hasRtos,
  hasLink,
  zeroAngles,
  type McuDef,
  type RobotDef,
  type ServoAngles,
} from "@/lib/robot-def";
import {
  loadCamera,
  saveCamera,
  loadServoAngles,
  loadSequenceRaw,
  saveSequenceRaw,
  loadSidebarOpen,
  saveSidebarOpen,
  loadRobot,
  saveRobot,
  type CameraState,
} from "@/lib/persist";

// ─── FreeRTOS process monitor panel ──────────────────────────────────────────

// Task/peripheral colours, assigned in file order; the idle task is dimmed.
const RTOS_COLORS = [
  "rgba(0,220,255,0.90)",
  "rgba(0,255,156,0.90)",
  "rgba(180,100,255,0.90)",
  "rgba(255,190,90,0.90)",
];
const RTOS_IDLE = "rgba(0,200,255,0.40)";

function FreeRTOSPanel({
  mcu,
  collapsed,
  onToggle,
}: {
  mcu: McuDef;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const rtos = mcu.rtos!;
  const RTOS_TASKS = rtos.tasks.map((t, i) => ({
    ...t,
    color: t.hz > 0 ? RTOS_COLORS[i % RTOS_COLORS.length] : RTOS_IDLE,
  }));
  const PERIPHERALS = (rtos.peripherals ?? []).map((p, i) => ({
    ...p,
    color: RTOS_COLORS[i % RTOS_COLORS.length],
  }));
  const cycleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const counters = useRef<number[]>(rtos.tasks.map(() => 0));

  useEffect(() => {
    const id = setInterval(() => {
      rtos.tasks.forEach((task, i) => {
        counters.current[i] += task.hz > 0 ? task.hz : Math.random() < 0.3 ? 1 : 0;
        const el = cycleRefs.current[i];
        if (el) el.textContent = counters.current[i].toLocaleString();
      });
    }, 100);
    return () => clearInterval(id);
  }, [rtos.tasks]);

  return (
    <HudPanel
      title={`FreeRTOS · ${mcu.model}`}
      status="online"
      cornerBrackets
      className="h-full"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-2 overflow-auto p-3">
        {/* MCU header */}
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono font-bold"
            style={{ fontSize: 11, color: "rgba(0,220,255,0.95)", letterSpacing: "0.12em" }}
          >
            {[mcu.model, mcu.detail].filter(Boolean).join(" · ").toUpperCase()}
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 9, color: "rgba(0,200,255,0.45)", letterSpacing: "0.10em" }}
          >
            {rtos.version ? `RTOS ${rtos.version}` : "RTOS"}
          </span>
        </div>

        <HudSeparator />

        {/* Peripherals */}
        <div className="flex flex-col gap-1">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, color: "rgba(0,200,255,0.45)", letterSpacing: "0.14em" }}
          >
            {["Peripherals", rtos.bus].filter(Boolean).join(" · ")}
          </span>
          <div className="flex gap-3">
            {PERIPHERALS.map((p) => (
              <div key={p.name} className="flex flex-col gap-0.5">
                <span className="font-mono font-bold" style={{ fontSize: 11, color: p.color }}>
                  {p.name}
                </span>
                <span className="font-mono" style={{ fontSize: 9, color: "rgba(0,200,255,0.45)" }}>
                  {p.bus} · {p.hz} Hz
                </span>
              </div>
            ))}
          </div>
        </div>

        <HudSeparator />

        {/* Task rows */}
        <div className="flex flex-col gap-2">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, color: "rgba(0,200,255,0.45)", letterSpacing: "0.14em" }}
          >
            Tasks
          </span>
          {RTOS_TASKS.map((task, i) => (
            <div key={task.name} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-mono font-bold"
                    style={{ fontSize: 12, color: task.color, letterSpacing: "0.08em" }}
                  >
                    {task.name}
                  </span>
                  <span
                    className="font-mono"
                    style={{ fontSize: 9, color: "rgba(0,200,255,0.40)" }}
                  >
                    pri:{task.priority} · {task.stackKB}KB
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  {task.hz > 0 && (
                    <span
                      className="font-mono font-bold"
                      style={{ fontSize: 11, color: task.color }}
                    >
                      {task.hz} Hz
                    </span>
                  )}
                  <span
                    ref={(el) => {
                      cycleRefs.current[i] = el;
                    }}
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: 9,
                      color: "rgba(0,200,255,0.45)",
                      minWidth: 52,
                      textAlign: "right",
                    }}
                  >
                    0
                  </span>
                </div>
              </div>
              {/* Load bar */}
              <div
                className="h-1 w-full overflow-hidden rounded-full"
                style={{ background: "rgba(0,200,255,0.12)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(task.load * 100)}%`,
                    background: task.color,
                    opacity: 0.75,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <HudSeparator />

        {rtos.notes && rtos.notes.length > 0 && (
          <div className="flex items-baseline justify-between gap-2">
            {rtos.notes.map((note, i) => (
              <span
                key={note}
                className="font-mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.10em",
                  color: i === 0 ? "rgba(0,200,255,0.40)" : "rgba(0,255,156,0.55)",
                }}
              >
                {note}
              </span>
            ))}
          </div>
        )}
      </div>
    </HudPanel>
  );
}

// ─── IMU live panel ───────────────────────────────────────────────────────────

function AxisBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(Math.abs(value) / max, 1) * 100;
  const sign = value >= 0 ? "+" : "−";
  return (
    <div className="flex items-center gap-2">
      <span
        className="font-mono tabular-nums"
        style={{ fontSize: 11, color: "rgba(0,200,255,0.65)", width: 12, textAlign: "right" }}
      >
        {sign}
      </span>
      <div
        className="relative h-2 flex-1 overflow-hidden rounded-full"
        style={{ background: "rgba(0,200,255,0.12)" }}
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span
        className="font-mono tabular-nums"
        style={{ fontSize: 12, color, width: 46, textAlign: "right", fontWeight: 700 }}
      >
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function ImuLivePanel({
  model,
  collapsed,
  onToggle,
}: {
  model: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const { status: wsStatus, state: wsState } = useRobotWs();
  const isLive = wsStatus === "connected" && wsState !== null;

  const pitch = wsState?.imu.pitch ?? 0;
  const roll = wsState?.imu.roll ?? 0;
  const yawRate = wsState?.imu.yaw_rate ?? 0;
  const ax = 0;
  const ay = 0;
  const az = 0;
  const gx = wsState?.imu.gx ?? 0;
  const gy = wsState?.imu.gy ?? 0;
  const gz = wsState?.imu.gz ?? 0;

  const toDeg = (r: number) => ((r * 180) / Math.PI).toFixed(1);

  // Gravity vector arrow: rotate SVG arrow by pitch
  const arrowAngle = (pitch * 180) / Math.PI;

  return (
    <HudPanel
      title={`IMU · ${model}`}
      subtitle={isLive ? "LIVE" : "NO SIGNAL"}
      status={isLive ? "online" : "warning"}
      cornerBrackets
      className="h-full"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-2 overflow-auto p-3">
        {/* Pitch / Roll — large readout */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "PITCH", val: toDeg(pitch), color: "#00DCFF" },
            { label: "ROLL", val: toDeg(roll), color: "#00FF9C" },
          ].map(({ label, val, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded py-2"
              style={{
                background: "rgba(0,200,255,0.06)",
                border: "1px solid rgba(0,200,255,0.14)",
              }}
            >
              <span
                className="font-mono uppercase"
                style={{ fontSize: 10, color: "rgba(0,200,255,0.60)", letterSpacing: "0.18em" }}
              >
                {label}
              </span>
              <span
                className="font-mono font-bold tabular-nums"
                style={{ fontSize: 30, color, letterSpacing: "-0.02em", lineHeight: 1 }}
              >
                {val}°
              </span>
            </div>
          ))}
        </div>

        {/* Yaw rate */}
        <div
          className="flex items-center justify-between rounded px-2 py-1.5"
          style={{ background: "rgba(0,200,255,0.06)", border: "1px solid rgba(0,200,255,0.14)" }}
        >
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, color: "rgba(0,200,255,0.60)", letterSpacing: "0.14em" }}
          >
            YAW RATE
          </span>
          <div className="flex items-center gap-2">
            <span
              className="font-mono font-bold tabular-nums"
              style={{ fontSize: 16, color: "rgba(180,100,255,1.0)" }}
            >
              {((yawRate * 180) / Math.PI).toFixed(1)}°/s
            </span>
            <span className="font-mono" style={{ fontSize: 9, color: "rgba(0,200,255,0.40)" }}>
              gyro·drifts
            </span>
          </div>
        </div>

        {/* Gravity arrow */}
        <div
          className="flex items-center gap-3 rounded px-2 py-1.5"
          style={{ background: "rgba(0,200,255,0.06)", border: "1px solid rgba(0,200,255,0.14)" }}
        >
          <svg width={36} height={36} viewBox="-18 -18 36 36" style={{ flexShrink: 0 }}>
            <circle
              cx={0}
              cy={0}
              r={16}
              fill="none"
              stroke="rgba(0,200,255,0.20)"
              strokeWidth={1}
            />
            <g transform={`rotate(${arrowAngle})`}>
              <line x1={0} y1={-11} x2={0} y2={11} stroke="#00FF9C" strokeWidth={2} />
              <polygon points="0,-16 -4,-9 4,-9" fill="#00FF9C" />
            </g>
          </svg>
          <span className="font-mono" style={{ fontSize: 10, color: "rgba(0,200,255,0.55)" }}>
            gravity direction (pitch plane)
          </span>
        </div>

        <HudSeparator />

        {/* Accel bars */}
        <div className="flex flex-col gap-1.5">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, color: "rgba(0,200,255,0.65)", letterSpacing: "0.16em" }}
          >
            ACCEL m/s²
          </span>
          {[
            { label: "X", value: ax, color: "rgba(0,220,255,0.90)" },
            { label: "Y", value: ay, color: "rgba(0,255,156,0.90)" },
            { label: "Z", value: az, color: "rgba(180,100,255,0.90)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="font-mono font-bold"
                style={{ fontSize: 11, color: "rgba(0,200,255,0.70)", width: 10 }}
              >
                {label}
              </span>
              <AxisBar value={value} max={20} color={color} />
            </div>
          ))}
        </div>

        <HudSeparator />

        {/* Gyro bars */}
        <div className="flex flex-col gap-1.5">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, color: "rgba(0,200,255,0.65)", letterSpacing: "0.16em" }}
          >
            GYRO rad/s
          </span>
          {[
            { label: "X", value: gx, color: "rgba(0,220,255,0.90)" },
            { label: "Y", value: gy, color: "rgba(0,255,156,0.90)" },
            { label: "Z", value: gz, color: "rgba(180,100,255,0.90)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="font-mono font-bold"
                style={{ fontSize: 11, color: "rgba(0,200,255,0.70)", width: 10 }}
              >
                {label}
              </span>
              <AxisBar value={value} max={Math.PI} color={color} />
            </div>
          ))}
        </div>
      </div>
    </HudPanel>
  );
}

// ─── Servo control with a live robot link ─────────────────────────────────────

/**
 * Servo Control that follows the robot link: read-only while observing a
 * connected robot, editable in override (commits go to the robot) or offline.
 * Robots without a link are never "connected", so they're always editable.
 */
function LiveServoControl({
  def,
  angles,
  onAnglesChange,
  onAnglesCommit,
  controlMode,
  robotConnected,
  onTakeControl,
  onReleaseControl,
  onCopyPose,
  locked = false,
  collapsed,
  onToggle,
}: {
  def: RobotDef;
  angles: ServoAngles;
  onAnglesChange: (a: ServoAngles) => void;
  onAnglesCommit: (a: ServoAngles) => void;
  /** Timeline playback owns the pose: sliders show it but can't edit. */
  locked?: boolean;
  controlMode: "observe" | "override";
  robotConnected: boolean;
  onTakeControl: () => void;
  onReleaseControl: () => void;
  onCopyPose?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const rosStatus = useRosStatus();
  const isConnected = hasLink(def) && (rosStatus === "connected" || robotConnected);
  const isOverride = controlMode === "override";
  const canDrive = !locked && (!isConnected || isOverride);
  return (
    <ServoControl
      def={def}
      angles={angles}
      onChange={canDrive ? onAnglesChange : () => {}}
      onCommit={canDrive ? onAnglesCommit : undefined}
      readOnly={locked || (isConnected && !isOverride)}
      collapsed={collapsed}
      onToggle={onToggle}
      headerExtra={
        isConnected ? (
          isOverride ? (
            <div className="flex items-center gap-1">
              {onCopyPose && (
                <button
                  onClick={onCopyPose}
                  className="rounded px-2 py-0.5 font-mono text-[8px] tracking-widest uppercase transition-colors"
                  style={{
                    border: "1px solid rgba(0,200,255,0.40)",
                    color: "rgba(0,220,255,0.80)",
                  }}
                >
                  Copy Pose
                </button>
              )}
              <button
                onClick={onReleaseControl}
                className="rounded px-2 py-0.5 font-mono text-[8px] tracking-widest uppercase transition-colors"
                style={{
                  border: "1px solid rgba(255,100,100,0.50)",
                  color: "rgba(255,120,120,0.85)",
                }}
              >
                Release Control
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-0.5">
              <button
                onClick={onTakeControl}
                className="rounded px-2 py-0.5 font-mono text-[8px] tracking-widest uppercase transition-colors"
                style={{
                  border: `1px solid ${robotConnected ? "rgba(0,255,156,0.50)" : "rgba(255,180,0,0.50)"}`,
                  color: robotConnected ? "rgba(0,255,156,0.85)" : "rgba(255,180,0,0.85)",
                }}
              >
                Take Control
              </button>
              {!robotConnected && (
                <span className="font-mono" style={{ fontSize: 8, color: "rgba(255,180,0,0.65)" }}>
                  robot unreachable
                </span>
              )}
            </div>
          )
        ) : undefined
      }
    />
  );
}

// ─── Sidebar toggle (header) ──────────────────────────────────────────────────

function SidebarToggle({
  side,
  open,
  onClick,
}: {
  side: "left" | "right";
  open: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? PanelLeft : PanelRight;
  return (
    <button
      onClick={onClick}
      title={`${open ? "Hide" : "Show"} ${side} sidebar`}
      aria-label={`${open ? "Hide" : "Show"} ${side} sidebar`}
      aria-pressed={open}
      className={
        "rounded-xl p-2 transition-colors hover:bg-white/10 " +
        (open ? "text-hud-primary" : "text-hud-text-dim")
      }
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// ─── Robot picker (header) ────────────────────────────────────────────────────

function RobotPicker({
  robots,
  value,
  onChange,
}: {
  robots: RobotDef[];
  value: string;
  onChange: (id: string) => void;
}) {
  const ROBOTS = robots.map((r) => ({ id: r.id, name: r.name, detail: r.description }));
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = ROBOTS.find((r) => r.id === value) ?? ROBOTS[0];

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select robot"
        className="text-hud-text-bright flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs tracking-widest uppercase transition-colors hover:bg-white/10"
      >
        {current.name}
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Robot"
          className="glass-panel absolute top-full left-0 z-50 mt-2 flex w-72 flex-col gap-1 rounded-2xl p-1.5"
        >
          {ROBOTS.map((r) => {
            const active = r.id === value;
            return (
              <li key={r.id}>
                <button
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(r.id);
                    setOpen(false);
                  }}
                  className={
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors " +
                    (active ? "bg-white/10" : "hover:bg-white/5")
                  }
                >
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-hud-text-bright font-mono text-xs font-bold tracking-widest uppercase">
                      {r.name}
                    </span>
                    <span className="text-hud-text font-mono text-[10px]">{r.detail}</span>
                  </div>
                  {active && <Check className="text-hud-primary h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Draggable 3D viewer ──────────────────────────────────────────────────────

/**
 * 3D viewer whose parts can be grabbed and dragged to turn the servo behind
 * them. Same rule as the sliders: free while offline (or without a link),
 * override-only once a robot is connected; releasing commits like a slider.
 */
function DraggableViewer({
  def,
  angles,
  onAnglesChange,
  onAnglesCommit,
  controlMode,
  robotConnected,
  autoRotate,
  initialCamera,
  onModelInfo,
  locked = false,
}: {
  locked?: boolean;
  def: RobotDef;
  angles: ServoAngles;
  onAnglesChange: (a: ServoAngles) => void;
  onAnglesCommit: (a: ServoAngles) => void;
  controlMode: "observe" | "override";
  robotConnected: boolean;
  autoRotate: boolean;
  initialCamera: CameraState | null;
  onModelInfo: (info: ModelInfo) => void;
}) {
  const rosStatus = useRosStatus();
  const connected = hasLink(def) && (rosStatus === "connected" || robotConnected);
  const canDrive = !locked && (!connected || controlMode === "override");

  return (
    <MujocoViewer
      def={def}
      autoRotate={autoRotate}
      jointAngles={angles}
      initialCamera={initialCamera}
      onCameraChange={(c) => saveCamera(c, def.id)}
      onModelInfo={onModelInfo}
      onJointDrag={canDrive ? (key, rad) => onAnglesChange({ ...angles, [key]: rad }) : undefined}
      onJointDragEnd={
        canDrive ? (key, rad) => onAnglesCommit({ ...angles, [key]: rad }) : undefined
      }
    />
  );
}

// ─── TLS cert trust banner ────────────────────────────────────────────────────

function TrustCertBanner() {
  const status = useRosStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (status === "connecting") {
      timerRef.current = setTimeout(() => setShowBanner(true), 5000);
    } else {
      timerRef.current = setTimeout(() => setShowBanner(false), 0);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status]);

  if (!showBanner || dismissed) return null;

  const wsUrl = process.env.NEXT_PUBLIC_ROS_WS_URL ?? "wss://localhost:9090";
  const trustUrl = wsUrl.replace(/^wss?:\/\//, "https://").replace(/\/.*$/, "");

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-4 rounded px-3 py-2"
      style={{
        background: "rgba(255,160,0,0.08)",
        border: "1px solid rgba(255,160,0,0.40)",
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 14, color: "rgba(255,180,0,0.90)" }}>⚠</span>
        <span className="font-mono" style={{ fontSize: 11, color: "rgba(255,180,0,0.85)" }}>
          ROS bridge unreachable — browser may be blocking the self-signed TLS cert.
        </span>
        <a
          href={trustUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono underline transition-opacity hover:opacity-100"
          style={{ fontSize: 11, color: "rgba(255,200,0,0.90)", opacity: 0.85 }}
        >
          Open {trustUrl} → click Advanced → Proceed
        </a>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="font-mono"
        style={{ fontSize: 10, color: "rgba(255,180,0,0.55)" }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── Live robot link ──────────────────────────────────────────────────────────
// Mounted only for robots whose robot.json has a `link`. Servo ids are the
// firmware joint names, so angles flow both ways without any translation.

/**
 * Bridges the firmware WebSocket into the UI. Observe: mirrors live servo
 * angles into the sliders. Override: sends committed poses as set_joints.
 */
function RobotWsSync({
  def,
  committedAngles,
  controlMode,
  onAnglesChange,
  onRobotConnectedChange,
}: {
  def: RobotDef;
  committedAngles: ServoAngles;
  controlMode: "observe" | "override";
  onAnglesChange: (a: ServoAngles) => void;
  onRobotConnectedChange: (connected: boolean) => void;
}) {
  const { status, state, sendJoints } = useRobotWs();

  useEffect(() => {
    onRobotConnectedChange(status === "connected");
  }, [status, onRobotConnectedChange]);

  // Observe: mirror live joint positions into sliders whenever NOT in override.
  useEffect(() => {
    if (controlMode === "override" || !state) return;
    onAnglesChange(Object.fromEntries(def.servos.map((s) => [s.id, state.joints[s.id] ?? 0])));
  }, [state, controlMode, onAnglesChange, def]);

  // Override: send slider commits to robot only when user has taken control.
  const prevRef = useRef<ServoAngles | null>(null);
  useEffect(() => {
    if (status !== "connected" || controlMode !== "override") {
      prevRef.current = null;
      return;
    }
    const prev = prevRef.current;
    prevRef.current = committedAngles;
    if (!prev) return; // skip first render after taking control
    sendJoints({ ...committedAngles });
  }, [committedAngles, status, controlMode, sendJoints]);

  return null;
}

interface RosJointState {
  name: string[];
  position: number[];
}

/**
 * ROS side of the link (topics from robot.json). Observe: mirrors joint_states
 * into the sliders. Override: publishes changed servos on pointer-up.
 */
function RosJointSync({
  def,
  topics,
  controlMode,
  committedAngles,
  onAnglesChange,
  onRobotConnectedChange,
}: {
  def: RobotDef;
  topics: { jointStates: string; command: string; bridgeStatus: string };
  controlMode: "observe" | "override";
  committedAngles: ServoAngles;
  onAnglesChange: (a: ServoAngles) => void;
  onRobotConnectedChange: (connected: boolean) => void;
}) {
  const jointStates = useRosTopic<RosJointState>(topics.jointStates, "sensor_msgs/JointState");
  const bridgeStatus = useRosTopic<{ data: string }>(topics.bridgeStatus, "std_msgs/String");
  const publish = useRosPublish();

  useEffect(() => {
    onRobotConnectedChange(bridgeStatus?.data === "connected");
  }, [bridgeStatus, onRobotConnectedChange]);

  useEffect(() => {
    if (controlMode !== "observe" || !jointStates) return;
    const next = zeroAngles(def);
    let changed = false;
    jointStates.name.forEach((name, i) => {
      if (name in next) {
        next[name] = jointStates.position[i];
        changed = true;
      }
    });
    if (changed) onAnglesChange(next);
  }, [jointStates, controlMode, onAnglesChange, def]);

  // Override mode: publish on pointerUp (committedAngles), not on every drag tick.
  const prevCommittedRef = useRef<ServoAngles | null>(null);
  useEffect(() => {
    if (controlMode !== "override") {
      prevCommittedRef.current = null;
      return;
    }
    const prev = prevCommittedRef.current;
    prevCommittedRef.current = committedAngles;
    if (!prev) return;

    const changed = def.servos.filter((s) => committedAngles[s.id] !== prev[s.id]);
    if (changed.length > 0) {
      publish(topics.command, "sensor_msgs/JointState", {
        name: changed.map((s) => s.id),
        position: changed.map((s) => committedAngles[s.id] ?? 0),
        velocity: [],
        effort: [],
      });
    }
  }, [committedAngles, controlMode, publish, def, topics.command]);

  return null;
}

/** Wraps children in the robot link providers when the robot has one. */
function LinkProviders({ def, children }: { def: RobotDef; children: React.ReactNode }) {
  if (!def.link) return <>{children}</>;
  const host = process.env.NEXT_PUBLIC_ROBOT_HOST ?? "optimus.local";
  return (
    <RobotWsProvider host={host} port={def.link.port}>
      <RosProvider>{children}</RosProvider>
    </RobotWsProvider>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoboticsPage() {
  const { defs, errors } = useRobotDefs();
  const [robotId, setRobotId] = useState<string | null>(null);
  const def = defs?.find((d) => d.id === robotId) ?? defs?.[0] ?? null;

  const [angles, setAngles] = useState<ServoAngles>({});
  // committedAngles only updates on pointerUp — this is what gets published to the robot.
  const [committedAngles, setCommittedAngles] = useState<ServoAngles>({});
  // Which robot `angles` belong to, so a switch never saves one robot's pose under another.
  const [anglesFor, setAnglesFor] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [controlMode, setControlMode] = useState<"observe" | "override">("observe");
  const [robotConnected, setRobotConnected] = useState(false);
  const [initialCamera, setInitialCamera] = useState<CameraState | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  // Pose timeline: sliders and 3D drag edit the selected pose; playback drives `angles`.
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [selectedPose, setSelectedPose] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [timelineMsg, setTimelineMsg] = useState<string | null>(null);
  const sequenceRef = useRef<Sequence | null>(null);
  useEffect(() => {
    sequenceRef.current = sequence;
  }, [sequence]);

  const selectRobot = (id: string) => {
    saveRobot(id);
    setRobotId(id);
  };
  const toggleLeft = () => {
    saveSidebarOpen("left", !leftOpen);
    setLeftOpen(!leftOpen);
  };
  const toggleRight = () => {
    saveSidebarOpen("right", !rightOpen);
    setRightOpen(!rightOpen);
  };

  // Restore UI preferences after first mount (localStorage is client-only).
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRobotId(loadRobot());
    setLeftOpen(loadSidebarOpen("left") ?? true);
    setRightOpen(loadSidebarOpen("right") ?? true);
  }, []);

  // Whenever the robot changes: restore its sequence and camera, drop live control.
  useLayoutEffect(() => {
    if (!def) return;
    let seq: Sequence;
    try {
      const raw = loadSequenceRaw(def.id);
      // No saved sequence yet: the pose saved before timelines existed becomes pose 1.
      seq = raw
        ? parseSequence(raw, def)
        : singlePoseSequence(
            loadServoAngles(
              def.id,
              def.servos.map((s) => s.id)
            ) ?? zeroAngles(def)
          );
    } catch {
      seq = singlePoseSequence(zeroAngles(def));
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSequence(seq);
    setSelectedPose(0);
    setPlaying(false);
    setPlayTime(0);
    setTimelineMsg(null);
    setAngles(seq.poses[0].angles);
    setCommittedAngles(seq.poses[0].angles);
    setAnglesFor(def.id);
    setModelInfo(null);
    setControlMode("observe");
    setRobotConnected(false);
    setInitialCamera(loadCamera(def.id));
  }, [def]);

  // Save the sequence on change, debounced to avoid hammering localStorage on every slider tick.
  useEffect(() => {
    if (!def || !sequence || anglesFor !== def.id) return;
    const t = setTimeout(() => saveSequenceRaw(def.id, { robot: def.id, ...sequence }), 500);
    return () => clearTimeout(t);
  }, [sequence, def, anglesFor]);

  // Playback: interpolate every frame; at the end (no loop) rest on the last pose.
  useEffect(() => {
    if (!playing || !def) return;
    const ids = def.servos.map((s) => s.id);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const seq = sequenceRef.current;
      if (!seq) return;
      const total = totalDuration(seq);
      let t = (now - start) / 1000;
      if (t >= total) {
        if (seq.loop && total > 0) t %= total;
        else {
          const last = seq.poses.length - 1;
          setPlaying(false);
          setPlayTime(total);
          setSelectedPose(last);
          setAngles(seq.poses[last].angles);
          return;
        }
      }
      setPlayTime(t);
      setAngles(sampleAt(seq, t, ids));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, def]);

  const isMobile = useIsMobile();

  if (!def) {
    return (
      <div className="glass-backdrop flex h-screen items-center justify-center p-3">
        <span className="font-mono text-xs tracking-widest text-white/60 uppercase">
          {defs
            ? `No robot definitions could be loaded · ${errors.join(" · ")}`
            : "Loading robots…"}
        </span>
      </div>
    );
  }

  // ── Timeline actions ──
  const showPose = (seq: Sequence, i: number) => {
    setSelectedPose(i);
    setAngles(seq.poses[i].angles);
    setPlayTime(poseTimes(seq)[i]);
  };
  const updateSelectedPose = (a: ServoAngles) =>
    setSequence((seq) =>
      seq
        ? { ...seq, poses: seq.poses.map((p, k) => (k === selectedPose ? { ...p, angles: a } : p)) }
        : seq
    );
  /** User edits (sliders, 3D drag) change the selected pose; robot updates use setAngles. */
  const editAngles = (a: ServoAngles) => {
    setAngles(a);
    updateSelectedPose(a);
  };
  const commitAngles = (a: ServoAngles) => {
    setCommittedAngles(a);
    updateSelectedPose(a);
  };
  const exportTimeline = () => {
    if (!sequence) return;
    const blob = new Blob([JSON.stringify(exportSequence(def, sequence), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${def.id}-sequence.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importTimeline = async (file: File) => {
    try {
      const seq = parseSequence(JSON.parse(await file.text()), def);
      setSequence(seq);
      showPose(seq, 0);
      setTimelineMsg(`Imported ${seq.poses.length} poses`);
    } catch (e) {
      setTimelineMsg(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleCopyPose = canCopyPose(def)
    ? () => {
        const lines = def.servos.map((s) => {
          const deg = parseFloat((((angles[s.id] ?? 0) * 180) / Math.PI).toFixed(2));
          const val = deg >= 0 ? `(+${deg}f)` : `(${deg}f)`;
          return `#define ${(s.configDefine ?? "").padEnd(38)} ${val}`;
        });
        const target = def.link?.copyPoseTarget ?? "config.h";
        const text = `// Copy Pose — paste into ${target}\n` + lines.join("\n");
        navigator.clipboard.writeText(text).catch(() => {});
        alert(text);
      }
    : undefined;

  // ── Panels: each shows only if robot.json defines what it needs ──
  const powerSection: GlassSection | false = hasPower(def) && {
    id: "power-draw",
    content: (collapsed, onToggle) => (
      <PowerConsumption def={def} angles={angles} collapsed={collapsed} onToggle={onToggle} />
    ),
  };
  const imuSection: GlassSection | false = hasImu(def) && {
    id: "imu-live",
    content: (collapsed, onToggle) => (
      <ImuLivePanel model={def.imu!.model} collapsed={collapsed} onToggle={onToggle} />
    ),
  };
  const modelSection: GlassSection = {
    id: "model",
    content: (collapsed, onToggle) => (
      <ModelInfoPanel
        def={def}
        info={modelInfo}
        autoRotate={autoRotate}
        onToggleRotate={() => setAutoRotate((r) => !r)}
        collapsed={collapsed}
        onToggle={onToggle}
      />
    ),
  };
  const rtosSection: GlassSection | false = hasRtos(def) && {
    id: "rtos",
    content: (collapsed, onToggle) => (
      <FreeRTOSPanel mcu={def.mcu!} collapsed={collapsed} onToggle={onToggle} />
    ),
  };
  const servoSection: GlassSection = {
    id: "servo-control",
    content: (collapsed, onToggle) => (
      <LiveServoControl
        def={def}
        angles={angles}
        onAnglesChange={editAngles}
        onAnglesCommit={commitAngles}
        locked={playing}
        controlMode={controlMode}
        robotConnected={robotConnected}
        onTakeControl={() => setControlMode("override")}
        onReleaseControl={() => setControlMode("observe")}
        onCopyPose={handleCopyPose}
        collapsed={collapsed}
        onToggle={onToggle}
      />
    ),
  };
  const present = (xs: (GlassSection | false)[]) => xs.filter((x): x is GlassSection => !!x);
  const leftSections = present([powerSection, imuSection, modelSection]);
  const rightSections = present([rtosSection, servoSection]);

  const viewer = (
    <DraggableViewer
      key={def.id}
      def={def}
      angles={angles}
      onAnglesChange={editAngles}
      onAnglesCommit={commitAngles}
      controlMode={controlMode}
      robotConnected={robotConnected}
      autoRotate={autoRotate}
      initialCamera={initialCamera}
      onModelInfo={setModelInfo}
      locked={playing}
    />
  );

  return (
    <LinkProviders key={def.id} def={def}>
      {def.link && (
        <>
          <RobotWsSync
            def={def}
            committedAngles={committedAngles}
            controlMode={controlMode}
            onAnglesChange={setAngles}
            onRobotConnectedChange={setRobotConnected}
          />
          {def.link.ros && (
            <RosJointSync
              def={def}
              topics={def.link.ros}
              controlMode={controlMode}
              committedAngles={committedAngles}
              onAnglesChange={(a) => {
                setAngles(a);
                setCommittedAngles(a);
              }}
              onRobotConnectedChange={setRobotConnected}
            />
          )}
        </>
      )}

      {/* ── Mobile layout ───────────────────────────────────────────── */}
      {isMobile === true && (
        <MobileScrollLayout
          viewer={viewer}
          panels={present([
            imuSection,
            servoSection,
            rtosSection && { ...rtosSection, defaultCollapsed: true },
            powerSection && { ...powerSection, defaultCollapsed: true },
            { ...modelSection, defaultCollapsed: true },
          ]).map((s) => ({
            id: s.id,
            defaultCollapsed: s.defaultCollapsed ?? false,
            content: s.content,
          }))}
        />
      )}

      {/* ── Desktop layout: glass sidebars around the 3D viewer ─────── */}
      {isMobile !== true && (
        <div className="glass-backdrop flex h-screen flex-col gap-3 overflow-hidden p-3">
          {/* ── TLS cert trust prompt ─────────────────────────────────── */}
          {def.link?.ros && <TrustCertBanner />}
          {errors.length > 0 && (
            <div className="shrink-0 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 font-mono text-[11px] text-amber-200/90">
              Some robot definitions failed to load: {errors.join(" · ")}
            </div>
          )}
          {/* ── Header ───────────────────────────────────────────────── */}
          {/* z-30: keeps the robot menu above the sidebars, which stack later */}
          <header className="glass-panel relative z-30 flex shrink-0 items-center justify-between rounded-2xl px-3 py-2">
            <div className="flex items-center gap-3">
              <SidebarToggle side="left" open={leftOpen} onClick={toggleLeft} />
              <HudStatusDot status="online" size="md" pulse />
              <span className="font-display text-hud-primary text-xl font-bold tracking-[0.25em] uppercase">
                Nexus Robotics
              </span>
              <HudBadge variant="info" label="PROTO-02" size="sm" />
              <RobotPicker robots={defs ?? []} value={def.id} onChange={selectRobot} />
            </div>
            <SidebarToggle side="right" open={rightOpen} onClick={toggleRight} />
          </header>

          <div className="flex min-h-0 flex-1 gap-3">
            <GlassSidebar side="left" open={leftOpen} sections={leftSections} />

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <main className="glass-panel relative min-h-0 flex-1 overflow-hidden rounded-3xl">
                {viewer}
              </main>
              {sequence && (
                <PoseTimeline
                  sequence={sequence}
                  selected={selectedPose}
                  onSelect={(i, next) => showPose(next ?? sequence, i)}
                  onChange={setSequence}
                  playing={playing}
                  time={playing ? playTime : (poseTimes(sequence)[selectedPose] ?? 0)}
                  onPlay={() => {
                    setPlayTime(0);
                    setPlaying(true);
                  }}
                  onStop={() => {
                    setPlaying(false);
                    showPose(sequence, selectedPose);
                  }}
                  onExport={exportTimeline}
                  onImport={importTimeline}
                  message={timelineMsg}
                />
              )}
            </div>

            <GlassSidebar side="right" open={rightOpen} sections={rightSections} />
          </div>
        </div>
      )}
    </LinkProviders>
  );
}
