"use client";

import { Mic, Shield, Radio, Zap, Eye, Navigation } from "lucide-react";

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
  SonarPulse,
  ColorWheel,
  NodeGraph,
  TopographyMap,
  MicroscopyViewer,
  CircuitSchematic,
  SystemStatsCard,
  WeatherCard,
  ConversationPanel,
  ResourceCounter,
  SuitViewer,
  VehicleStatusCard,
  UptimeCounter,
  CameraFeed,
  StatusBar,
  ActionBar,
  SensorInventoryPanel,
  RoboticsPanel,
  MujocoViewer,
} from "@/components/hud";

import {
  generateConversation,
  generateNodes,
  generateMiniBarData,
  generateColorWheelSegments,
} from "@/lib/hud-data";

const UPTIME_START = new Date(Date.now() - 3 * 3600 * 1000 - 14 * 60 * 1000);

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <h2 className="font-display text-hud-primary hud-glow-text text-2xl font-bold tracking-wider uppercase">
          {title}
        </h2>
        <div className="bg-hud-border h-px flex-1" />
      </div>
      {children}
    </section>
  );
}

// ─── Component card wrapper ────────────────────────────────────────────────────
function ComponentCard({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-hud-text-dim bg-hud-surface border-hud-border/50 rounded border px-2 py-0.5 font-mono text-[10px]">
          {name}
        </span>
      </div>
      <div className="border-hud-border/30 hud-panel-bg flex items-center justify-center rounded-sm border p-4">
        {children}
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const { nodes, edges } = generateNodes();
const messages = generateConversation();
const barData = generateMiniBarData();
const wheelSegs = generateColorWheelSegments();

const ACTIONS = [
  { icon: <Mic className="h-4 w-4" />, label: "Listen", active: true },
  { icon: <Shield className="h-4 w-4" />, label: "Shield" },
  { icon: <Radio className="h-4 w-4" />, label: "Comms" },
  { icon: <Zap className="h-4 w-4" />, label: "Power" },
  { icon: <Eye className="h-4 w-4" />, label: "Vision" },
  { icon: <Navigation className="h-4 w-4" />, label: "Nav" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ShowcasePage() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="border-hud-border/60 bg-hud-surface/60 sticky top-0 z-50 border-b px-8 py-6 backdrop-blur">
        <h1 className="font-display text-hud-primary hud-glow-text text-3xl font-bold tracking-widest uppercase">
          NEXUS HUD — Component Library
        </h1>
        <p className="font-label text-hud-text-dim mt-1 text-xs tracking-widest uppercase">
          Robotics · AI Assistant · Scientific Visualization
        </p>
      </div>

      <div className="flex flex-col gap-16 p-8">
        {/* ─── CORE ─────────────────────────────────────────────────────────── */}
        <Section id="core" title="Core Components">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <ComponentCard name="HudPanel (default)">
              <HudPanel title="Example Panel" status="online" className="w-full">
                <div className="text-hud-text-dim p-4 font-mono text-xs">
                  Panel content goes here
                </div>
              </HudPanel>
            </ComponentCard>

            <ComponentCard name="HudPanel (elevated + scanlines)">
              <HudPanel
                title="Elevated"
                status="warning"
                variant="elevated"
                scanlines
                className="w-full"
              >
                <div className="text-hud-text-dim p-4 font-mono text-xs">
                  Elevated with scanlines
                </div>
              </HudPanel>
            </ComponentCard>

            <ComponentCard name="HudBadge">
              <div className="flex flex-wrap justify-center gap-2">
                <HudBadge variant="online" label="Online" pulse />
                <HudBadge variant="offline" label="Offline" />
                <HudBadge variant="warning" label="Warning" pulse />
                <HudBadge variant="critical" label="Critical" pulse />
                <HudBadge variant="info" label="Info" />
                <HudBadge variant="neutral" label="Neutral" />
              </div>
            </ComponentCard>

            <ComponentCard name="HudLabel">
              <div className="flex flex-col items-start gap-2">
                <HudLabel text="Primary label" variant="primary" size="md" />
                <HudLabel text="Secondary label" variant="secondary" size="md" />
                <HudLabel text="Dim label" variant="dim" size="sm" />
                <HudLabel text="Danger label" variant="danger" size="sm" />
                <HudLabel text="Glow label" variant="primary" glow size="lg" />
                <HudLabel text="Mono data" variant="primary" mono size="sm" />
              </div>
            </ComponentCard>

            <ComponentCard name="HudStatusDot">
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <HudStatusDot status="online" size="lg" pulse />
                  <span className="font-label text-hud-text-dim text-[9px] uppercase">Online</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <HudStatusDot status="offline" size="lg" />
                  <span className="font-label text-hud-text-dim text-[9px] uppercase">Offline</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <HudStatusDot status="warning" size="lg" pulse />
                  <span className="font-label text-hud-text-dim text-[9px] uppercase">Warning</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <HudStatusDot status="critical" size="lg" pulse />
                  <span className="font-label text-hud-text-dim text-[9px] uppercase">
                    Critical
                  </span>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard name="HudSeparator">
              <div className="flex w-full flex-col gap-4">
                <HudSeparator />
                <HudSeparator bright />
                <div className="flex h-10 items-center gap-4">
                  <span className="font-label text-hud-text-dim text-xs uppercase">Left</span>
                  <HudSeparator orientation="vertical" />
                  <span className="font-label text-hud-text-dim text-xs uppercase">Right</span>
                </div>
              </div>
            </ComponentCard>
          </div>
        </Section>

        {/* ─── DATA ─────────────────────────────────────────────────────────── */}
        <Section id="data" title="Data Components">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <ComponentCard name="GaugeCircle">
              <div className="flex flex-wrap justify-center gap-4">
                <GaugeCircle value={72} label="CPU" color="primary" animated />
                <GaugeCircle value={45} label="RAM" color="secondary" animated />
                <GaugeCircle value={88} label="TEMP" unit="°C" color="danger" size="sm" animated />
              </div>
            </ComponentCard>

            <ComponentCard name="WaveformBar">
              <div className="flex w-full flex-col gap-4">
                <WaveformBar label="Signal A" color="primary" animated height={50} />
                <WaveformBar label="Signal B" color="secondary" animated height={50} />
              </div>
            </ComponentCard>

            <ComponentCard name="HudProgressBar">
              <div className="flex w-full flex-col gap-3">
                <HudProgressBar label="CPU" value={72} color="primary" animated />
                <HudProgressBar label="RAM" value={45} color="secondary" animated />
                <HudProgressBar label="DISK" value={88} color="warning" animated />
                <HudProgressBar label="TEMP" value={95} color="danger" animated />
              </div>
            </ComponentCard>

            <ComponentCard name="LiveCounter">
              <div className="flex flex-wrap justify-center gap-8">
                <LiveCounter value={1248} label="Packets" color="primary" animated live />
                <LiveCounter value={99.7} label="Uptime %" color="secondary" animated />
                <LiveCounter value={42} label="Alerts" color="warning" size="md" animated />
              </div>
            </ComponentCard>

            <ComponentCard name="MiniBarChart">
              <div className="w-full">
                <MiniBarChart data={barData} color="primary" showLabels animated height={80} />
              </div>
            </ComponentCard>
          </div>
        </Section>

        {/* ─── VISUALIZATION ────────────────────────────────────────────────── */}
        <Section id="visualization" title="Visualization Components">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <ComponentCard name="SonarPulse (active)">
              <SonarPulse active label="Listening for wake word..." color="primary" size="md" />
            </ComponentCard>

            <ComponentCard name="SonarPulse (inactive)">
              <SonarPulse active={false} label="Standby mode" color="secondary" size="md" />
            </ComponentCard>

            <ComponentCard name="ColorWheel">
              <ColorWheel segments={wheelSegs} size={180} innerLabel="SYSTEM" />
            </ComponentCard>

            <ComponentCard name="NodeGraph">
              <NodeGraph nodes={nodes} edges={edges} width={320} height={200} />
            </ComponentCard>

            <ComponentCard name="TopographyMap">
              <TopographyMap
                gridSize={8}
                contourLines
                highlighted={[9, 10, 17, 18]}
                coordinates={{ lat: "40.7128° N", lng: "74.0060° W" }}
              />
            </ComponentCard>

            <ComponentCard name="MicroscopyViewer">
              <div className="w-full max-w-[220px]">
                <MicroscopyViewer
                  magnification="X_300:1"
                  sectionId="CROSS_SECTION_M1PU774"
                  crosshair
                  scaleBar
                  annotations={[
                    { x: 35, y: 40, label: "Cell A" },
                    { x: 65, y: 60, label: "Cell B" },
                  ]}
                />
              </div>
            </ComponentCard>
          </div>
        </Section>

        {/* ─── PANELS ───────────────────────────────────────────────────────── */}
        <Section id="panels" title="Panel Components">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <ComponentCard name="SystemStatsCard">
              <SystemStatsCard
                cpu={63}
                ram={{ used: 7.2, total: 16 }}
                disk={{ used: 210, total: 512 }}
                live
              />
            </ComponentCard>

            <ComponentCard name="WeatherCard">
              <WeatherCard
                temperature={22}
                unit="C"
                city="New York, NY"
                condition="Overcast clouds"
                humidity={64}
                wind={3.2}
                feelsLike={20}
              />
            </ComponentCard>

            <ComponentCard name="UptimeCounter">
              <UptimeCounter
                startTime={UPTIME_START}
                sessions={3}
                commands={127}
                systemLoad={42}
                live
              />
            </ComponentCard>

            <ComponentCard name="ResourceCounter">
              <ResourceCounter
                title="Resource Monitor"
                metrics={[
                  { label: "Requests", value: 24891, unit: "req/s", delta: 12 },
                  { label: "Latency", value: 18, unit: "ms", delta: -3 },
                ]}
              />
            </ComponentCard>

            <ComponentCard name="VehicleStatusCard">
              <div className="flex w-full flex-col gap-2">
                <VehicleStatusCard
                  id="F39002"
                  vehicleType="excavator"
                  volume1={{ label: "Fuel", value: 67, max: 100 }}
                  volume2={{ label: "Load", value: 84, max: 100 }}
                  status="active"
                  location="SECTOR-7"
                />
                <VehicleStatusCard
                  id="T12045"
                  vehicleType="truck"
                  volume1={{ label: "Fuel", value: 32, max: 100 }}
                  volume2={{ label: "Cargo", value: 91, max: 100 }}
                  status="idle"
                  location="BASE-ALPHA"
                />
              </div>
            </ComponentCard>

            <ComponentCard name="SuitViewer">
              <SuitViewer
                label="UNIT ALPHA"
                status="active"
                hotspots={[
                  { position: { x: 50, y: 15 }, label: "Head", status: "ok" },
                  { position: { x: 50, y: 40 }, label: "Torso", status: "warning" },
                  { position: { x: 30, y: 65 }, label: "L-Arm", status: "ok" },
                ]}
                metrics={[
                  { label: "Power", value: "94%" },
                  { label: "Shield", value: "76%" },
                  { label: "Temp", value: "38°C" },
                ]}
              />
            </ComponentCard>

            <ComponentCard name="CameraFeed">
              <CameraFeed active label="CAM-01" resolution="1920×1080" fps={30} />
            </ComponentCard>

            <ComponentCard name="ActionBar">
              <ActionBar actions={ACTIONS} />
            </ComponentCard>

            <ComponentCard name="StatusBar">
              <div className="w-full overflow-x-auto">
                <StatusBar
                  systemName="J.A.R.V.I.S"
                  status="online"
                  location="SECTOR-7 / BASE ALPHA"
                  temperature={{ value: 22, unit: "C" }}
                />
              </div>
            </ComponentCard>
          </div>

          {/* Conversation Panel — full width */}
          <div className="grid grid-cols-1">
            <ComponentCard name="ConversationPanel">
              <div className="flex h-[500px] w-full">
                <ConversationPanel messages={messages} systemName="J.A.R.V.I.S" />
              </div>
            </ComponentCard>
          </div>
        </Section>

        {/* ─── ROBOTICS / CIRCUIT ───────────────────────────────────────────── */}
        <Section id="robotics" title="Robotics &amp; Circuit Components">
          {/* CircuitSchematic standalone */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ComponentCard name="CircuitSchematic — ESP32 + MPU-6050 + ADXL345 (I²C)">
              <CircuitSchematic
                boards={[
                  { type: "esp32", id: "mcu", x: 210, y: 40 },
                  { type: "mpu6050", id: "imu", x: 30, y: 70 },
                  { type: "adxl345", id: "accel", x: 30, y: 170 },
                ]}
                wires={[
                  {
                    from: { boardId: "imu", pin: "VCC" },
                    to: { boardId: "mcu", pin: "3V3" },
                    label: "3V3",
                  },
                  {
                    from: { boardId: "imu", pin: "GND" },
                    to: { boardId: "mcu", pin: "GND" },
                    label: "GND",
                  },
                  {
                    from: { boardId: "imu", pin: "SDA" },
                    to: { boardId: "mcu", pin: "D21" },
                    label: "SDA",
                  },
                  {
                    from: { boardId: "imu", pin: "SCL" },
                    to: { boardId: "mcu", pin: "D22" },
                    label: "SCL",
                  },
                  { from: { boardId: "accel", pin: "VCC" }, to: { boardId: "mcu", pin: "3V3" } },
                  { from: { boardId: "accel", pin: "GND" }, to: { boardId: "mcu", pin: "GND" } },
                  { from: { boardId: "accel", pin: "SDA" }, to: { boardId: "mcu", pin: "D21" } },
                  { from: { boardId: "accel", pin: "SCL" }, to: { boardId: "mcu", pin: "D22" } },
                ]}
                width={460}
                height={270}
                showPinLabels
                showGrid
              />
            </ComponentCard>

            <ComponentCard name="CircuitSchematic — Arduino Uno + MPU-6050 (I²C)">
              <CircuitSchematic
                boards={[
                  { type: "arduino-uno", id: "uno", x: 200, y: 60 },
                  { type: "mpu6050", id: "imu", x: 30, y: 100 },
                ]}
                wires={[
                  {
                    from: { boardId: "imu", pin: "VCC" },
                    to: { boardId: "uno", pin: "3V3" },
                    label: "3V3",
                  },
                  {
                    from: { boardId: "imu", pin: "GND" },
                    to: { boardId: "uno", pin: "GND" },
                    label: "GND",
                  },
                  {
                    from: { boardId: "imu", pin: "SDA" },
                    to: { boardId: "uno", pin: "A4" },
                    label: "SDA",
                  },
                  {
                    from: { boardId: "imu", pin: "SCL" },
                    to: { boardId: "uno", pin: "A5" },
                    label: "SCL",
                  },
                  {
                    from: { boardId: "imu", pin: "INT" },
                    to: { boardId: "uno", pin: "D2" },
                    label: "INT",
                  },
                ]}
                width={460}
                height={270}
                showPinLabels
                showGrid
              />
            </ComponentCard>

            <ComponentCard name="CircuitSchematic — ESP8266 + ADXL345">
              <CircuitSchematic
                boards={[
                  { type: "esp8266", id: "esp", x: 200, y: 50 },
                  { type: "adxl345", id: "ax", x: 30, y: 90 },
                ]}
                wires={[
                  {
                    from: { boardId: "ax", pin: "VCC" },
                    to: { boardId: "esp", pin: "3V3" },
                    label: "3V3",
                  },
                  {
                    from: { boardId: "ax", pin: "GND" },
                    to: { boardId: "esp", pin: "GND" },
                    label: "GND",
                  },
                  {
                    from: { boardId: "ax", pin: "SDA" },
                    to: { boardId: "esp", pin: "D2" },
                    label: "SDA",
                  },
                  {
                    from: { boardId: "ax", pin: "SCL" },
                    to: { boardId: "esp", pin: "D1" },
                    label: "SCL",
                  },
                ]}
                width={460}
                height={230}
                showPinLabels
                showGrid
              />
            </ComponentCard>

            <ComponentCard name="SensorInventoryPanel">
              <SensorInventoryPanel
                sensors={[
                  {
                    symbol: "He",
                    id: "IMU",
                    name: "MPU-6050",
                    status: "online",
                    value: "9.81 m/s²",
                    address: "0x68",
                  },
                  {
                    symbol: "Ne",
                    id: "POT",
                    name: "Servo Pot×3",
                    status: "online",
                    value: "127°",
                    address: "A0-2",
                  },
                  {
                    symbol: "Cl",
                    id: "ENCODER",
                    name: "Joint Encoder",
                    status: "warning",
                    value: "—",
                    address: "A3",
                  },
                  {
                    symbol: "Kr",
                    id: "CURRENT",
                    name: "INA219",
                    status: "online",
                    value: "1.42 A",
                    address: "0x40",
                  },
                  {
                    symbol: "Xe",
                    id: "COMPASS",
                    name: "HMC5883L",
                    status: "offline",
                    value: "—",
                    address: "0x1E",
                  },
                ]}
              />
            </ComponentCard>
          </div>

          {/* Full RoboticsPanel — wide */}
          <ComponentCard name="RoboticsPanel — Full HUMANOID-BOT Analysis View">
            <div className="w-full overflow-x-auto">
              <RoboticsPanel title="HUMANOID-BOT" unitLabel="PROTO-01 UNIT OVERVIEW" />
            </div>
          </ComponentCard>

          {/* MuJoCo / Optimus 3D viewer */}
          <ComponentCard name="MujocoViewer — Optimus Full · 3D Physics Visualization">
            <MujocoViewer className="w-full overflow-hidden rounded-sm" height={520} />
          </ComponentCard>
        </Section>
      </div>

      {/* Footer */}
      <div className="border-hud-border/40 border-t p-6 text-center">
        <span className="font-label text-hud-text-dim text-[10px] tracking-widest uppercase">
          NEXUS HUD · Component Library · v1.0.0
        </span>
      </div>
    </main>
  );
}
