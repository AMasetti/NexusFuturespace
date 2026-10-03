"use client";

import { useState } from "react";
import { HudPanel } from "../core/HudPanel";
import { HudSeparator } from "../core/HudSeparator";
import { JointSlider } from "./ServoSliders";
import { DEFAULT_SPOT_ANGLES, SPOT_JOINT_GROUPS, type SpotAngles } from "@/lib/spotmicro";

const RAD2DEG = 180 / Math.PI;

/**
 * Servo Control for Spot Micro: one slider per joint, in real degrees within
 * the URDF limits (unlike Optimus, whose sliders read 0–180 around a 90° halt).
 */
export function SpotServoSliders({
  angles,
  onChange,
  collapsed,
  onToggle,
}: {
  angles: SpotAngles;
  onChange: (angles: SpotAngles) => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const [groupCollapsed, setGroupCollapsed] = useState<Record<string, boolean>>({});
  const setJoint = (key: string, deg: number) => onChange({ ...angles, [key]: deg / RAD2DEG });

  return (
    <HudPanel
      title="Servo Control"
      subtitle="Spot Micro"
      status="online"
      className="h-full"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-3 overflow-auto p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono" style={{ fontSize: 10, color: "rgba(0,200,255,0.55)" }}>
            12 servos · simulation only
          </span>
          <button
            onClick={() => onChange({ ...DEFAULT_SPOT_ANGLES })}
            className="border-hud-border/60 text-hud-text-dim hover:border-hud-primary hover:text-hud-primary rounded px-2 py-0.5 font-mono text-[8px] tracking-widest uppercase transition-colors"
            style={{ border: "1px solid" }}
          >
            Reset
          </button>
        </div>

        {SPOT_JOINT_GROUPS.map((group, gi) => {
          const isCollapsed = !!groupCollapsed[group.label];
          return (
            <div key={group.label} className="flex flex-col gap-2">
              <button
                onClick={() => setGroupCollapsed((c) => ({ ...c, [group.label]: !c[group.label] }))}
                className="flex w-full items-center gap-2 text-left"
              >
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
                <div className="h-px flex-1" style={{ background: "rgba(0,200,255,0.20)" }} />
              </button>

              {!isCollapsed &&
                group.joints.map((j) => (
                  <JointSlider
                    key={j.key}
                    label={j.label}
                    sublabel={j.sublabel}
                    valueDeg={Math.round((angles[j.key] ?? 0) * RAD2DEG)}
                    min={Math.ceil(j.limits[0] * RAD2DEG)}
                    max={Math.floor(j.limits[1] * RAD2DEG)}
                    onChange={(deg) => setJoint(j.key, deg)}
                    onCommit={(deg) => setJoint(j.key, deg)}
                  />
                ))}

              {gi < SPOT_JOINT_GROUPS.length - 1 && <HudSeparator />}
            </div>
          );
        })}
      </div>
    </HudPanel>
  );
}
