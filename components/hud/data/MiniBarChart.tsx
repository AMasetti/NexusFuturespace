"use client";

import { BarChart, Bar, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";

interface MiniBarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: "primary" | "secondary" | "warning";
  showLabels?: boolean;
  animated?: boolean;
}

const colorMap = {
  primary:   "var(--hud-primary)",
  secondary: "var(--hud-secondary)",
  warning:   "var(--hud-warning)",
};

export function MiniBarChart({
  data,
  height = 80,
  color = "primary",
  showLabels = false,
  animated = false,
}: MiniBarChartProps) {
  const fill = colorMap[color];
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div className="w-full" style={{ height: showLabels ? height + 20 : height }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }} barCategoryGap="20%">
          <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={animated}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={fill}
                fillOpacity={data[i].value === max ? 1 : 0.45}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {showLabels && (
        <div className="flex justify-around mt-1">
          {data.map((d) => (
            <span key={d.label} className="font-mono text-[8px] text-hud-text-dim uppercase">
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
