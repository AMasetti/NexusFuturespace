"use client";

import {
  Mic, Shield, Radio, Zap, Eye, Cpu, Map, Navigation,
  Activity, Volume2, Settings,
} from "lucide-react";

import {
  HudPanel, HudBadge, HudLabel, HudSeparator, HudStatusDot,
  GaugeCircle, WaveformBar, HudProgressBar, LiveCounter, MiniBarChart,
  SonarPulse, ColorWheel, NodeGraph, TopographyMap, MicroscopyViewer,
  SystemStatsCard, WeatherCard, ConversationPanel, ResourceCounter,
  SuitViewer, VehicleStatusCard, UptimeCounter, CameraFeed, StatusBar, ActionBar,
} from "@/components/hud";

import {
  generateConversation, generateNodes, generateMiniBarData,
  generateColorWheelSegments,
} from "@/lib/hud-data";

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <h2 className="font-display text-2xl font-bold text-hud-primary hud-glow-text tracking-wider uppercase">
          {title}
        </h2>
        <div className="flex-1 h-px bg-hud-border" />
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
        <span className="font-mono text-[10px] text-hud-text-dim bg-hud-surface border border-hud-border/50 px-2 py-0.5 rounded">
          {name}
        </span>
      </div>
      <div className="p-4 border border-hud-border/30 rounded-sm bg-hud-surface/40 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const { nodes, edges } = generateNodes();
const messages = generateConversation();
const barData  = generateMiniBarData();
const wheelSegs = generateColorWheelSegments();

