"use client";

import React, { useRef, useEffect } from "react";
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

// Maps firmware joint names (from /optimus/joint_states and set_joint WS commands)
// to JointAngles keys. The URDF keys are legacy and don't match firmware names.
// hip_yaw is intentionally absent — no UI slider exists for it yet.
export const FIRMWARE_TO_JOINT: Record<string, keyof JointAngles> = {
  l_hip_roll: "Servo-Hip-L",
  l_hip_pitch: "Servo-Knee-L-Top",
  l_knee: "Servo-Knee-L-Bottom",
  l_ankle_roll: "Servo-Ankle-L",
  r_hip_roll: "Servo-Hip-R",
  r_hip_pitch: "Servo-Knee-R-Top",
  r_knee: "Servo-Knee-R-Bottom",
  r_ankle_roll: "Servo-Ankle-R",
  l_shoulder_fb: "Servo-Showlder-L-Front-Back",
  l_shoulder_lat: "Servo-Showlder-L-Inward-Outward",
  l_forearm_lat: "Servo-Forearm-L",
  r_shoulder_fb: "Servo-Showlder-R-Front-Back",
  r_shoulder_lat: "Servo-Showlder-R-Inward-Outward",
  r_forearm_lat: "Servo-Forearm-R",
};

// Coordinate offset applied when converting firmware rad → URDF rad stored in JointAngles.
// Firmware reports physical rad from servo center (0 = halt for all joints).
// URDF stores rad relative to mesh neutral, which differs for shoulder lat:
//   mesh neutral = arms horizontal = 0 URDF rad; arms-down (halt) = −π/2 URDF rad.
// So: urdf_rad = firmware_rad + FIRMWARE_TO_URDF_OFFSET[name]
export const FIRMWARE_TO_URDF_OFFSET: Partial<Record<string, number>> = {
  l_shoulder_lat: -Math.PI / 2,
  r_shoulder_lat: -Math.PI / 2,
};

export const JOINT_TO_FIRMWARE = Object.fromEntries(
  Object.entries(FIRMWARE_TO_JOINT).map(([fw, ui]) => [ui, fw])
) as Partial<Record<keyof JointAngles, string>>;

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
  /** Called when the user releases a slider or double-clicks to reset — use to send commands to the robot. */
  onCommit?: (angles: JointAngles) => void;
  readOnly?: boolean;
  headerExtra?: React.ReactNode;
  /** Mobile collapse state — forwarded to the inner HudPanel. */
  panelCollapsed?: boolean;
  /** Mobile toggle callback — forwarded to the inner HudPanel. */
  panelOnToggle?: () => void;
}

function JointSlider({
  label,
  sublabel,
  valueDeg,
  onChange,
  onCommit,
  readOnly = false,
}: {
  label: string;
  sublabel: string;
  valueDeg: number;
  onChange: (deg: number) => void;
  onCommit: (deg: number) => void;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  // iOS Safari doesn't fire React's synthetic onChange during touch drag.
  // Attach native listeners directly on the DOM node instead.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleInput = () => onChange(Number(el.value));
    const handleChange = () => onCommit(Number(el.value));

    el.addEventListener("input", handleInput);
    el.addEventListener("change", handleChange);
    return () => {
      el.removeEventListener("input", handleInput);
      el.removeEventListener("change", handleChange);
    };
  }, [onChange, onCommit]);

  // Sync DOM value when parent resets or updates from outside (e.g. Reset button).
  useEffect(() => {
    const el = ref.current;
    if (el && Number(el.value) !== valueDeg) el.value = String(valueDeg);
  }, [valueDeg]);

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

      <input
        ref={ref}
        type="range"
        min={0}
        max={180}
        step={1}
        defaultValue={valueDeg}
        disabled={readOnly}
        className="hud-range-input w-full"
      />
    </div>
  );
}

export function ServoSliders({
  angles,
  onChange,
  onCommit,
  readOnly = false,
  headerExtra,
  panelCollapsed,
  panelOnToggle,
}: ServoSlidersProps) {
  const [collapsed, setCollapsed] = React.useState<Record<number, boolean>>({});

  const setJoint = (key: keyof JointAngles, displayDeg: number, haltRad = 0, scale = 1) => {
    if (readOnly) return;
    onChange({ ...angles, [key]: haltRad + (displayDeg - 90) * D * scale });
  };

  const commitJoint = (key: keyof JointAngles, displayDeg: number, haltRad = 0, scale = 1) => {
    if (readOnly) return;
    const next = { ...angles, [key]: haltRad + (displayDeg - 90) * D * scale };
    onChange(next);
    onCommit?.(next);
  };

  const toDisplay = (urdfRad: number, haltRad = 0, scale = 1) =>
    Math.max(0, Math.min(180, Math.round(90 + ((urdfRad - haltRad) / D) * scale)));

  const resetAll = () => {
    onChange({ ...DEFAULT_JOINT_ANGLES });
    onCommit?.({ ...DEFAULT_JOINT_ANGLES });
  };

  const toggle = (gi: number) => setCollapsed((prev) => ({ ...prev, [gi]: !prev[gi] }));

  return (
    <HudPanel
      title="Servo Control"
      status="online"
      cornerBrackets
      className="h-full"
      collapsed={panelCollapsed}
      onToggle={panelOnToggle}
    >
      <div className="flex flex-col gap-3 overflow-auto p-3">
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
                      onCommit={(deg) => commitJoint(key, deg, haltRad, scale)}
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
