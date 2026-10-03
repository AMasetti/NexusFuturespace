"use client";

import React, { useEffect, useRef, useState } from "react";
import { HudPanel } from "../core/HudPanel";
import { HudSeparator } from "../core/HudSeparator";
import { hasLink, servoGroups, zeroAngles, type RobotDef, type ServoAngles } from "@/lib/robot-def";

const RAD2DEG = 180 / Math.PI;

export function JointSlider({
  label,
  sublabel,
  valueDeg,
  onChange,
  onCommit,
  readOnly = false,
  min = 0,
  max = 180,
}: {
  label: string;
  sublabel: string;
  valueDeg: number;
  onChange: (deg: number) => void;
  onCommit: (deg: number) => void;
  readOnly?: boolean;
  /** Slider range in displayed degrees (Optimus: 0–180 around a 90° halt). */
  min?: number;
  max?: number;
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

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, valueDeg + delta));
    onChange(next);
    onCommit(next);
    if (ref.current) ref.current.value = String(next);
  };

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
        <div className="flex items-center gap-2">
          <button onClick={() => step(-5)} disabled={readOnly} className="hud-step-btn">
            −5°
          </button>
          <span
            className="font-mono tabular-nums"
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "rgba(0,255,200,0.95)",
              minWidth: 46,
              textAlign: "center",
            }}
          >
            {valueDeg}°
          </span>
          <button onClick={() => step(+5)} disabled={readOnly} className="hud-step-btn">
            +5°
          </button>
        </div>
      </div>

      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={1}
        defaultValue={valueDeg}
        disabled={readOnly}
        className="hud-range-input w-full"
      />
    </div>
  );
}

/** "ch 12–15" when every servo in the group has a channel. */
function channelRange(channels: (number | undefined)[]) {
  if (channels.some((c) => c === undefined)) return "";
  const cs = channels as number[];
  return `ch ${Math.min(...cs)}–${Math.max(...cs)}`;
}

/**
 * Servo Control for any robot: one slider per servo in robot.json, grouped as
 * the file lists them. Sliders read `zeroDeg + angle` within each servo's limits.
 */
export function ServoControl({
  def,
  angles,
  onChange,
  onCommit,
  readOnly = false,
  headerExtra,
  collapsed,
  onToggle,
}: {
  def: RobotDef;
  angles: ServoAngles;
  onChange: (angles: ServoAngles) => void;
  /** Slider released or stepped — use it to send commands to the robot. */
  onCommit?: (angles: ServoAngles) => void;
  readOnly?: boolean;
  headerExtra?: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const [groupCollapsed, setGroupCollapsed] = useState<Record<string, boolean>>({});
  const toRad = (deg: number) => (deg - def.zeroDeg) / RAD2DEG;
  const set = (id: string, deg: number) => !readOnly && onChange({ ...angles, [id]: toRad(deg) });
  const commit = (id: string, deg: number) => {
    if (readOnly) return;
    const next = { ...angles, [id]: toRad(deg) };
    onChange(next);
    onCommit?.(next);
  };
  const resetAll = () => {
    onChange(zeroAngles(def));
    onCommit?.(zeroAngles(def));
  };
  const groups = servoGroups(def);
  const live = hasLink(def);

  return (
    <HudPanel
      title="Servo Control"
      subtitle={live ? undefined : "simulation"}
      status="online"
      cornerBrackets
      className="h-full"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-3 overflow-auto p-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span
              className="font-label tracking-wider uppercase"
              style={{ fontSize: 13, color: "rgba(0,220,255,0.85)", fontWeight: 700 }}
            >
              {live ? "Manual Override" : def.name}
            </span>
            <span className="font-mono" style={{ fontSize: 10, color: "rgba(0,200,255,0.55)" }}>
              {def.servos.length} servos{live ? "" : " · no robot link"}
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

        {groups.map((group, gi) => {
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
                <span className="font-mono" style={{ fontSize: 10, color: "rgba(0,200,255,0.55)" }}>
                  {channelRange(group.servos.map((s) => s.channel))}
                </span>
                {isCollapsed && (
                  <span
                    className="ml-1 font-mono"
                    style={{ fontSize: 9, color: "rgba(0,200,255,0.40)" }}
                  >
                    {group.servos.length} joints
                  </span>
                )}
                <div className="h-px flex-1" style={{ background: "rgba(0,200,255,0.20)" }} />
              </button>

              {!isCollapsed && (
                <div className="flex flex-col gap-2">
                  {group.servos.map((s) => (
                    <JointSlider
                      key={s.id}
                      label={s.label}
                      sublabel={s.channel !== undefined ? `ch ${s.channel} · ${s.id}` : s.id}
                      valueDeg={Math.round(def.zeroDeg + (angles[s.id] ?? 0) * RAD2DEG)}
                      min={def.zeroDeg + s.limitsDeg[0]}
                      max={def.zeroDeg + s.limitsDeg[1]}
                      onChange={(deg) => set(s.id, deg)}
                      onCommit={(deg) => commit(s.id, deg)}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              )}

              {gi < groups.length - 1 && <HudSeparator />}
            </div>
          );
        })}
      </div>
    </HudPanel>
  );
}
