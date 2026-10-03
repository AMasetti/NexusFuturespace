"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useIsMobile } from "@/lib/use-is-mobile";
import { MobileScrollLayout } from "@/components/hud/panels/MobileScrollLayout";

import {
  HudBadge,
  HudLabel,
  HudPanel,
  HudSeparator,
  HudStatusDot,
  HudProgressBar,
  MujocoViewer,
  MujocoInfoPanel,
} from "@/components/hud";
import { GlassSidebar, type GlassSection } from "@/components/hud/panels/GlassSidebar";
import { PanelLeft, PanelRight } from "lucide-react";
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
import { RobotWsProvider, useRobotWs } from "@/lib/robot-ws";
import { type PanelId } from "@/lib/panels";
import {
  loadCamera,
  saveCamera,
  loadJoints,
  saveJoints,
  loadSidebarOpen,
  saveSidebarOpen,
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
  onCopyPose,
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
  onCopyPose: () => void;
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
      const isConnected = rosStatus === "connected" || robotConnected;
      const isOverride = controlMode === "override";
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
                <div className="flex items-center gap-1">
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

// ─── Draggable 3D viewer ──────────────────────────────────────────────────────

/**
 * 3D viewer whose parts can be grabbed and dragged to turn the servo behind
 * them. Same rule as the sliders: free while offline, override-only once a
 * robot is connected; releasing commits the pose like releasing a slider.
 */
function DraggableViewer({
  jointAngles,
  onJointAnglesChange,
  onJointAnglesCommit,
  controlMode,
  robotConnected,
  autoRotate,
  initialCamera,
}: {
  jointAngles: JointAngles;
  onJointAnglesChange: (angles: JointAngles) => void;
  onJointAnglesCommit: (angles: JointAngles) => void;
  controlMode: "observe" | "override";
  robotConnected: boolean;
  autoRotate: boolean;
  initialCamera: CameraState | null;
}) {
  const rosStatus = useRosStatus();
  const canDrive = !(rosStatus === "connected" || robotConnected) || controlMode === "override";

  return (
    <MujocoViewer
      compact
      autoRotate={autoRotate}
      jointAngles={jointAngles}
      initialCamera={initialCamera}
      onCameraChange={saveCamera}
      onJointDrag={
        canDrive ? (key, rad) => onJointAnglesChange({ ...jointAngles, [key]: rad }) : undefined
      }
      onJointDragEnd={
        canDrive ? (key, rad) => onJointAnglesCommit({ ...jointAngles, [key]: rad }) : undefined
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

// ─── Direct firmware-rl WebSocket sync ───────────────────────────────────────

// UI joint name → firmware-rl joint key.
const JOINT_MAP: [keyof JointAngles, string][] = [
  ["Servo-Hip-L", "l_hip_roll"],
  ["Servo-Knee-L-Top", "l_hip_pitch"],
  ["Servo-Knee-L-Bottom", "l_knee"],
  ["Servo-Ankle-L", "l_ankle_roll"],
  ["Servo-Hip-R", "r_hip_roll"],
  ["Servo-Knee-R-Top", "r_hip_pitch"],
  ["Servo-Knee-R-Bottom", "r_knee"],
  ["Servo-Ankle-R", "r_ankle_roll"],
  ["Servo-Showlder-L-Front-Back", "l_shoulder_fb"],
  ["Servo-Showlder-R-Front-Back", "r_shoulder_fb"],
  ["Servo-Showlder-L-Inward-Outward", "l_shoulder_lat"],
  ["Servo-Showlder-R-Inward-Outward", "r_shoulder_lat"],
  ["Servo-Forearm-L", "l_forearm_lat"],
  ["Servo-Forearm-R", "r_forearm_lat"],
];

/**
 * Bridges firmware-rl WebSocket state into the UI joint/IMU state.
 * In observe mode: mirrors live joint positions into jointAngles.
 * In override mode: sends slider commits as set_joints commands.
 */
function RobotWsSync({
  committedAngles,
  controlMode,
  onJointAnglesChange,
  onRobotConnectedChange,
}: {
  committedAngles: JointAngles;
  controlMode: "observe" | "override";
  onJointAnglesChange: (a: JointAngles) => void;
  onRobotConnectedChange: (connected: boolean) => void;
}) {
  const { status, state, sendJoints } = useRobotWs();

  useEffect(() => {
    const connected = status === "connected";
    onRobotConnectedChange(connected);
  }, [status, onRobotConnectedChange]);

  // Observe: mirror live joint positions into sliders whenever NOT in override.
  useEffect(() => {
    if (controlMode === "override" || !state) return;
    const fw = state.joints;
    onJointAnglesChange({
      "Servo-Hip-L": fw.l_hip_roll,
      "Servo-Knee-L-Top": fw.l_hip_pitch,
      "Servo-Knee-L-Bottom": fw.l_knee,
      "Servo-Ankle-L": fw.l_ankle_roll,
      "Servo-Hip-R": fw.r_hip_roll,
      "Servo-Knee-R-Top": fw.r_hip_pitch,
      "Servo-Knee-R-Bottom": fw.r_knee,
      "Servo-Ankle-R": fw.r_ankle_roll,
      "Servo-Showlder-L-Front-Back": fw.l_shoulder_fb,
      "Servo-Showlder-R-Front-Back": fw.r_shoulder_fb,
      "Servo-Showlder-L-Inward-Outward": fw.l_shoulder_lat,
      "Servo-Showlder-R-Inward-Outward": fw.r_shoulder_lat,
      "Servo-Forearm-L": fw.l_forearm_lat,
      "Servo-Forearm-R": fw.r_forearm_lat,
    });
  }, [state, controlMode, onJointAnglesChange]);

  // Override: send slider commits to robot only when user has taken control.
  const prevRef = useRef<JointAngles | null>(null);
  useEffect(() => {
    if (status !== "connected" || controlMode !== "override") {
      prevRef.current = null;
      return;
    }
    const prev = prevRef.current;
    prevRef.current = committedAngles;
    if (!prev) return; // skip first render after taking control

    const all: Record<string, number> = {};
    for (const [uiKey, fwKey] of JOINT_MAP) {
      all[fwKey] = committedAngles[uiKey];
    }
    sendJoints(all);
  }, [committedAngles, status, controlMode, sendJoints]);

  return null;
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
  const [jointAngles, setJointAngles] = useState<JointAngles>(DEFAULT_JOINT_ANGLES);
  // committedAngles only updates on pointerUp — this is what gets published to the robot.
  const [committedAngles, setCommittedAngles] = useState<JointAngles>(DEFAULT_JOINT_ANGLES);
  const [controlMode, setControlMode] = useState<"observe" | "override">("observe");
  const [robotConnected, setRobotConnected] = useState(false);
  const handleTakeControl = () => setControlMode("override");
  const handleReleaseControl = () => setControlMode("observe");

  const handleCopyPose = () => {
    // Map UI joint key → config.h define name and firmware key
    const MAP: { uiKey: keyof JointAngles; define: string; fwKey: string }[] = [
      { uiKey: "Servo-Hip-L", define: "SERVO_OFFSET_DEG_L_HIP_ROLL", fwKey: "l_hip_roll" },
      { uiKey: "Servo-Knee-L-Top", define: "SERVO_OFFSET_DEG_L_HIP_PITCH", fwKey: "l_hip_pitch" },
      { uiKey: "Servo-Knee-L-Bottom", define: "SERVO_OFFSET_DEG_L_KNEE", fwKey: "l_knee" },
      { uiKey: "Servo-Ankle-L", define: "SERVO_OFFSET_DEG_L_ANKLE_ROLL", fwKey: "l_ankle_roll" },
      { uiKey: "Servo-Hip-R", define: "SERVO_OFFSET_DEG_R_HIP_ROLL", fwKey: "r_hip_roll" },
      { uiKey: "Servo-Knee-R-Top", define: "SERVO_OFFSET_DEG_R_HIP_PITCH", fwKey: "r_hip_pitch" },
      { uiKey: "Servo-Knee-R-Bottom", define: "SERVO_OFFSET_DEG_R_KNEE", fwKey: "r_knee" },
      { uiKey: "Servo-Ankle-R", define: "SERVO_OFFSET_DEG_R_ANKLE_ROLL", fwKey: "r_ankle_roll" },
      {
        uiKey: "Servo-Showlder-L-Front-Back",
        define: "ARM_SERVO_OFFSET_DEG_L_SHOULDER_FB",
        fwKey: "l_shoulder_fb",
      },
      {
        uiKey: "Servo-Showlder-R-Front-Back",
        define: "ARM_SERVO_OFFSET_DEG_R_SHOULDER_FB",
        fwKey: "r_shoulder_fb",
      },
      {
        uiKey: "Servo-Showlder-L-Inward-Outward",
        define: "ARM_SERVO_OFFSET_DEG_L_SHOULDER_LAT",
        fwKey: "l_shoulder_lat",
      },
      {
        uiKey: "Servo-Showlder-R-Inward-Outward",
        define: "ARM_SERVO_OFFSET_DEG_R_SHOULDER_LAT",
        fwKey: "r_shoulder_lat",
      },
      {
        uiKey: "Servo-Forearm-L",
        define: "ARM_SERVO_OFFSET_DEG_L_FOREARM_LAT",
        fwKey: "l_forearm_lat",
      },
      {
        uiKey: "Servo-Forearm-R",
        define: "ARM_SERVO_OFFSET_DEG_R_FOREARM_LAT",
        fwKey: "r_forearm_lat",
      },
    ];
    const RAD2DEG = 180 / Math.PI;
    const lines = MAP.map(({ uiKey, define }) => {
      const rad = jointAngles[uiKey];
      const deg = parseFloat((rad * RAD2DEG).toFixed(2));
      const val = deg >= 0 ? `(+${deg}f)` : `(${deg}f)`;
      return `#define ${define.padEnd(38)} ${val}`;
    });
    const text = "// Copy Pose — paste into firmware-rl/include/config.h\n" + lines.join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    alert(text);
  };
  const [initialCamera, setInitialCamera] = useState<CameraState | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const toggleLeft = () => {
    saveSidebarOpen("left", !leftOpen);
    setLeftOpen(!leftOpen);
  };
  const toggleRight = () => {
    saveSidebarOpen("right", !rightOpen);
    setRightOpen(!rightOpen);
  };

  // Load persisted camera and joints after first mount (localStorage is client-only).
  // useLayoutEffect runs before paint, so the restored pose shows without a flash.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialCamera(loadCamera());
    const savedJoints = loadJoints();
    if (savedJoints) setJointAngles(savedJoints);
    setLeftOpen(loadSidebarOpen("left") ?? true);
    setRightOpen(loadSidebarOpen("right") ?? true);
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

  const isMobile = useIsMobile();

  const panelContentProps = {
    jointAngles,
    onJointAnglesChange: setJointAngles,
    onJointAnglesCommit: setCommittedAngles,
    controlMode,
    robotConnected,
    onTakeControl: handleTakeControl,
    onReleaseControl: handleReleaseControl,
    onCopyPose: handleCopyPose,
  };

  const panelSection = (id: PanelId, extra?: Partial<GlassSection>): GlassSection => ({
    id,
    ...extra,
    content: (collapsed, onToggle) => (
      <PanelContent id={id} {...panelContentProps} collapsed={collapsed} onToggle={onToggle} />
    ),
  });

  const leftSections: GlassSection[] = [
    panelSection("power-draw"),
    panelSection("imu-live"),
    {
      id: "mujoco",
      content: (collapsed, onToggle) => (
        <MujocoInfoPanel
          autoRotate={autoRotate}
          onToggleRotate={() => setAutoRotate((r) => !r)}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      ),
    },
  ];

  const rightSections: GlassSection[] = [
    panelSection("system-metrics"),
    panelSection("servo-control"),
  ];

  const robotHost = process.env.NEXT_PUBLIC_ROBOT_HOST ?? "optimus.local";

  return (
    <RobotWsProvider host={robotHost}>
      <RosProvider>
        <RobotWsSync
          committedAngles={committedAngles}
          controlMode={controlMode}
          onJointAnglesChange={setJointAngles}
          onRobotConnectedChange={setRobotConnected}
        />
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

        {/* ── Desktop layout: glass sidebars around the 3D viewer ─────── */}
        {isMobile !== true && (
          <div className="glass-backdrop flex h-screen flex-col gap-3 overflow-hidden p-3">
            {/* ── TLS cert trust prompt ─────────────────────────────────── */}
            <TrustCertBanner />
            {/* ── Header ───────────────────────────────────────────────── */}
            <header className="glass-panel flex shrink-0 items-center justify-between rounded-2xl px-3 py-2">
              <div className="flex items-center gap-3">
                <SidebarToggle side="left" open={leftOpen} onClick={toggleLeft} />
                <HudStatusDot status="online" size="md" pulse />
                <span className="font-display text-hud-primary text-xl font-bold tracking-[0.25em] uppercase">
                  Nexus Robotics
                </span>
                <HudBadge variant="info" label="PROTO-02" size="sm" />
              </div>
              <SidebarToggle side="right" open={rightOpen} onClick={toggleRight} />
            </header>

            <div className="flex min-h-0 flex-1 gap-3">
              <GlassSidebar side="left" open={leftOpen} sections={leftSections} />

              <main className="glass-panel relative min-w-0 flex-1 overflow-hidden rounded-3xl">
                <DraggableViewer
                  jointAngles={jointAngles}
                  onJointAnglesChange={setJointAngles}
                  onJointAnglesCommit={setCommittedAngles}
                  controlMode={controlMode}
                  robotConnected={robotConnected}
                  autoRotate={autoRotate}
                  initialCamera={initialCamera}
                />
              </main>

              <GlassSidebar side="right" open={rightOpen} sections={rightSections} />
            </div>
          </div>
        )}
      </RosProvider>
    </RobotWsProvider>
  );
}
