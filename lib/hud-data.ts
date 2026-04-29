export function generateWaveformData(length = 40): number[] {
  return Array.from({ length }, () => Math.random() * 80 + 10);
}

export function generateSystemStats() {
  return {
    cpu: Math.round(Math.random() * 60 + 20),
    ram: { used: parseFloat((Math.random() * 10 + 4).toFixed(1)), total: 16 },
    disk: { used: parseFloat((Math.random() * 300 + 100).toFixed(0)), total: 512 },
  };
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function generateConversation(): Message[] {
  return [
    {
      role: "assistant",
      content: "Good morning. All systems are nominal. How can I assist you today?",
      timestamp: "09:00:14",
    },
    {
      role: "user",
      content: "Run a full diagnostics scan on all subsystems.",
      timestamp: "09:00:31",
    },
    {
      role: "assistant",
      content:
        "Initiating diagnostic sequence. Power core at 98%, thruster array online, life support nominal. All systems green.",
      timestamp: "09:00:33",
    },
    {
      role: "user",
      content: "What's the current threat assessment?",
      timestamp: "09:01:05",
    },
    {
      role: "assistant",
      content: "Threat level: LOW. No hostile signatures detected within 50km radius. Perimeter shields at full capacity.",
      timestamp: "09:01:07",
    },
  ];
}

export interface VehicleData {
  id: string;
  vehicleType: "excavator" | "truck" | "drone" | "robot" | "custom";
  volume1: { label: string; value: number; max: number };
  volume2: { label: string; value: number; max: number };
  status: "active" | "idle" | "offline";
  location?: string;
}

export function generateVehicles(): VehicleData[] {
  return [
    {
      id: "F39002",
      vehicleType: "excavator",
      volume1: { label: "Fuel", value: 67, max: 100 },
      volume2: { label: "Load", value: 84, max: 100 },
      status: "active",
      location: "SECTOR-7",
    },
    {
      id: "T12045",
      vehicleType: "truck",
      volume1: { label: "Fuel", value: 32, max: 100 },
      volume2: { label: "Cargo", value: 91, max: 100 },
      status: "idle",
      location: "BASE-ALPHA",
    },
    {
      id: "D00817",
      vehicleType: "drone",
      volume1: { label: "Battery", value: 78, max: 100 },
      volume2: { label: "Signal", value: 95, max: 100 },
      status: "active",
      location: "GRID-C4",
    },
  ];
}

export interface NodeData {
  id: string;
  label: string;
  x: number;
  y: number;
  status?: "active" | "inactive" | "warning";
}

export interface EdgeData {
  from: string;
  to: string;
  animated?: boolean;
}

export function generateNodes(): { nodes: NodeData[]; edges: EdgeData[] } {
  return {
    nodes: [
      { id: "core", label: "CORE", x: 50, y: 50, status: "active" },
      { id: "nav",  label: "NAV",  x: 20, y: 20, status: "active" },
      { id: "comm", label: "COMM", x: 80, y: 20, status: "active" },
      { id: "sens", label: "SENS", x: 20, y: 80, status: "warning" },
      { id: "pwr",  label: "PWR",  x: 80, y: 80, status: "inactive" },
    ],
    edges: [
      { from: "core", to: "nav",  animated: true },
      { from: "core", to: "comm", animated: true },
      { from: "core", to: "sens", animated: false },
      { from: "core", to: "pwr",  animated: false },
    ],
  };
}

export function generateTopography(size = 8): number[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.random())
  );
}

export function generateMiniBarData() {
  return [
    { label: "MON", value: 42 },
    { label: "TUE", value: 67 },
    { label: "WED", value: 55 },
    { label: "THU", value: 89 },
    { label: "FRI", value: 73 },
    { label: "SAT", value: 31 },
    { label: "SUN", value: 58 },
  ];
}

export function generateColorWheelSegments() {
  return [
    { label: "Navigation", value: 30, color: "#00C8FF" },
    { label: "Power",      value: 25, color: "#00FF9C" },
    { label: "Comms",      value: 20, color: "#FFB800" },
    { label: "Sensors",    value: 15, color: "#FF3E3E" },
    { label: "Life Sup.",  value: 10, color: "#7EC8E3" },
  ];
}
