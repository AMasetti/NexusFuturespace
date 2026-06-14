"use client";

import { BarChart, Bar, ResponsiveContainer, Cell } from "recharts";

interface MiniBarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: "primary" | "secondary" | "warning";
  showLabels?: boolean;
  animated?: boolean;
}

const colorMap = {
  primary: "var(--hud-primary)",
  secondary: "var(--hud-secondary)",
  warning: "var(--hud-warning)",
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
        <BarChart
          data={data}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
          barCategoryGap="20%"
        >
          <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={animated}>
            {data.map((_, i) => (
              <Cell key={i} fill={fill} fillOpacity={data[i].value === max ? 1 : 0.45} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {showLabels && (
        <div className="mt-1 flex justify-around">
          {data.map((d) => (
            <span key={d.label} className="text-hud-text-dim font-mono text-[8px] uppercase">
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
