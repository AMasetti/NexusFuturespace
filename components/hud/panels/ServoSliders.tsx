"use client";

import React from "react";
import { HudPanel } from "../core/HudPanel";
import { HudSeparator } from "../core/HudSeparator";

export interface JointAngles {
  "Servo-Hip-L": number;
  "Servo-Hip-R": number;
  "Servo-Knee-L-Top": number;
  "Servo-Knee-R-Top": number;
  "Servo-Knee-L-Bottom": number;
  "Servo-Knee-R-Bottom": number;
  "Servo-Ankle-L": number;
  "Servo-Ankle-R": number;
  "Servo-Showlder-L-Front-Back": number;
  "Servo-Showlder-R-Front-Back": number;
  "Servo-Showlder-L-Inward-Outward": number;
  "Servo-Showlder-R-Inward-Outward": number;
  "Servo-Forearm-L": number;
  "Servo-Forearm-R": number;
}

const D = Math.PI / 180;

// All joints: display 0–180°, halt = 90° center, URDF rad = (displayDeg − 90) × D.
// Shoulder lat URDF zero is arms-horizontal (T-pose mesh neutral).
// Arms-down (halt) = −π/2 for L (axis +Z) and +π/2 for R (axis −Z).
// So their DEFAULT is set to those values so display reads 90° at halt.
const H = Math.PI / 2;
export const DEFAULT_JOINT_ANGLES: JointAngles = {
  "Servo-Hip-L": 0,
  "Servo-Hip-R": 0,
  "Servo-Knee-L-Top": 0,
  "Servo-Knee-R-Top": 0,
  "Servo-Knee-L-Bottom": 0,
  "Servo-Knee-R-Bottom": 0,
  "Servo-Ankle-L": 0,
  "Servo-Ankle-R": 0,
  "Servo-Showlder-L-Front-Back": 0,
  "Servo-Showlder-R-Front-Back": 0,
  "Servo-Showlder-L-Inward-Outward": -H, // arms-down on +Z axis = −π/2
  "Servo-Showlder-R-Inward-Outward": -H, // arms-down on −Z axis = also −π/2 (same physical rotation)
  "Servo-Forearm-L": 0,
  "Servo-Forearm-R": 0,
};

// haltRad: URDF value at halt (default 0; shoulder lat arms-down ≠ URDF zero)
// scale:   sign mapping display Δdeg → URDF Δrad (+1 for axis+Z, −1 for axis−Z)
type JointDef = {
  key: keyof JointAngles;
  label: string;
  sublabel: string;
  haltRad?: number;
  scale?: number;
};

const JOINT_GROUPS: { label: string; sublabel: string; joints: JointDef[] }[] = [
  {
    label: "LEFT LEG",
    sublabel: "ch 12–15",
    joints: [
      { key: "Servo-Hip-L", label: "Hip Roll L", sublabel: "ch 12 · hip_roll" },
      { key: "Servo-Knee-L-Top", label: "Hip Pitch L", sublabel: "ch 13 · hip_pitch" },
      { key: "Servo-Knee-L-Bottom", label: "Knee Bend L", sublabel: "ch 14 · knee" },
      { key: "Servo-Ankle-L", label: "Ankle Roll L", sublabel: "ch 15 · ankle_roll" },
    ],
  },
  {
    label: "RIGHT LEG",
    sublabel: "ch 0–3",
    joints: [
      { key: "Servo-Hip-R", label: "Hip Roll R", sublabel: "ch 3  · hip_roll" },
      { key: "Servo-Knee-R-Top", label: "Hip Pitch R", sublabel: "ch 2  · hip_pitch" },
      { key: "Servo-Knee-R-Bottom", label: "Knee Bend R", sublabel: "ch 1  · knee" },
      { key: "Servo-Ankle-R", label: "Ankle Roll R", sublabel: "ch 0  · ankle_roll" },
    ],
  },
  {
    label: "ARM LEFT",
    sublabel: "ch 7–9",
    joints: [
      {
        key: "Servo-Showlder-L-Front-Back",
        label: "Shoulder FB L",
        sublabel: "ch 7 · shoulder_fb",
      },
      // Shoulder lat: URDF zero = arms horizontal. Arms-down (halt) = −π/2 (axis+Z).
      {
        key: "Servo-Showlder-L-Inward-Outward",
        label: "Shoulder Lat L",
        sublabel: "ch 8 · shoulder_lat",
        haltRad: -H,
        scale: +1,
      },
      { key: "Servo-Forearm-L", label: "Forearm Lat L", sublabel: "ch 9 · forearm_lat" },
    ],
  },
  {
    label: "ARM RIGHT",
    sublabel: "ch 4–6",
    joints: [
      {
        key: "Servo-Showlder-R-Front-Back",
        label: "Shoulder FB R",
        sublabel: "ch 4 · shoulder_fb",
      },
      // Shoulder lat: URDF zero = arms horizontal. Arms-down (halt) = −π/2 (axis−Z, scale=−1).
      {
        key: "Servo-Showlder-R-Inward-Outward",
        label: "Shoulder Lat R",
        sublabel: "ch 5 · shoulder_lat",
        haltRad: -H,
        scale: -1,
      },
      { key: "Servo-Forearm-R", label: "Forearm Lat R", sublabel: "ch 6 · forearm_lat" },
    ],
  },
];

interface ServoSlidersProps {
  angles: JointAngles;
  onChange: (angles: JointAngles) => void;
  readOnly?: boolean;
  headerExtra?: React.ReactNode;
}