const ACTIONS = [
  { icon: <Mic className="w-4 h-4" />,        label: "Listen",   active: true  },
  { icon: <Shield className="w-4 h-4" />,      label: "Shield"                  },
  { icon: <Radio className="w-4 h-4" />,       label: "Comms"                   },
  { icon: <Zap className="w-4 h-4" />,         label: "Power"                   },
  { icon: <Eye className="w-4 h-4" />,         label: "Vision"                  },
  { icon: <Navigation className="w-4 h-4" />,  label: "Nav"                     },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ShowcasePage() {
  return (
    <main className="min-h-screen bg-hud-bg">
      {/* Header */}
      <div className="border-b border-hud-border/60 bg-hud-surface/60 px-8 py-6 sticky top-0 z-50 backdrop-blur">
        <h1 className="font-display text-3xl font-bold text-hud-primary hud-glow-text tracking-widest uppercase">
          NEXUS HUD — Component Library
        </h1>
        <p className="font-label text-xs text-hud-text-dim uppercase tracking-widest mt-1">
          Robotics · AI Assistant · Scientific Visualization
        </p>
      </div>

      <div className="p-8 flex flex-col gap-16">
        {/* ─── CORE ─────────────────────────────────────────────────────────── */}
        <Section id="core" title="Core Components">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <ComponentCard name="HudPanel (default)">
              <HudPanel title="Example Panel" status="online" className="w-full">
                <div className="p-4 font-mono text-xs text-hud-text-dim">Panel content goes here</div>
              </HudPanel>
            </ComponentCard>

            <ComponentCard name="HudPanel (elevated + scanlines)">
              <HudPanel title="Elevated" status="warning" variant="elevated" scanlines className="w-full">
                <div className="p-4 font-mono text-xs text-hud-text-dim">Elevated with scanlines</div>
              </HudPanel>
            </ComponentCard>

            <ComponentCard name="HudBadge">
              <div className="flex flex-wrap gap-2 justify-center">
                <HudBadge variant="online"   label="Online"   pulse />
                <HudBadge variant="offline"  label="Offline"  />
                <HudBadge variant="warning"  label="Warning"  pulse />
                <HudBadge variant="critical" label="Critical" pulse />
                <HudBadge variant="info"     label="Info"     />
                <HudBadge variant="neutral"  label="Neutral"  />
              </div>
            </ComponentCard>

            <ComponentCard name="HudLabel">
              <div className="flex flex-col gap-2 items-start">
                <HudLabel text="Primary label"   variant="primary"   size="md" />
                <HudLabel text="Secondary label" variant="secondary" size="md" />
                <HudLabel text="Dim label"        variant="dim"       size="sm" />
                <HudLabel text="Danger label"     variant="danger"    size="sm" />
                <HudLabel text="Glow label"       variant="primary"   glow size="lg" />
                <HudLabel text="Mono data"        variant="primary"   mono size="sm" />
              </div>
            </ComponentCard>

            <ComponentCard name="HudStatusDot">
              <div className="flex gap-6 items-center justify-center">
                <div className="flex flex-col items-center gap-1">
                  <HudStatusDot status="online"   size="lg" pulse />
                  <span className="font-label text-[9px] text-hud-text-dim uppercase">Online</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <HudStatusDot status="offline"  size="lg" />
                  <span className="font-label text-[9px] text-hud-text-dim uppercase">Offline</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <HudStatusDot status="warning"  size="lg" pulse />
                  <span className="font-label text-[9px] text-hud-text-dim uppercase">Warning</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <HudStatusDot status="critical" size="lg" pulse />
                  <span className="font-label text-[9px] text-hud-text-dim uppercase">Critical</span>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard name="HudSeparator">
              <div className="w-full flex flex-col gap-4">
                <HudSeparator />
                <HudSeparator bright />
                <div className="flex items-center h-10 gap-4">
                  <span className="font-label text-xs text-hud-text-dim uppercase">Left</span>
                  <HudSeparator orientation="vertical" />
                  <span className="font-label text-xs text-hud-text-dim uppercase">Right</span>
                </div>
              </div>
            </ComponentCard>
          </div>
        </Section>

        {/* ─── DATA ─────────────────────────────────────────────────────────── */}
        <Section id="data" title="Data Components">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <ComponentCard name="GaugeCircle">
              <div className="flex gap-4 flex-wrap justify-center">
                <GaugeCircle value={72} label="CPU" color="primary" animated />
                <GaugeCircle value={45} label="RAM" color="secondary" animated />
                <GaugeCircle value={88} label="TEMP" unit="°C" color="danger" size="sm" animated />
              </div>
            </ComponentCard>

            <ComponentCard name="WaveformBar">
              <div className="w-full flex flex-col gap-4">
                <WaveformBar label="Signal A" color="primary"   animated height={50} />
                <WaveformBar label="Signal B" color="secondary" animated height={50} />
              </div>
            </ComponentCard>

            <ComponentCard name="HudProgressBar">
              <div className="w-full flex flex-col gap-3">
                <HudProgressBar label="CPU"   value={72} color="primary"   animated />
                <HudProgressBar label="RAM"   value={45} color="secondary" animated />
                <HudProgressBar label="DISK"  value={88} color="warning"   animated />
                <HudProgressBar label="TEMP"  value={95} color="danger"    animated />
              </div>
            </ComponentCard>

            <ComponentCard name="LiveCounter">
              <div className="flex gap-8 flex-wrap justify-center">
                <LiveCounter value={1248} label="Packets"   color="primary"   animated live />
                <LiveCounter value={99.7} label="Uptime %"  color="secondary" animated />
                <LiveCounter value={42}   label="Alerts"    color="warning"   size="md" animated />
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                  annotations={[{ x: 35, y: 40, label: "Cell A" }, { x: 65, y: 60, label: "Cell B" }]}
                />
              </div>
            </ComponentCard>
          </div>
        </Section>

        {/* ─── PANELS ───────────────────────────────────────────────────────── */}
        <Section id="panels" title="Panel Components">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                startTime={new Date(Date.now() - 3 * 3600 * 1000 - 14 * 60 * 1000)}
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
                  { label: "Latency",  value: 18,    unit: "ms",    delta: -3 },
                ]}
              />
            </ComponentCard>

            <ComponentCard name="VehicleStatusCard">
              <div className="w-full flex flex-col gap-2">
                <VehicleStatusCard
                  id="F39002" vehicleType="excavator"
                  volume1={{ label: "Fuel", value: 67, max: 100 }}
                  volume2={{ label: "Load", value: 84, max: 100 }}
                  status="active" location="SECTOR-7"
                />
                <VehicleStatusCard
                  id="T12045" vehicleType="truck"
                  volume1={{ label: "Fuel", value: 32, max: 100 }}
                  volume2={{ label: "Cargo", value: 91, max: 100 }}
                  status="idle" location="BASE-ALPHA"
                />
              </div>
            </ComponentCard>

            <ComponentCard name="SuitViewer">
              <SuitViewer
                label="UNIT ALPHA"
                status="active"
                hotspots={[
                  { position: { x: 50, y: 15 }, label: "Head",  status: "ok" },
                  { position: { x: 50, y: 40 }, label: "Torso", status: "warning" },
                  { position: { x: 30, y: 65 }, label: "L-Arm", status: "ok" },
                ]}
                metrics={[
                  { label: "Power",  value: "94%" },
                  { label: "Shield", value: "76%" },
                  { label: "Temp",   value: "38°C" },
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
              <div className="w-full h-[500px] flex">
                <ConversationPanel messages={messages} systemName="J.A.R.V.I.S" />
              </div>
            </ComponentCard>
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div className="border-t border-hud-border/40 p-6 text-center">
        <span className="font-label text-[10px] uppercase tracking-widest text-hud-text-dim">
          NEXUS HUD · Component Library · v1.0.0
        </span>
      </div>
    </main>
  );
}
