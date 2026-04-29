"use client";

import { useMemo } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
export type BoardType = "arduino-uno" | "esp32" | "esp8266" | "mpu6050" | "adxl345";
export type PinType   = "power" | "gnd" | "data" | "i2c" | "analog" | "pwm" | "uart";

export interface PinDef {
  id: string;
  x: number;        // relative to board top-left
  y: number;
  side: "left" | "right" | "top" | "bottom";
  type: PinType;
}

interface BoardDef {
  width: number;
  height: number;
  label: string;
  sublabel: string;
  color: string;
  pins: PinDef[];
  render: (props: { color: string }) => React.ReactNode;
}

export interface PlacedBoard {
  type: BoardType;
  id: string;
  x: number;
  y: number;
  label?: string;
}

export interface Wire {
  from: { boardId: string; pin: string };
  to:   { boardId: string; pin: string };
  color?: string;
  label?: string;
}

export interface CircuitSchematicProps {
  boards: PlacedBoard[];
  wires?: Wire[];
  width?: number;
  height?: number;
  showPinLabels?: boolean;
  showGrid?: boolean;
  className?: string;
}

// ─── Pin color map ─────────────────────────────────────────────────────────────
const PIN_COLORS: Record<PinType, string> = {
  power:  "#FF3E3E",
  gnd:    "#2A5F7A",
  data:   "#00C8FF",
  i2c:    "#00FF9C",
  analog: "#FFB800",
  pwm:    "#C084FC",
  uart:   "#F97316",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
function pinExitDir(side: PinDef["side"]): [number, number] {
  switch (side) {
    case "left":   return [-1,  0];
    case "right":  return [ 1,  0];
    case "top":    return [ 0, -1];
    case "bottom": return [ 0,  1];
  }
}

function bezierWire(ax: number, ay: number, bx: number, by: number, aSide: PinDef["side"], bSide: PinDef["side"]) {
  const CTRL = 40;
  const [adx, ady] = pinExitDir(aSide);
  const [bdx, bdy] = pinExitDir(bSide);
  const cx1 = ax + adx * CTRL;
  const cy1 = ay + ady * CTRL;
  const cx2 = bx + bdx * CTRL;
  const cy2 = by + bdy * CTRL;
  return `M ${ax} ${ay} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${bx} ${by}`;
}

// ─── Board definitions ─────────────────────────────────────────────────────────

function makePinRow(
  side: PinDef["side"],
  pins: { id: string; type: PinType }[],
  boardW: number,
  boardH: number,
  spacing = 10,
  offset = 16,
): PinDef[] {
  return pins.map((p, i) => {
    let x = 0, y = 0;
    switch (side) {
      case "top":    x = offset + i * spacing; y = 0;      break;
      case "bottom": x = offset + i * spacing; y = boardH; break;
      case "left":   x = 0;      y = offset + i * spacing; break;
      case "right":  x = boardW; y = offset + i * spacing; break;
    }
    return { id: p.id, x, y, side, type: p.type };
  });
}

const BOARDS: Record<BoardType, BoardDef> = {
  "arduino-uno": {
    width: 155, height: 106,
    label: "Arduino Uno",
    sublabel: "ATmega328P",
    color: "#00C8FF",
    pins: [
      // Digital header (top-right)
      ...makePinRow("top", [
        { id: "D13", type: "data" }, { id: "D12", type: "data" }, { id: "D11", type: "pwm" },
        { id: "D10", type: "pwm" },  { id: "D9",  type: "pwm" },  { id: "D8",  type: "data" },
      ], 155, 106, 11, 50),
      // Power + more digital (right side)
      ...makePinRow("right", [
        { id: "D7",  type: "data" }, { id: "D6",  type: "pwm" },  { id: "D5",  type: "pwm" },
        { id: "D4",  type: "data" }, { id: "D3",  type: "pwm" },  { id: "D2",  type: "data" },
        { id: "GND", type: "gnd"  }, { id: "TX",  type: "uart" }, { id: "RX",  type: "uart" },
      ], 155, 106, 10, 18),
      // Analog + power header (bottom)
      ...makePinRow("bottom", [
        { id: "A0",  type: "analog" }, { id: "A1",  type: "analog" }, { id: "A2",  type: "analog" },
        { id: "A3",  type: "analog" }, { id: "A4",  type: "i2c"   }, { id: "A5",  type: "i2c"   },
      ], 155, 106, 11, 20),
      // Power header (left side)
      ...makePinRow("left", [
        { id: "3V3", type: "power" }, { id: "5V",  type: "power" },
        { id: "GND", type: "gnd"  }, { id: "GND", type: "gnd"   },
        { id: "VIN", type: "power" },
      ], 155, 106, 10, 20),
    ],
    render: ({ color }) => (
      <g>
        {/* Board outline */}
        <rect x={0} y={0} width={155} height={106} rx={4} ry={4}
          fill={`${color}08`} stroke={color} strokeWidth={1.5} />
        {/* USB-B port */}
        <rect x={-8} y={30} width={10} height={20} rx={1}
          fill="var(--hud-surface-2)" stroke={color} strokeWidth={1} strokeOpacity={0.5} />
        {/* Power barrel */}
        <rect x={-8} y={62} width={10} height={12} rx={2}
          fill="var(--hud-surface-2)" stroke={color} strokeWidth={1} strokeOpacity={0.5} />
        {/* ATmega chip */}
        <rect x={52} y={30} width={52} height={46} rx={2}
          fill="var(--hud-surface)" stroke={color} strokeWidth={1} strokeOpacity={0.6} />
        <text x={78} y={50} textAnchor="middle" fill={color} fontSize={6}
          fontFamily="var(--font-mono)" opacity={0.7}>ATmega</text>
        <text x={78} y={59} textAnchor="middle" fill={color} fontSize={5}
          fontFamily="var(--font-mono)" opacity={0.5}>328P</text>
        {/* Crystal */}
        <rect x={112} y={42} width={14} height={6} rx={1}
          fill="var(--hud-surface)" stroke={color} strokeWidth={0.8} strokeOpacity={0.4} />
        {/* Reset button */}
        <circle cx={130} cy={20} r={4}
          fill="var(--hud-surface)" stroke={color} strokeWidth={0.8} strokeOpacity={0.4} />
        {/* Label */}
        <text x={78} y={16} textAnchor="middle" fill={color} fontSize={7}
          fontFamily="var(--font-display)" fontWeight={600} letterSpacing="0.08em" opacity={0.9}>
          ARDUINO UNO
        </text>
        {/* PCB trace marks */}
        {[20, 40, 60, 80].map((y, i) => (
          <line key={i} x1={8} y1={y} x2={50} y2={y}
            stroke={color} strokeWidth={0.4} strokeOpacity={0.15} />
        ))}
      </g>
    ),
  },

  "esp32": {
    width: 130, height: 56,
    label: "ESP32 DevKit",
    sublabel: "Xtensa LX6",
    color: "#00C8FF",
    pins: [
      ...makePinRow("left", [
        { id: "3V3",  type: "power" }, { id: "GND",  type: "gnd"   },
        { id: "D15",  type: "data"  }, { id: "D2",   type: "data"  },
        { id: "D4",   type: "data"  }, { id: "RX2",  type: "uart"  },
        { id: "TX2",  type: "uart"  }, { id: "D22",  type: "data"  },
        { id: "D21",  type: "i2c"   }, { id: "D19",  type: "data"  },
      ], 130, 56, 5, 8),
      ...makePinRow("right", [
        { id: "VIN",  type: "power" }, { id: "GND",  type: "gnd"   },
        { id: "D34",  type: "analog"}, { id: "D35",  type: "analog"},
        { id: "D32",  type: "data"  }, { id: "D33",  type: "data"  },
        { id: "D25",  type: "data"  }, { id: "D26",  type: "data"  },
        { id: "D27",  type: "data"  }, { id: "D14",  type: "data"  },
      ], 130, 56, 5, 8),
    ],
    render: ({ color }) => (
      <g>
        <rect x={0} y={0} width={130} height={56} rx={2}
          fill={`${color}08`} stroke={color} strokeWidth={1.5} />
        {/* Antenna */}
        <rect x={50} y={-10} width={30} height={12} rx={1}
          fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.5} />
        <line x1={58} y1={-10} x2={58} y2={0} stroke={color} strokeWidth={0.6} strokeOpacity={0.4} />
        <line x1={65} y1={-10} x2={65} y2={0} stroke={color} strokeWidth={0.6} strokeOpacity={0.4} />
        <line x1={72} y1={-10} x2={72} y2={0} stroke={color} strokeWidth={0.6} strokeOpacity={0.4} />
        {/* ESP32 module */}
        <rect x={22} y={8} width={86} height={38} rx={2}
          fill="var(--hud-surface)" stroke={color} strokeWidth={1} strokeOpacity={0.5} />
        <text x={65} y={25} textAnchor="middle" fill={color} fontSize={7}
          fontFamily="var(--font-mono)" opacity={0.7}>ESP32</text>
        <text x={65} y={34} textAnchor="middle" fill={color} fontSize={5}
          fontFamily="var(--font-mono)" opacity={0.45}>Xtensa LX6 240MHz</text>
        {/* USB micro */}
        <rect x={57} y={54} width={16} height={6} rx={1}
          fill="var(--hud-surface-2)" stroke={color} strokeWidth={0.8} strokeOpacity={0.4} />
        {/* Label */}
        <text x={65} y={-16} textAnchor="middle" fill={color} fontSize={6}
          fontFamily="var(--font-display)" fontWeight={600} letterSpacing="0.08em" opacity={0.8}>
          ESP32 DEVKIT V1
        </text>
      </g>
    ),
  },

  "esp8266": {
    width: 110, height: 48,
    label: "NodeMCU ESP8266",
    sublabel: "Tensilica L106",
    color: "#00C8FF",
    pins: [
      ...makePinRow("left", [
        { id: "3V3",  type: "power" }, { id: "GND",  type: "gnd"   },
        { id: "D1",   type: "i2c"   }, { id: "D2",   type: "i2c"   },
        { id: "D3",   type: "data"  }, { id: "D4",   type: "data"  },
        { id: "D5",   type: "data"  }, { id: "D6",   type: "data"  },
      ], 110, 48, 5.5, 8),
      ...makePinRow("right", [
        { id: "VIN",  type: "power" }, { id: "GND",  type: "gnd"   },
        { id: "A0",   type: "analog"}, { id: "D0",   type: "data"  },
        { id: "D7",   type: "data"  }, { id: "D8",   type: "data"  },
        { id: "RX",   type: "uart"  }, { id: "TX",   type: "uart"  },
      ], 110, 48, 5.5, 8),
    ],
    render: ({ color }) => (
      <g>
        <rect x={0} y={0} width={110} height={48} rx={2}
          fill={`${color}08`} stroke={color} strokeWidth={1.5} />
        {/* Antenna */}
        <rect x={40} y={-8} width={30} height={10} rx={1}
          fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.5} />
        {/* ESP8266 module */}
        <rect x={18} y={6} width={74} height={36} rx={2}
          fill="var(--hud-surface)" stroke={color} strokeWidth={1} strokeOpacity={0.5} />
        <text x={55} y={22} textAnchor="middle" fill={color} fontSize={7}
          fontFamily="var(--font-mono)" opacity={0.7}>ESP8266</text>
        <text x={55} y={31} textAnchor="middle" fill={color} fontSize={5}
          fontFamily="var(--font-mono)" opacity={0.45}>NodeMCU v3</text>
        {/* USB micro */}
        <rect x={45} y={46} width={20} height={5} rx={1}
          fill="var(--hud-surface-2)" stroke={color} strokeWidth={0.8} strokeOpacity={0.4} />
        <text x={55} y={-12} textAnchor="middle" fill={color} fontSize={6}
          fontFamily="var(--font-display)" fontWeight={600} letterSpacing="0.08em" opacity={0.8}>
          ESP8266 NodeMCU
        </text>
      </g>
    ),
  },

  "mpu6050": {
    width: 52, height: 36,
    label: "MPU-6050",
    sublabel: "IMU 6-DoF",
    color: "#00FF9C",
    pins: [
      ...makePinRow("left", [
        { id: "VCC",  type: "power" }, { id: "GND",  type: "gnd"   },
        { id: "SCL",  type: "i2c"   }, { id: "SDA",  type: "i2c"   },
        { id: "INT",  type: "data"  },
      ], 52, 36, 6.5, 5),
    ],
    render: ({ color }) => (
      <g>
        <rect x={0} y={0} width={52} height={36} rx={2}
          fill={`${color}08`} stroke={color} strokeWidth={1.5} />
        {/* Chip */}
        <rect x={14} y={8} width={24} height={20} rx={1}
          fill="var(--hud-surface)" stroke={color} strokeWidth={0.8} strokeOpacity={0.6} />
        {/* Chip dots */}
        {[0,1,2].map(i => (
          <g key={i}>
            <circle cx={17 + i * 6} cy={12} r={0.8} fill={color} fillOpacity={0.4} />
            <circle cx={17 + i * 6} cy={24} r={0.8} fill={color} fillOpacity={0.4} />
          </g>
        ))}
        <text x={26} y={20} textAnchor="middle" fill={color} fontSize={5.5}
          fontFamily="var(--font-mono)" opacity={0.8}>MPU</text>
        <text x={26} y={27} textAnchor="middle" fill={color} fontSize={4.5}
          fontFamily="var(--font-mono)" opacity={0.5}>6050</text>
        <text x={26} y={-4} textAnchor="middle" fill={color} fontSize={5.5}
          fontFamily="var(--font-display)" fontWeight={600} letterSpacing="0.06em" opacity={0.85}>
          MPU-6050 IMU
        </text>
      </g>
    ),
  },

  "adxl345": {
    width: 48, height: 32,
    label: "ADXL345",
    sublabel: "3-Axis Accel",
    color: "#FFB800",
    pins: [
      ...makePinRow("left", [
        { id: "VCC",  type: "power" }, { id: "GND",  type: "gnd"  },
        { id: "SCL",  type: "i2c"  }, { id: "SDA",  type: "i2c"  },
        { id: "CS",   type: "data" }, { id: "INT1", type: "data" },
      ], 48, 32, 5, 4),
    ],
    render: ({ color }) => (
      <g>
        <rect x={0} y={0} width={48} height={32} rx={2}
          fill={`${color}08`} stroke={color} strokeWidth={1.5} />
        {/* Chip */}
        <rect x={12} y={7} width={24} height={18} rx={1}
          fill="var(--hud-surface)" stroke={color} strokeWidth={0.8} strokeOpacity={0.6} />
        <text x={24} y={17} textAnchor="middle" fill={color} fontSize={5.5}
          fontFamily="var(--font-mono)" opacity={0.8}>ADXL</text>
        <text x={24} y={23} textAnchor="middle" fill={color} fontSize={4.5}
          fontFamily="var(--font-mono)" opacity={0.5}>345</text>
        <text x={24} y={-4} textAnchor="middle" fill={color} fontSize={5.5}
          fontFamily="var(--font-display)" fontWeight={600} letterSpacing="0.06em" opacity={0.85}>
          ADXL345 ACCEL
        </text>
      </g>
    ),
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export function CircuitSchematic({
  boards,
  wires = [],
  width = 640,
  height = 360,
  showPinLabels = true,
  showGrid = true,
  className,
}: CircuitSchematicProps) {
  // Build pin absolute positions
  const pinPositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; side: PinDef["side"]; type: PinType }>();
    boards.forEach((placed) => {
      const def = BOARDS[placed.type];
      def.pins.forEach((pin) => {
        const key = `${placed.id}:${pin.id}`;
        map.set(key, {
          x: placed.x + pin.x,
          y: placed.y + pin.y,
          side: pin.side,
          type: pin.type,
        });
      });
    });
    return map;
  }, [boards]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ background: "var(--hud-surface)", border: "1px solid var(--hud-border)" }}
    >
      {/* Grid */}
      {showGrid && (
        <defs>
          <pattern id="circuit-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.6" fill="var(--hud-border)" fillOpacity="0.35" />
          </pattern>
        </defs>
      )}
      {showGrid && <rect width={width} height={height} fill="url(#circuit-grid)" />}

      {/* Wires */}
      {wires.map((wire, i) => {
        const a = pinPositions.get(`${wire.from.boardId}:${wire.from.pin}`);
        const b = pinPositions.get(`${wire.to.boardId}:${wire.to.pin}`);
        if (!a || !b) return null;
        const defaultColor = PIN_COLORS[a.type] ?? "var(--hud-primary)";
        const color = wire.color ?? defaultColor;
        const d = bezierWire(a.x, a.y, b.x, b.y, a.side, b.side);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <g key={i}>
            {/* Wire glow */}
            <path d={d} fill="none" stroke={color} strokeWidth={4} strokeOpacity={0.08} />
            {/* Wire */}
            <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.85} />
            {/* Endpoint dots */}
            <circle cx={a.x} cy={a.y} r={2.5} fill={color} fillOpacity={0.9} />
            <circle cx={b.x} cy={b.y} r={2.5} fill={color} fillOpacity={0.9} />
            {wire.label && (
              <text x={mx} y={my - 4} textAnchor="middle"
                fill={color} fontSize={6.5} fontFamily="var(--font-mono)" opacity={0.8}>
                {wire.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Boards */}
      {boards.map((placed) => {
        const def = BOARDS[placed.type];
        return (
          <g key={placed.id} transform={`translate(${placed.x}, ${placed.y})`}>
            {def.render({ color: def.color })}
            {/* Pins */}
            {def.pins.map((pin, i) => {
              const pinColor = PIN_COLORS[pin.type];
              const labelX = pin.side === "left"   ? pin.x - 10
                           : pin.side === "right"  ? pin.x + 10
                           : pin.x;
              const labelY = pin.side === "top"    ? pin.y - 6
                           : pin.side === "bottom" ? pin.y + 9
                           : pin.y + 1.5;
              const anchor = pin.side === "left" ? "end" : pin.side === "right" ? "start" : "middle";
              return (
                <g key={`${pin.id}-${i}`}>
                  <circle cx={pin.x} cy={pin.y} r={2.5}
                    fill={pinColor} fillOpacity={0.9}
                    stroke="var(--hud-bg)" strokeWidth={0.5} />
                  {showPinLabels && (
                    <text
                      x={labelX} y={labelY}
                      textAnchor={anchor}
                      fill={pinColor}
                      fontSize={5}
                      fontFamily="var(--font-mono)"
                      opacity={0.75}
                    >
                      {pin.id}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(8, ${height - 58})`}>
        <rect x={0} y={0} width={120} height={52} rx={2}
          fill="var(--hud-bg)" fillOpacity={0.8}
          stroke="var(--hud-border)" strokeWidth={0.8} />
        <text x={6} y={10} fill="var(--hud-text-dim)" fontSize={6}
          fontFamily="var(--font-label)" letterSpacing="0.08em">SIGNAL LEGEND</text>
        {(["power","gnd","i2c","data","analog","uart"] as PinType[]).map((t, i) => (
          <g key={t} transform={`translate(6, ${16 + i * 6})`}>
            <rect x={0} y={-4} width={10} height={4} rx={1} fill={PIN_COLORS[t]} fillOpacity={0.85} />
            <text x={14} y={0} fill={PIN_COLORS[t]} fontSize={5.5}
              fontFamily="var(--font-mono)" opacity={0.85}>
              {t.toUpperCase()}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
