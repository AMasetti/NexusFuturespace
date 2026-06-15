"use client";

import { useState, useCallback, useRef, useLayoutEffect } from "react";

import {
  HudPanel,
  HudBadge,
  HudLabel,
  HudSeparator,
  HudStatusDot,
  GaugeCircle,
  WaveformBar,
  HudProgressBar,
  LiveCounter,
  MiniBarChart,
  TopographyMap,
  MujocoViewer,
} from "@/components/hud";
import { FloatingPanel } from "@/components/hud/panels/FloatingPanel";
import {
  ServoSliders,
  DEFAULT_JOINT_ANGLES,
  type JointAngles,
} from "@/components/hud/panels/ServoSliders";
import { ROBOTICS_JOINTS, ROBOTICS_TORQUE, ROBOTICS_TASKS } from "@/lib/hud-data";
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
    case "joint-status":
      return (
        <HudPanel title="Joint Status" status="warning" cornerBrackets className="h-full">
          <div className="flex h-full flex-col gap-3 overflow-auto p-3">
            <div className="flex justify-center">
              <GaugeCircle
                value={62}
                max={180}
                label="Active Joint"
                unit="°"
                size="md"
                color="primary"
                animated
              />
            </div>
            <HudSeparator />
            <div className="flex flex-col gap-2">
              {ROBOTICS_JOINTS.map((j) => (
                <HudProgressBar
                  key={j.label}
                  label={j.label}
                  value={j.value}
                  unit="°"
                  color={j.color}
                  animated
                />
              ))}
            </div>
          </div>
        </HudPanel>
      );

    case "power-systems":
      return (
        <HudPanel title="Power Systems" status="online" cornerBrackets className="h-full">
          <div className="flex h-full flex-col gap-3 overflow-auto p-3">
            <div className="flex justify-center">
              <GaugeCircle
                value={74}
                label="Battery"
                unit="%"
                size="sm"
                color="secondary"
                animated
              />
            </div>
            <div className="flex flex-col gap-2">
              <HudProgressBar label="Voltage" value={87} unit="V" color="secondary" animated />
              <HudProgressBar label="Current Draw" value={42} unit="A" color="warning" animated />
              <HudProgressBar label="Thermal" value={61} unit="°C" color="primary" animated />
            </div>
          </div>
        </HudPanel>
      );

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

    case "motor-telemetry":
      return (
        <HudPanel title="Motor Telemetry" cornerBrackets className="h-full">
          <div className="flex h-full flex-col gap-2 overflow-auto p-3">
            <WaveformBar label="Left Drive" color="primary" animated height={40} />
            <WaveformBar label="Right Drive" color="secondary" animated height={40} />
          </div>
        </HudPanel>
      );

    case "system-metrics":
      return (
        <HudPanel title="System Metrics" status="online" cornerBrackets className="h-full">
          <div className="flex h-full flex-col gap-3 overflow-auto p-3">
            <div className="flex justify-around">
              <LiveCounter value={2847} label="Cycles" size="md" color="primary" animated />
              <LiveCounter value={98} label="Loop Hz" unit="hz" size="md" color="secondary" live />
            </div>
            <HudSeparator />
            <div className="flex flex-col gap-1">
              <HudLabel text="Joint Torque Load" variant="dim" size="xs" />
              <MiniBarChart
                data={ROBOTICS_TORQUE}
                height={70}
                color="primary"
                showLabels
                animated
              />
            </div>
            <div className="mt-1 flex flex-col gap-2">
              <HudProgressBar label="CPU Core 0" value={63} color="primary" animated />
              <HudProgressBar label="CPU Core 1" value={47} color="primary" animated />
              <HudProgressBar label="RAM" value={71} color="warning" animated />
            </div>
          </div>
        </HudPanel>
      );

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
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoboticsPage() {
  const [panels, setPanels] = useState<PanelRect[]>(INITIAL_PANELS);
  const [bgPos, setBgPos] = useState("0px 0px");
  const [jointAngles, setJointAngles] = useState<JointAngles>(DEFAULT_JOINT_ANGLES);
  const canvasRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const maxZ = useRef(10);
  const originMod = useRef({ x: 0, y: 0 }); // canvasOrigin % GRID per axis

  // Measure once (and on resize) so snap and dots share the same origin.
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
          const right = snapAligned(ia.px0 + ia.pw0 + dx, mx);
          w = Math.max(MIN_W, right - p.x);
        }
        if (ia.edge === "bottom" || ia.edge === "corner") {
          const bottom = snapAligned(ia.py0 + ia.ph0 + dy, my);
          h = Math.max(MIN_H, bottom - p.y);
        }
        return { ...p, w, h };
      })
    );
  }, []);

  const onPointerUp = useCallback(() => {
    interaction.current = null;
  }, []);

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
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "auto",
            zIndex: 0,
          }}
        >
          <MujocoViewer jointAngles={jointAngles} />
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