function JointSlider({
  label,
  sublabel,
  valueDeg,
  onChange,
  readOnly = false,
}: {
  label: string;
  sublabel: string;
  valueDeg: number; // 0–180, halt = 90
  onChange: (deg: number) => void;
  readOnly?: boolean;
}) {
  const pct = (valueDeg / 180) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span
            className="font-label tracking-wider uppercase"
            style={{ fontSize: 13, color: "rgba(0,220,255,0.95)", fontWeight: 700 }}
          >
            {label}
          </span>
          <span className="font-mono" style={{ fontSize: 10, color: "rgba(0,200,255,0.55)" }}>
            {sublabel}
          </span>
        </div>
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 16, fontWeight: 700, color: "rgba(0,255,200,0.95)" }}
        >
          {valueDeg}°
        </span>
      </div>
      <div className="group relative flex h-5 items-center">
        <div
          className="relative h-0.5 w-full overflow-visible rounded-full"
          style={{ background: "rgba(0,200,255,0.25)" }}
        >
          {/* Halt marker at 90° (50%) */}
          <div
            className="absolute top-1/2 h-3 w-px -translate-y-1/2"
            style={{ left: "50%", background: "rgba(0,200,255,0.65)" }}
          />
          {/* Fill from halt to current */}
          <div
            className="absolute top-0 h-full rounded-full transition-none"
            style={{
              left: `${Math.min(pct, 50)}%`,
              width: `${Math.abs(pct - 50)}%`,
              background: "rgba(0,220,255,0.80)",
            }}
          />
        </div>
        {/* Invisible range — double-click resets to halt */}
        <input
          type="range"
          min={0}
          max={180}
          step={1}
          value={valueDeg}
          onChange={(e) => !readOnly && onChange(Number(e.target.value))}
          onDoubleClick={() => !readOnly && onChange(90)}
          className={`absolute inset-0 w-full opacity-0 ${readOnly ? "cursor-not-allowed" : "cursor-pointer"}`}
        />
        {/* Custom thumb */}
        <div
          className="bg-hud-bg pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full transition-none"
          style={{ left: `${pct}%`, border: "2px solid rgba(0,220,255,0.95)" }}
        />
      </div>
    </div>
  );
}

export function ServoSliders({
  angles,
  onChange,
  readOnly = false,
  headerExtra,
}: ServoSlidersProps) {
  const [collapsed, setCollapsed] = React.useState<Record<number, boolean>>({});

  const setJoint = (key: keyof JointAngles, displayDeg: number, haltRad = 0, scale = 1) => {
    if (readOnly) return;
    onChange({ ...angles, [key]: haltRad + (displayDeg - 90) * D * scale });
  };

  const toDisplay = (urdfRad: number, haltRad = 0, scale = 1) =>
    Math.max(0, Math.min(180, Math.round(90 + ((urdfRad - haltRad) / D) * scale)));

  const resetAll = () => onChange({ ...DEFAULT_JOINT_ANGLES });

  const toggle = (gi: number) => setCollapsed((prev) => ({ ...prev, [gi]: !prev[gi] }));

  return (
    <HudPanel title="Servo Control" status="online" cornerBrackets className="h-full">
      <div className="flex h-full flex-col gap-3 overflow-auto p-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span
              className="font-label tracking-wider uppercase"
              style={{ fontSize: 13, color: "rgba(0,220,255,0.85)", fontWeight: 700 }}
            >
              Manual Override
            </span>
            <span className="font-mono" style={{ fontSize: 10, color: "rgba(0,200,255,0.55)" }}>
              dbl-click slider → halt
            </span>
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            {!readOnly && (
              <button
                onClick={resetAll}
                className="border-hud-border/60 text-hud-text-dim hover:border-hud-primary hover:text-hud-primary rounded px-2 py-0.5 font-mono text-[8px] tracking-widest uppercase transition-colors"
                style={{ border: "1px solid" }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {JOINT_GROUPS.map((group, gi) => {
          const isCollapsed = !!collapsed[gi];
          return (
            <div key={gi} className="flex flex-col gap-2">
              {/* Section header — click to collapse */}
              <button
                onClick={() => toggle(gi)}
                className="flex w-full items-center gap-2 text-left"
              >
                {/* Chevron */}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  style={{
                    flexShrink: 0,
                    color: "rgba(0,255,200,0.70)",
                    transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                  }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polyline points="2,3 5,7 8,3" />
                </svg>
                <span
                  className="font-label tracking-wider uppercase"
                  style={{ fontSize: 12, color: "rgba(0,255,200,0.90)", fontWeight: 700 }}
                >
                  {group.label}
                </span>
                <span className="font-mono" style={{ fontSize: 10, color: "rgba(0,200,255,0.55)" }}>
                  {group.sublabel}
                </span>
                {isCollapsed && (
                  <span
                    className="ml-1 font-mono"
                    style={{ fontSize: 9, color: "rgba(0,200,255,0.40)" }}
                  >
                    {group.joints.length} joints
                  </span>
                )}
                <div className="h-px flex-1" style={{ background: "rgba(0,200,255,0.20)" }} />
              </button>

              {/* Collapsible joint list */}
              {!isCollapsed && (
                <div className="flex flex-col gap-2">
                  {group.joints.map(({ key, label, sublabel, haltRad, scale }) => (
                    <JointSlider
                      key={key}
                      label={label}
                      sublabel={sublabel}
                      valueDeg={toDisplay(angles[key], haltRad, scale)}
                      onChange={(deg) => setJoint(key, deg, haltRad, scale)}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              )}

              {gi < JOINT_GROUPS.length - 1 && <HudSeparator />}
            </div>
          );
        })}
      </div>
    </HudPanel>
  );
}
