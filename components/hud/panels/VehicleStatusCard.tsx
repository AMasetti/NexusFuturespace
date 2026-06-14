"use client";

import { Truck, Cog, Bot, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { HudStatusDot } from "../core/HudStatusDot";
import { HudProgressBar } from "../data/HudProgressBar";

interface VolumeBar {
  label: string;
  value: number;
  max: number;
}

interface VehicleStatusCardProps {
  id: string;
  vehicleType: "excavator" | "truck" | "drone" | "robot" | "custom";
  customIcon?: React.ReactNode;
  volume1: VolumeBar;
  volume2: VolumeBar;
  status?: "active" | "idle" | "offline";
  location?: string;
}

const VehicleIcon = {
  excavator: Cog,
  truck: Truck,
  drone: Plane,
  robot: Bot,
  custom: Cog,
};

const statusColor = {
  active: "border-hud-primary",
  idle: "border-hud-border",
  offline: "border-hud-danger/50",
};

const statusDot = {
  active: "online",
  idle: "warning",
  offline: "offline",
} as const;

export function VehicleStatusCard({
  id,
  vehicleType,
  customIcon,
  volume1,
  volume2,
  status = "active",
  location,
}: VehicleStatusCardProps) {
  const Icon = VehicleIcon[vehicleType];
  const v1Pct = Math.round((volume1.value / volume1.max) * 100);
  const v2Pct = Math.round((volume2.value / volume2.max) * 100);

  return (
    <div
      className={cn(
        "bg-hud-surface/90 hud-corners relative flex items-center gap-3 rounded-sm border p-3",
        statusColor[status]
      )}
    >
      {/* Status dot */}
      <div className="absolute top-2 right-2">
        <HudStatusDot status={statusDot[status]} size="sm" pulse={status === "active"} />
      </div>

      {/* Icon */}
      <div className="flex-shrink-0">
        {customIcon ?? <Icon className="text-hud-text-dim h-8 w-8" />}
      </div>

      {/* Bars */}
      <div className="flex flex-1 flex-col gap-1.5">
        <HudProgressBar
          label={volume1.label}
          value={v1Pct}
          color={v1Pct < 20 ? "danger" : v1Pct < 40 ? "warning" : "primary"}
          animated
          showValue
        />
        <HudProgressBar label={volume2.label} value={v2Pct} color="secondary" animated showValue />
        {location && <span className="text-hud-text-dim font-mono text-[8px]">{location}</span>}
      </div>

      {/* ID */}
      <div className="flex-shrink-0">
        <span className="text-hud-primary font-mono text-base leading-none font-bold">{id}</span>
      </div>
    </div>
  );
}
