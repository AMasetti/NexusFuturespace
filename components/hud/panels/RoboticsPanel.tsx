"use client";

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  BarChart, Bar, ResponsiveContainer, Cell,
} from "recharts";
import { HudPanel } from "../core/HudPanel";
import { SensorInventoryPanel, type SensorEntry } from "./SensorInventoryPanel";
import { CircuitSchematic, type PlacedBoard, type Wire } from "../visualization/CircuitSchematic";
import { HudProgressBar } from "../data/HudProgressBar";
import { HudSeparator } from "../core/HudSeparator";

// ─── Default mock data ──────────────────────────────────────────────────────────

const DEFAULT_SENSORS: SensorEntry[] = [
  { symbol: "He", id: "IMU",     name: "MPU-6050",      status: "online",  value: "9.81 m/s²",  address: "0x68" },
  { symbol: "Ne", id: "POT",     name: "Servo Pot×3",   status: "online",  value: "127°",        address: "A0-2" },
  { symbol: "Cl", id: "POT",     name: "Joint Encoder", status: "warning", value: "—",            address: "A3"   },
  { symbol: "Kr", id: "CURRENT", name: "INA219",        status: "online",  value: "1.42 A",      address: "0x40" },
  { symbol: "Xe", id: "COMPASS", name: "HMC5883L",      status: "offline", value: "—",            address: "0x1E" },
];

const BALANCE_DATA = [
  { axis: "NE", value: 85 },
  { axis: "SE", value: 70 },
  { axis: "SW", value: 60 },
  { axis: "NW", value: 80 },
  { axis: "NS", value: 75 },
];

const SERVO_DATA = [
  { joint: "HIP",  current: 1.42 },
  { joint: "KNEE", current: 0.98 },
  { joint: "ANKE", current: 0.61 },
  { joint: "SHLDR",current: 1.15 },
  { joint: "ELBW", current: 0.73 },
];

const CODE_LINES = [
  "servo_set_angle();",
  "get_imu_angle();",
  "get_toe_4mat();",
  "calculate_balance()",
  "}",
  "",
  "calculate_balance(){",
  "  get_ivo_artc();",
  "}",
  "",
  "calculate_balance();",
];

// ─── Sub-panels ─────────────────────────────────────────────────────────────────

function CodePanel() {
  return (
    <HudPanel title="Core Controller" subtitle="Schematic" cornerBrackets>
      <div className="p-3">
        <pre className="font-mono text-[9px] text-hud-primary leading-relaxed whitespace-pre">
          {CODE_LINES.map((line, i) => (
            <div key={i} className={i === 3 || i === 10 ? "text-hud-secondary" : ""}>
              <span className="text-hud-text-dim/40 mr-2">{String(i + 1).padStart(2, "0")}</span>
              {line}
            </div>
          ))}
        </pre>
      </div>
    </HudPanel>
  );
}

function BalancePanel() {
  return (
    <HudPanel title="Balance Stability Margins" cornerBrackets>
      <div className="p-2">
        <ResponsiveContainer width="100%" height={130}>
          <RadarChart data={BALANCE_DATA} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <PolarGrid stroke="var(--hud-border)" strokeOpacity={0.5} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "var(--hud-text-dim)", fontSize: 8, fontFamily: "var(--font-mono)" }}
            />
            <Radar
              dataKey="value"
              stroke="var(--hud-primary)"
              fill="var(--hud-primary)"
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </HudPanel>
  );
}

function ServoCurrentPanel() {
  const max = Math.max(...SERVO_DATA.map((d) => d.current));
  return (
    <HudPanel title="Servo Operating Current" cornerBrackets>
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-end gap-1 h-[80px]">
          {SERVO_DATA.map((d, i) => {
            const pct = d.current / max;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div
                  className="w-full rounded-t-sm bg-hud-primary"
                  style={{
                    height: `${pct * 100}%`,
                    opacity: pct === 1 ? 1 : 0.55,
                    boxShadow: pct > 0.8 ? "0 0 6px var(--hud-primary)" : "none",
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1">
          {SERVO_DATA.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <span className="font-mono text-[7px] text-hud-text-dim">{d.joint}</span>
              <span className="font-mono text-[7px] text-hud-primary">{d.current}A</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {[0, 25, 50, 75, 100].map((v) => (
            <span key={v} className="font-mono text-[7px] text-hud-text-dim flex-1 text-center">{v}</span>
          ))}
        </div>
      </div>
    </HudPanel>
  );
}

// ─── Main exported props ────────────────────────────────────────────────────────

interface RoboticsPanelProps {
  sensors?: SensorEntry[];
  boards?: PlacedBoard[];
  wires?: Wire[];
  title?: string;
  unitLabel?: string;
}

// ─── Default circuit: ESP32 + MPU6050 + ADXL345 ────────────────────────────────

const DEFAULT_BOARDS: PlacedBoard[] = [
  { type: "esp32",   id: "mcu",   x: 240, y: 50  },
  { type: "mpu6050", id: "imu",   x: 60,  y: 80  },
  { type: "adxl345", id: "accel", x: 60,  y: 170 },
];

const DEFAULT_WIRES: Wire[] = [
  // MPU6050 → ESP32: I2C
  { from: { boardId: "imu",   pin: "VCC" }, to: { boardId: "mcu", pin: "3V3" }, label: "3V3"  },
  { from: { boardId: "imu",   pin: "GND" }, to: { boardId: "mcu", pin: "GND" }, label: "GND"  },
  { from: { boardId: "imu",   pin: "SDA" }, to: { boardId: "mcu", pin: "D21" }, label: "SDA"  },
  { from: { boardId: "imu",   pin: "SCL" }, to: { boardId: "mcu", pin: "D22" }, label: "SCL"  },
  // ADXL345 → ESP32: I2C (shared bus)
  { from: { boardId: "accel", pin: "VCC" }, to: { boardId: "mcu", pin: "3V3" }                },
  { from: { boardId: "accel", pin: "GND" }, to: { boardId: "mcu", pin: "GND" }                },
  { from: { boardId: "accel", pin: "SDA" }, to: { boardId: "mcu", pin: "D21" }                },
  { from: { boardId: "accel", pin: "SCL" }, to: { boardId: "mcu", pin: "D22" }                },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function RoboticsPanel({
  sensors = DEFAULT_SENSORS,
  boards  = DEFAULT_BOARDS,
  wires   = DEFAULT_WIRES,
  title   = "HUMANOID-BOT",
  unitLabel = "PROTO-01 UNIT OVERVIEW",
}: RoboticsPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between py-1 px-1">
        <span className="font-display text-xl font-bold text-hud-primary hud-glow-text tracking-widest uppercase">
          {title}
        </span>
        <span className="font-label text-xs uppercase tracking-widest text-hud-text-dim">{unitLabel}</span>
      </div>

      {/* Main grid: left sensor list | center schematic | right code+charts */}
      <div className="grid grid-cols-[200px_1fr_200px] gap-2 items-start">

        {/* ── Left: sensor inventory ─────────────────────────────────────── */}
        <SensorInventoryPanel sensors={sensors} title="Sensor Inventory" />

        {/* ── Center: circuit schematic ──────────────────────────────────── */}
        <HudPanel title="Core Controller Schematic" cornerBrackets>
          <div className="p-2">
            <CircuitSchematic
              boards={boards}
              wires={wires}
              width={430}
              height={280}
              showPinLabels
              showGrid
            />
          </div>
        </HudPanel>

        {/* ── Right: code + charts ───────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <CodePanel />
          <BalancePanel />
          <ServoCurrentPanel />
        </div>
      </div>
    </div>
  );
}
