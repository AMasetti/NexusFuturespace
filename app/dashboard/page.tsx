"use client";

import {
  Mic, Shield, Radio, Zap, Eye, Navigation, Map,
  Activity, Cpu, Volume2, Settings, Lock, Wifi,
} from "lucide-react";

import {
  StatusBar, SystemStatsCard, WeatherCard, CameraFeed, UptimeCounter,
  ConversationPanel, ActionBar, SonarPulse, HudBadge, HudLabel,
} from "@/components/hud";

import { generateConversation } from "@/lib/hud-data";

const messages = generateConversation();

const ACTIONS = [
  { icon: <Mic className="w-4 h-4" />,        label: "Listen",   active: true  },
  { icon: <Shield className="w-4 h-4" />,      label: "Shield"                  },
  { icon: <Radio className="w-4 h-4" />,       label: "Comms"                   },
  { icon: <Zap className="w-4 h-4" />,         label: "Power"                   },
  { icon: <Eye className="w-4 h-4" />,         label: "Vision"                  },
  { icon: <Navigation className="w-4 h-4" />,  label: "Nav"                     },
  { icon: <Lock className="w-4 h-4" />,        label: "Lock"                    },
  { icon: <Wifi className="w-4 h-4" />,        label: "Link"                    },
];

export default function DashboardPage() {
  return (
    <div className="h-screen flex flex-col bg-hud-bg overflow-hidden">
      {/* Status bar */}
      <StatusBar
        systemName="J.A.R.V.I.S"
        status="online"
        location="SECTOR-7 / BASE ALPHA"
        temperature={{ value: 22, unit: "C" }}
      />

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-[260px_1fr_280px] gap-2 p-2 overflow-hidden">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 overflow-y-auto min-h-0">
          <SystemStatsCard
            cpu={63}
            ram={{ used: 7.2, total: 16 }}
            disk={{ used: 210, total: 512 }}
            live
          />
          <WeatherCard
            temperature={22}
            unit="C"
            city="New York, NY"
            condition="Overcast clouds"
            humidity={64}
            wind={3.2}
            feelsLike={20}
          />
          <CameraFeed active label="CAM-01" resolution="1920×1080" fps={30} />
          <UptimeCounter
            startTime={new Date(Date.now() - 3 * 3600 * 1000 - 14 * 60 * 1000)}
            sessions={3}
            commands={127}
            systemLoad={42}
            live
          />
        </div>

        {/* ── CENTER COLUMN ───────────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-between gap-2 overflow-hidden">
          {/* Sonar pulse */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full">
            {/* Decorative top lines */}
            <div className="w-full flex items-center gap-2 px-4">
              <div className="flex-1 h-px bg-hud-border/40" />
              <HudLabel text="Neural Interface" variant="dim" size="xs" />
              <div className="flex-1 h-px bg-hud-border/40" />
            </div>

            <SonarPulse
              active
              color="primary"
              size="lg"
              rings={5}
            />

            {/* System name */}
            <div className="flex flex-col items-center gap-2">
              <h2 className="font-display text-4xl font-bold text-hud-primary hud-glow-text tracking-[0.3em] uppercase">
                J.A.R.V.I.S
              </h2>
              <HudBadge variant="online" label="Listening for wake word..." pulse size="sm" />
            </div>

            {/* Decorative bottom lines */}
            <div className="w-full flex items-center gap-2 px-4">
              <div className="flex-1 h-px bg-hud-border/40" />
              <HudLabel text="v4.2.1 · All systems nominal" variant="dim" size="xs" mono />
              <div className="flex-1 h-px bg-hud-border/40" />
            </div>
          </div>

          {/* Action bar at bottom center */}
          <div className="pb-2">
            <ActionBar actions={ACTIONS} layout="horizontal" />
          </div>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
        <div className="flex flex-col overflow-hidden min-h-0">
          <ConversationPanel
            messages={messages}
            systemName="J.A.R.V.I.S"
          />
        </div>
      </div>
    </div>
  );
}
