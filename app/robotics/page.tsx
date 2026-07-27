"use client";

import { useState, useCallback, useRef, useLayoutEffect, useEffect } from "react";
import { useIsMobile } from "@/lib/use-is-mobile";
import { MobileScrollLayout } from "@/components/hud/panels/MobileScrollLayout";

import {
  HudBadge,
  HudLabel,
  HudPanel,
  HudSeparator,
  HudStatusDot,
  HudProgressBar,
  TopographyMap,
  MujocoViewer,
} from "@/components/hud";
import { FloatingPanel } from "@/components/hud/panels/FloatingPanel";
import {
  ServoSliders,
  DEFAULT_JOINT_ANGLES,
  FIRMWARE_TO_JOINT,
  FIRMWARE_TO_URDF_OFFSET,
  JOINT_TO_FIRMWARE,
  type JointAngles,
} from "@/components/hud/panels/ServoSliders";
import { PowerConsumption } from "@/components/hud/panels/PowerConsumption";
import { ROBOTICS_TASKS } from "@/lib/hud-data";
import { RosProvider, useRosTopic, useRosStatus, useRosPublish } from "@/lib/ros";
import {
  type PanelId,
  type PanelRect,
  type Interaction,
  type ResizeEdge,
  GRID,
  MIN_W,
  MIN_H,
  INITIAL_PANELS,
  snapAligned,
} from "@/lib/panels";
import {
  loadPanels,
  savePanels,
  loadCamera,
  saveCamera,
  loadJoints,
  saveJoints,
  clearPersistedLayout,
  type CameraState,
} from "@/lib/persist";

// ─── FreeRTOS process monitor panel ──────────────────────────────────────────

const RTOS_TASKS = [
  { name: "imu", hz: 200, pri: 3, stack: 4096, load: 0.18, color: "rgba(0,220,255,0.90)" },
  { name: "cpg", hz: 100, pri: 2, stack: 8192, load: 0.35, color: "rgba(0,255,156,0.90)" },
  { name: "telemetry", hz: 50, pri: 1, stack: 8192, load: 0.12, color: "rgba(180,100,255,0.90)" },
  { name: "idle", hz: 0, pri: 0, stack: 1024, load: 0.35, color: "rgba(0,200,255,0.40)" },
] as const;

const PERIPHERALS = [
  { name: "MPU6050", bus: "I2C 0x68", hz: 200, color: "rgba(0,220,255,0.80)" },
  { name: "PCA9685", bus: "I2C 0x40", hz: 50, color: "rgba(0,255,156,0.80)" },
] as const;

