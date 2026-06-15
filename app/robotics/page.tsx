"use client";

import { useState, useCallback, useRef, useLayoutEffect, useEffect } from "react";

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
  type JointAngles,
} from "@/components/hud/panels/ServoSliders";
import { PowerConsumption } from "@/components/hud/panels/PowerConsumption";
import { ROBOTICS_TASKS } from "@/lib/hud-data";
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

function FreeRTOSPanel() {
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
    <HudPanel title="FreeRTOS · ESP32-C3" status="online" cornerBrackets className="h-full">
      <div className="flex h-full flex-col gap-2 overflow-auto p-3">
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

// ─── Panel content ────────────────────────────────────────────────────────────

function PanelContent({
  id,
  jointAngles,
  onJointAnglesChange,
}: {
  id: PanelId;
  jointAngles: JointAngles;
  onJointAnglesChange: (angles: JointAngles) => void;
}) {
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
      return <FreeRTOSPanel />;

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

    case "servo-control":
      return <ServoSliders angles={jointAngles} onChange={onJointAnglesChange} />;

    case "power-draw":
      return <PowerConsumption angles={jointAngles} />;

    default:
      return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoboticsPage() {
  const [panels, setPanels] = useState<PanelRect[]>(INITIAL_PANELS);
  const [bgPos, setBgPos] = useState("0px 0px");
  const [jointAngles, setJointAngles] = useState<JointAngles>(DEFAULT_JOINT_ANGLES);
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

  return (
    <div className="flex h-screen flex-col gap-2 overflow-hidden p-2">
      {/* ── Header ─────────────────────────────────────────────────── */}
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

      {/* ── Canvas ─────────────────────────────────────────────────── */}
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
            <PanelContent
              id={panel.id}
              jointAngles={jointAngles}
              onJointAnglesChange={setJointAngles}
            />
          </FloatingPanel>
        ))}
      </div>
    </div>
  );
}
