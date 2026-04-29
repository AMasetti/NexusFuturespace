"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { HudPanel } from "../core/HudPanel";
import { LiveCounter } from "../data/LiveCounter";
import { HudSeparator } from "../core/HudSeparator";

interface Metric {
  label: string;
  value: number;
  unit: string;
  delta?: number;
}

interface ResourceCounterProps {
  metrics: Metric[];
  title?: string;
  subtitle?: string;
  layout?: "horizontal" | "vertical";
}

export function ResourceCounter({
  metrics,
  title = "Resources",
  subtitle,
  layout = "horizontal",
}: ResourceCounterProps) {
  return (
    <HudPanel title={title} subtitle={subtitle} status="online" cornerBrackets>
      <div className={`p-3 flex ${layout === "horizontal" ? "flex-row" : "flex-col"} gap-4`}>
        {metrics.map((metric, i) => (
          <div key={i} className="flex-1 flex flex-col gap-1">
            {i > 0 && layout === "horizontal" && (
              <HudSeparator orientation="vertical" className="absolute" />
            )}
            <LiveCounter
              value={metric.value}
              label={metric.label}
              unit={metric.unit}
              size="lg"
              animated
              live
            />
            {metric.delta !== undefined && (
              <div className="flex items-center gap-1 justify-center">
                {metric.delta > 0 ? (
                  <TrendingUp className="w-3 h-3 text-hud-secondary" />
                ) : metric.delta < 0 ? (
                  <TrendingDown className="w-3 h-3 text-hud-danger" />
                ) : (
                  <Minus className="w-3 h-3 text-hud-text-dim" />
                )}
                <span
                  className={`font-mono text-[9px] ${
                    metric.delta > 0 ? "text-hud-secondary" : metric.delta < 0 ? "text-hud-danger" : "text-hud-text-dim"
                  }`}
                >
                  {metric.delta > 0 ? "+" : ""}{metric.delta}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </HudPanel>
  );
}