function FreeRTOSPanel({ collapsed, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const cycleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const counters = useRef<number[]>(RTOS_TASKS.map(() => 0));

  useEffect(() => {
    const id = setInterval(() => {
      RTOS_TASKS.forEach((task, i) => {
        counters.current[i] += task.hz > 0 ? task.hz : Math.random() < 0.3 ? 1 : 0;
        const el = cycleRefs.current[i];
        if (el) el.textContent = counters.current[i].toLocaleString();
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <HudPanel
      title="FreeRTOS · ESP32-C3"
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
            ESP32-C3 · CORE 0 · 160 MHz
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 9, color: "rgba(0,200,255,0.45)", letterSpacing: "0.10em" }}
          >
            RTOS v10.5
          </span>
        </div>

        <HudSeparator />

        {/* Peripherals */}
        <div className="flex flex-col gap-1">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, color: "rgba(0,200,255,0.45)", letterSpacing: "0.14em" }}
          >
            Peripherals · I2C 400 kHz
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
                    pri:{task.pri} · {task.stack / 1024}KB
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

        {/* Servo PWM note */}
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono"
            style={{ fontSize: 9, color: "rgba(0,200,255,0.40)", letterSpacing: "0.10em" }}
          >
            PCA9685 PWM · 50 Hz · 16ch
          </span>
          <span className="font-mono" style={{ fontSize: 9, color: "rgba(0,255,156,0.55)" }}>
            WS → 10 Hz
          </span>
        </div>
      </div>
    </HudPanel>
  );
}

// ─── IMU live panel ───────────────────────────────────────────────────────────

interface ImuOrientation {
  x: number;
  y: number;
  z: number;
}
interface ImuRaw {
  linear_acceleration: { x: number; y: number; z: number };
  angular_velocity: { x: number; y: number; z: number };
}

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

function ImuLivePanel({ collapsed, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const status = useRosStatus();
  const orientation = useRosTopic<{ vector: ImuOrientation }>(
    "/optimus/imu/orientation",
    "geometry_msgs/Vector3Stamped"
  );
  const raw = useRosTopic<ImuRaw>("/optimus/imu/raw", "sensor_msgs/Imu");
  const isLive = status === "connected" && orientation !== null;

  const pitch = orientation?.vector.x ?? 0;
  const roll = orientation?.vector.y ?? 0;
  const yawRate = orientation?.vector.z ?? 0;
  const ax = raw?.linear_acceleration.x ?? 0;
  const ay = raw?.linear_acceleration.y ?? 0;
  const az = raw?.linear_acceleration.z ?? 0;
  const gx = raw?.angular_velocity.x ?? 0;
  const gy = raw?.angular_velocity.y ?? 0;
  const gz = raw?.angular_velocity.z ?? 0;

  const toDeg = (r: number) => ((r * 180) / Math.PI).toFixed(1);

  // Gravity vector arrow: rotate SVG arrow by pitch
  const arrowAngle = (pitch * 180) / Math.PI;

  return (
    <HudPanel
      title="IMU · MPU6050"
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

// ─── Panel content ────────────────────────────────────────────────────────────

function PanelContent({
  id,
  jointAngles,
  onJointAnglesChange,
  onJointAnglesCommit,
  controlMode,
  robotConnected,
  onTakeControl,
  onReleaseControl,
  collapsed,
  onToggle,
}: {
  id: PanelId;
  jointAngles: JointAngles;
  onJointAnglesChange: (angles: JointAngles) => void;
  onJointAnglesCommit: (angles: JointAngles) => void;
  controlMode: "observe" | "override";
  robotConnected: boolean;
  onTakeControl: () => void;
  onReleaseControl: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const rosStatus = useRosStatus();

  switch (id) {
    // case "joint-status":
    //   return (
    //     <HudPanel title="Joint Status" status="warning" cornerBrackets className="h-full">
    //       <div className="flex h-full flex-col gap-3 overflow-auto p-3">
    //         <div className="flex justify-center">
    //           <GaugeCircle value={62} max={180} label="Active Joint" unit="°" size="md" color="primary" animated />
    //         </div>
    //         <HudSeparator />
    //         <div className="flex flex-col gap-2">
    //           {ROBOTICS_JOINTS.map((j) => (
    //             <HudProgressBar key={j.label} label={j.label} value={j.value} unit="°" color={j.color} animated />
    //           ))}
    //         </div>
    //       </div>
    //     </HudPanel>
    //   );

    // case "power-systems":
    //   return (
    //     <HudPanel title="Power Systems" status="online" cornerBrackets className="h-full">
    //       <div className="flex h-full flex-col gap-3 overflow-auto p-3">
    //         <div className="flex justify-center">
    //           <GaugeCircle value={74} label="Battery" unit="%" size="sm" color="secondary" animated />
    //         </div>
    //         <div className="flex flex-col gap-2">
    //           <HudProgressBar label="Voltage" value={87} unit="V" color="secondary" animated />
    //           <HudProgressBar label="Current Draw" value={42} unit="A" color="warning" animated />
    //           <HudProgressBar label="Thermal" value={61} unit="°C" color="primary" animated />
    //         </div>
    //       </div>
    //     </HudPanel>
    //   );

    // case "motor-telemetry":
    //   return (
    //     <HudPanel title="Motor Telemetry" cornerBrackets className="h-full">
    //       <div className="flex h-full flex-col gap-2 overflow-auto p-3">
    //         <WaveformBar label="Left Drive" color="primary" animated height={40} />
    //         <WaveformBar label="Right Drive" color="secondary" animated height={40} />
    //       </div>
    //     </HudPanel>
    //   );

    // case "mission-status":
    //   return (
    //     <HudPanel title="Mission Status" status="online" cornerBrackets className="h-full">
    //       <div className="flex h-full flex-col gap-3 overflow-auto p-3">
    //         <div className="flex items-center justify-between">
    //           <HudBadge variant="online" label="In Progress" pulse size="sm" />
    //           <HudLabel text="OBJ 3 of 5" variant="primary" size="xs" mono />
    //         </div>
    //         <HudSeparator />
    //         <div className="flex flex-col gap-2">
    //           {ROBOTICS_TASKS.map((t) => (
    //             <HudProgressBar key={t.label} label={t.label} value={t.value} color={t.color} animated />
    //           ))}
    //         </div>
    //         <HudSeparator />
    //         <div className="flex flex-col gap-1.5">
    //           <div className="flex items-center gap-2">
    //             <HudStatusDot status="online" size="sm" />
    //             <HudLabel text="Uplink nominal" variant="dim" size="xs" mono />
    //           </div>
    //           <div className="flex items-center gap-2">
    //             <HudStatusDot status="warning" size="sm" />
    //             <HudLabel text="Left knee encoder drift" variant="dim" size="xs" mono />
    //           </div>
    //           <div className="flex items-center gap-2">
    //             <HudStatusDot status="online" size="sm" />
    //             <HudLabel text="Gait model v2.4 loaded" variant="dim" size="xs" mono />
    //           </div>
    //         </div>
    //       </div>
    //     </HudPanel>
    //   );

    case "nav-overlay":
      return (
        <HudPanel
          title="Navigation Overlay"
          subtitle="LIVE"
          status="online"
          cornerBrackets
          className="h-full"
        >
          <div className="h-full overflow-hidden p-2">
            <TopographyMap
              gridSize={10}
              contourLines
              coordinates={{ lat: "40.7489° N", lng: "73.9680° W" }}
            />
          </div>
        </HudPanel>
      );

    case "system-metrics":
      return <FreeRTOSPanel collapsed={collapsed} onToggle={onToggle} />;

    case "mission-status":
      return (
        <HudPanel title="Mission Status" status="online" cornerBrackets className="h-full">
          <div className="flex h-full flex-col gap-3 overflow-auto p-3">
            <div className="flex items-center justify-between">
              <HudBadge variant="online" label="In Progress" pulse size="sm" />
              <HudLabel text="OBJ 3 of 5" variant="primary" size="xs" mono />
            </div>
            <HudSeparator />
            <div className="flex flex-col gap-2">
              {ROBOTICS_TASKS.map((t) => (
                <HudProgressBar
                  key={t.label}
                  label={t.label}
                  value={t.value}
                  color={t.color}
                  animated
                />
              ))}
            </div>
            <HudSeparator />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <HudStatusDot status="online" size="sm" />
                <HudLabel text="Uplink nominal" variant="dim" size="xs" mono />
              </div>
              <div className="flex items-center gap-2">
                <HudStatusDot status="warning" size="sm" />
                <HudLabel text="Left knee encoder drift" variant="dim" size="xs" mono />
              </div>
              <div className="flex items-center gap-2">
                <HudStatusDot status="online" size="sm" />
                <HudLabel text="Gait model v2.4 loaded" variant="dim" size="xs" mono />
              </div>
            </div>
          </div>
        </HudPanel>
      );

    case "imu-live":
      return <ImuLivePanel collapsed={collapsed} onToggle={onToggle} />;

    case "servo-control": {
      const isConnected = rosStatus === "connected";
      const isOverride = controlMode === "override";
      // When not connected to ROS, sliders always drive the 3D viewer freely.
      const canDrive = !isConnected || isOverride;
      return (
        <ServoSliders
          angles={jointAngles}
          onChange={canDrive ? onJointAnglesChange : () => {}}
          onCommit={canDrive ? onJointAnglesCommit : undefined}
          readOnly={isConnected && !isOverride}
          panelCollapsed={collapsed}
          panelOnToggle={onToggle}
          headerExtra={
            isConnected ? (
              isOverride ? (
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
                    <span
                      className="font-mono"
                      style={{ fontSize: 8, color: "rgba(255,180,0,0.65)" }}
                    >
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

    case "power-draw":
      return <PowerConsumption angles={jointAngles} collapsed={collapsed} onToggle={onToggle} />;

    default:
      return null;
  }
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

// ─── ROS joint sync ───────────────────────────────────────────────────────────

interface RosJointState {
  name: string[];
  position: number[];
}

/**
 * Mounts inside RosProvider. In observe mode, maps /optimus/joint_states
 * (firmware names) into JointAngles (URDF keys) and drives jointAngles.
 * In override mode, publishes slider changes as /optimus/cmd/joint messages.
 */
function RosJointSync({
  controlMode,
  committedAngles,
  onJointAnglesChange,
  onRobotConnectedChange,
}: {
  controlMode: "observe" | "override";
  committedAngles: JointAngles;
  onJointAnglesChange: (a: JointAngles) => void;
  onRobotConnectedChange: (connected: boolean) => void;
}) {
  const jointStates = useRosTopic<RosJointState>("/optimus/joint_states", "sensor_msgs/JointState");
  const bridgeStatus = useRosTopic<{ data: string }>("/optimus/bridge/status", "std_msgs/String");
  const publish = useRosPublish();

  useEffect(() => {
    onRobotConnectedChange(bridgeStatus?.data === "connected");
  }, [bridgeStatus, onRobotConnectedChange]);

  // Observe mode: mirror live joint states into UI
  useEffect(() => {
    if (controlMode !== "observe" || !jointStates) return;
    const next = { ...DEFAULT_JOINT_ANGLES };
    let changed = false;
    for (let i = 0; i < jointStates.name.length; i++) {
      const fwName = jointStates.name[i];
      const key = FIRMWARE_TO_JOINT[fwName];
      if (key !== undefined) {
        const offset = FIRMWARE_TO_URDF_OFFSET[fwName] ?? 0;
        next[key] = jointStates.position[i] + offset;
        changed = true;
      }
    }
    if (changed) onJointAnglesChange(next);
  }, [jointStates, controlMode, onJointAnglesChange]);

  // Override mode: publish on pointerUp (committedAngles), not on every drag tick.
  const prevCommittedRef = useRef<JointAngles | null>(null);
  useEffect(() => {
    if (controlMode !== "override") {
      prevCommittedRef.current = null;
      return;
    }
    const prev = prevCommittedRef.current;
    prevCommittedRef.current = committedAngles;
    if (!prev) return;

    const names: string[] = [];
    const positions: number[] = [];
    for (const [uiKey, fwName] of Object.entries(JOINT_TO_FIRMWARE) as [
      keyof JointAngles,
      string,
    ][]) {
      if (committedAngles[uiKey] !== prev[uiKey]) {
        const offset = FIRMWARE_TO_URDF_OFFSET[fwName] ?? 0;
        names.push(fwName);
        positions.push(committedAngles[uiKey] - offset);
      }
    }
    if (names.length > 0) {
      publish("/optimus/cmd/joint", "sensor_msgs/JointState", {
        name: names,
        position: positions,
        velocity: [],
        effort: [],
      });
    }
  }, [committedAngles, controlMode, publish]);

  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoboticsPage() {
  const [panels, setPanels] = useState<PanelRect[]>(INITIAL_PANELS);
  const [bgPos, setBgPos] = useState("0px 0px");
  const [jointAngles, setJointAngles] = useState<JointAngles>(DEFAULT_JOINT_ANGLES);
  // committedAngles only updates on pointerUp — this is what gets published to the robot.
  const [committedAngles, setCommittedAngles] = useState<JointAngles>(DEFAULT_JOINT_ANGLES);
  const [controlMode, setControlMode] = useState<"observe" | "override">("observe");
  const [robotConnected, setRobotConnected] = useState(false);
  const handleTakeControl = () => setControlMode("override");
  const handleReleaseControl = () => setControlMode("observe");
  const [initialCamera, setInitialCamera] = useState<CameraState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const maxZ = useRef(10);
  const originMod = useRef({ x: 0, y: 0 });
  const pendingSave = useRef(false);

  // Load persisted layout after first mount (localStorage is client-only).
  // useLayoutEffect runs synchronously after DOM mutation but before paint,
  // which is the correct hook for reading localStorage to avoid a flash of
  // default positions before the persisted layout is applied.
  useLayoutEffect(() => {
    const saved = loadPanels(INITIAL_PANELS.map((p) => p.id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setPanels(saved);
    setInitialCamera(loadCamera());
    const savedJoints = loadJoints();
    if (savedJoints) setJointAngles(savedJoints);
  }, []);

  // Save joint angles on change, debounced to avoid hammering localStorage on every slider tick
  const saveJointsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveJointsTimer.current) clearTimeout(saveJointsTimer.current);
    saveJointsTimer.current = setTimeout(() => saveJoints(jointAngles), 500);
    return () => {
      if (saveJointsTimer.current) clearTimeout(saveJointsTimer.current);
    };
  }, [jointAngles]);

  useLayoutEffect(() => {
    const measure = () => {
      if (!canvasRef.current) return;
      const r = canvasRef.current.getBoundingClientRect();
      const mx = r.left % GRID;
      const my = r.top % GRID;
      originMod.current = { x: mx, y: my };
      const ox = (GRID - mx) % GRID;
      const oy = (GRID - my) % GRID;
      setBgPos(`${ox}px ${oy}px`);
      setPanels((prev) =>
        prev.map((p) => {
          const x = Math.max(0, snapAligned(p.x, mx));
          const y = Math.max(0, snapAligned(p.y, my));
          const w = Math.max(MIN_W, snapAligned(p.x + p.w, mx) - x);
          const h = Math.max(MIN_H, snapAligned(p.y + p.h, my) - y);
          return { ...p, x, y, w, h };
        })
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const bringToFront = useCallback((id: PanelId) => {
    maxZ.current += 1;
    const z = maxZ.current;
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, z } : p)));
  }, []);

  const startInteraction = useCallback(
    (e: React.PointerEvent, id: PanelId, kind: Interaction["kind"], edge?: ResizeEdge) => {
      canvasRef.current?.setPointerCapture(e.pointerId);
      const p = panels.find((p) => p.id === id)!;
      interaction.current = {
        id,
        kind,
        edge,
        mx0: e.clientX,
        my0: e.clientY,
        px0: p.x,
        py0: p.y,
        pw0: p.w,
        ph0: p.h,
      };
      bringToFront(id);
    },
    [panels, bringToFront]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const ia = interaction.current;
    if (!ia) return;
    const dx = e.clientX - ia.mx0;
    const dy = e.clientY - ia.my0;
    setPanels((prev) =>
      prev.map((p) => {
        if (p.id !== ia.id) return p;
        const { x: mx, y: my } = originMod.current;
        if (ia.kind === "drag") {
          return {
            ...p,
            x: Math.max(0, snapAligned(ia.px0 + dx, mx)),
            y: Math.max(0, snapAligned(ia.py0 + dy, my)),
          };
        }
        let w = p.w;
        let h = p.h;
        if (ia.edge === "right" || ia.edge === "corner") {
          w = Math.max(MIN_W, snapAligned(ia.px0 + ia.pw0 + dx, mx) - p.x);
        }
        if (ia.edge === "bottom" || ia.edge === "corner") {
          h = Math.max(MIN_H, snapAligned(ia.py0 + ia.ph0 + dy, my) - p.y);
        }
        return { ...p, w, h };
      })
    );
  }, []);

  const onPointerUp = useCallback(() => {
    interaction.current = null;
    pendingSave.current = true;
  }, []);

  // Save after React has committed the final panel state from the last move
  useEffect(() => {
    if (!pendingSave.current) return;
    pendingSave.current = false;
    savePanels(panels);
  }, [panels]);

  const isMobile = useIsMobile();

  const panelContentProps = {
    jointAngles,
    onJointAnglesChange: setJointAngles,
    onJointAnglesCommit: setCommittedAngles,
    controlMode,
    robotConnected,
    onTakeControl: handleTakeControl,
    onReleaseControl: handleReleaseControl,
  };

  return (
    <RosProvider>
      <RosJointSync
        controlMode={controlMode}
        committedAngles={committedAngles}
        onJointAnglesChange={(a) => {
          setJointAngles(a);
          setCommittedAngles(a);
        }}
        onRobotConnectedChange={setRobotConnected}
      />

      {/* ── Mobile layout ───────────────────────────────────────────── */}
      {isMobile === true && (
        <MobileScrollLayout
          viewer={
            <MujocoViewer
              jointAngles={jointAngles}
              initialCamera={initialCamera}
              onCameraChange={saveCamera}
              compact
            />
          }
          panels={[
            {
              id: "imu-live",
              defaultCollapsed: false,
              content: (collapsed, onToggle) => (
                <PanelContent
                  id="imu-live"
                  {...panelContentProps}
                  collapsed={collapsed}
                  onToggle={onToggle}
                />
              ),
            },
            {
              id: "servo-control",
              defaultCollapsed: false,
              content: (collapsed, onToggle) => (
                <PanelContent
                  id="servo-control"
                  {...panelContentProps}
                  collapsed={collapsed}
                  onToggle={onToggle}
                />
              ),
            },
            {
              id: "system-metrics",
              defaultCollapsed: true,
              content: (collapsed, onToggle) => (
                <PanelContent
                  id="system-metrics"
                  {...panelContentProps}
                  collapsed={collapsed}
                  onToggle={onToggle}
                />
              ),
            },
            {
              id: "power-draw",
              defaultCollapsed: true,
              content: (collapsed, onToggle) => (
                <PanelContent
                  id="power-draw"
                  {...panelContentProps}
                  collapsed={collapsed}
                  onToggle={onToggle}
                />
              ),
            },
          ]}
        />
      )}

      {/* ── Desktop layout (unchanged) ──────────────────────────────── */}
      {isMobile !== true && (
        <div className="flex h-screen flex-col gap-2 overflow-hidden p-2">
          {/* ── TLS cert trust prompt ─────────────────────────────────── */}
          <TrustCertBanner />
          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between px-1 py-0.5">
            <div className="flex items-center gap-3">
              <HudStatusDot status="online" size="md" pulse />
              <span className="font-display text-hud-primary text-xl font-bold tracking-[0.25em] uppercase">
                Nexus Robotics
              </span>
              <HudBadge variant="info" label="PROTO-02" size="sm" />
            </div>
            <div className="flex items-center gap-4">
              <HudLabel text="SECTOR-7 / LAB-B" variant="dim" size="xs" mono />
              <HudLabel text="MISSION ACTIVE" variant="secondary" size="xs" />
              <div className="bg-hud-border h-4 w-px" />
              <HudLabel text="T+04:22:17" variant="primary" size="xs" mono />
              <div className="bg-hud-border h-4 w-px" />
              <button
                onClick={() => {
                  clearPersistedLayout();
                  setPanels(INITIAL_PANELS);
                }}
                className="border-hud-border/50 text-hud-text-dim hover:border-hud-primary hover:text-hud-primary rounded px-2 py-0.5 font-mono text-[8px] tracking-widest uppercase transition-colors"
                style={{ border: "1px solid" }}
              >
                Reset Layout
              </button>
            </div>
          </div>

          {/* ── Canvas ───────────────────────────────────────────────── */}
          <div
            ref={canvasRef}
            className="relative min-h-0 flex-1 overflow-hidden select-none"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(13,74,107,0.55) 1px, transparent 1px)",
              backgroundSize: `${GRID}px ${GRID}px`,
              backgroundPosition: bgPos,
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {/* 3D robot viewer — full canvas, behind floating panels */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "auto", zIndex: 0 }}>
              <MujocoViewer
                jointAngles={jointAngles}
                initialCamera={initialCamera}
                onCameraChange={saveCamera}
              />
            </div>

            {panels.map((panel) => (
              <FloatingPanel
                key={panel.id}
                panel={panel}
                onDragStart={(e, id) => startInteraction(e, id, "drag")}
                onResizeStart={(e, id, edge) => startInteraction(e, id, "resize", edge)}
                onFocus={bringToFront}
              >
                <PanelContent id={panel.id} {...panelContentProps} />
              </FloatingPanel>
            ))}
          </div>
        </div>
      )}
    </RosProvider>
  );
}
