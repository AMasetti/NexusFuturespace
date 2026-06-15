"use client";

import { HudPanel } from "../core/HudPanel";
import { HudSeparator } from "../core/HudSeparator";

// Actuated joints exposed for manual control (radians internally, degrees in UI)
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
  "Servo-Forearm-L": number;
  "Servo-Forearm-R": number;
}

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
  "Servo-Forearm-L": 0,
  "Servo-Forearm-R": 0,
};

const JOINT_GROUPS: {
  label: string;
  joints: { key: keyof JointAngles; label: string; min: number; max: number }[];
}[] = [
  {
    label: "LEGS",
    joints: [
      { key: "Servo-Hip-L", label: "Hip L", min: -90, max: 90 },
      { key: "Servo-Hip-R", label: "Hip R", min: -90, max: 90 },
      { key: "Servo-Knee-L-Top", label: "Knee L Top", min: -120, max: 0 },
      { key: "Servo-Knee-L-Bottom", label: "Knee L Bot", min: -120, max: 0 },
      { key: "Servo-Knee-R-Top", label: "Knee R Top", min: -120, max: 0 },
      { key: "Servo-Knee-R-Bottom", label: "Knee R Bot", min: -120, max: 0 },
      { key: "Servo-Ankle-L", label: "Ankle L", min: -45, max: 45 },
      { key: "Servo-Ankle-R", label: "Ankle R", min: -45, max: 45 },
    ],
  },
  {
    label: "ARMS",
    joints: [
      { key: "Servo-Showlder-L-Front-Back", label: "Shoulder L", min: -90, max: 90 },
      { key: "Servo-Showlder-R-Front-Back", label: "Shoulder R", min: -90, max: 90 },
      { key: "Servo-Forearm-L", label: "Forearm L", min: -120, max: 0 },
      { key: "Servo-Forearm-R", label: "Forearm R", min: -120, max: 0 },
    ],
  },
];

const DEG_TO_RAD = Math.PI / 180;

interface ServoSlidersProps {
  angles: JointAngles;
  onChange: (angles: JointAngles) => void;
}

function JointSlider({
  label,
  min,
  max,
  valueDeg,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  valueDeg: number;
  onChange: (deg: number) => void;
}) {
  const pct = ((valueDeg - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-label text-hud-text-dim text-[9px] tracking-widest uppercase">
          {label}
        </span>
        <span className="text-hud-primary font-mono text-[10px] tabular-nums">
          {valueDeg > 0 ? "+" : ""}
          {valueDeg}°
        </span>
      </div>
      <div className="group relative flex h-4 items-center">
        {/* Track */}
        <div className="bg-hud-border/40 relative h-0.5 w-full overflow-visible rounded-full">
          {/* Zero marker */}
          <div
            className="bg-hud-border absolute top-1/2 h-2 w-px -translate-y-1/2"
            style={{ left: `${((0 - min) / (max - min)) * 100}%` }}
          />
          {/* Fill */}
          <div
            className="bg-hud-primary/60 absolute top-0 h-full rounded-full transition-none"
            style={{
              left: `${Math.min(pct, ((0 - min) / (max - min)) * 100)}%`,
              width: `${Math.abs(pct - ((0 - min) / (max - min)) * 100)}%`,
            }}
          />
        </div>
        {/* Thumb (rendered via range input — invisible but functional) */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={valueDeg}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
        {/* Custom thumb */}
        <div
          className="border-hud-primary bg-hud-bg pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full border transition-none"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ServoSliders({ angles, onChange }: ServoSlidersProps) {
  const setJoint = (key: keyof JointAngles, deg: number) => {
    onChange({ ...angles, [key]: deg });
  };

  const resetAll = () => onChange({ ...DEFAULT_JOINT_ANGLES });

  return (
    <HudPanel title="Servo Control" status="online" cornerBrackets className="h-full">
      <div className="flex h-full flex-col gap-3 overflow-auto p-3">
        <div className="flex items-center justify-between">
          <span className="font-label text-hud-text-dim text-[9px] tracking-widest uppercase">
            Manual Override
          </span>
          <button
            onClick={resetAll}
            className="border-hud-border/60 text-hud-text-dim hover:border-hud-primary hover:text-hud-primary rounded px-2 py-0.5 font-mono text-[8px] tracking-widest uppercase transition-colors"
            style={{ border: "1px solid" }}
          >
            Reset
          </button>
        </div>

        {JOINT_GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-label text-hud-primary text-[8px] tracking-[0.2em] uppercase">
                {group.label}
              </span>
              <div className="bg-hud-border/40 h-px flex-1" />
            </div>
            {group.joints.map(({ key, label, min, max }) => (
              <JointSlider
                key={key}
                label={label}
                min={min}
                max={max}
                valueDeg={Math.round(angles[key] / DEG_TO_RAD)}
                onChange={(deg) => setJoint(key, deg * DEG_TO_RAD)}
              />
            ))}
            {gi < JOINT_GROUPS.length - 1 && <HudSeparator />}
          </div>
        ))}
      </div>
    </HudPanel>
  );
}
