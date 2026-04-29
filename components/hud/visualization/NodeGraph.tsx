"use client";

import { cn } from "@/lib/utils";

interface NodeData {
  id: string;
  label: string;
  x: number;
  y: number;
  status?: "active" | "inactive" | "warning";
}

interface EdgeData {
  from: string;
  to: string;
  animated?: boolean;
}

interface NodeGraphProps {
  nodes: NodeData[];
  edges: EdgeData[];
  width?: number;
  height?: number;
}

const statusColor = {
  active:   { stroke: "var(--hud-primary)",   fill: "rgba(0,200,255,0.1)" },
  inactive: { stroke: "var(--hud-text-dim)",   fill: "rgba(42,95,122,0.1)" },
  warning:  { stroke: "var(--hud-warning)",    fill: "rgba(255,184,0,0.1)" },
};

export function NodeGraph({ nodes, edges, width = 320, height = 220 }: NodeGraphProps) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const getPos = (n: NodeData) => ({
    x: (n.x / 100) * (width - 60) + 30,
    y: (n.y / 100) * (height - 40) + 20,
  });

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="var(--hud-border-bright)" fillOpacity={0.6} />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((edge, i) => {
        const from = nodeMap[edge.from];
        const to   = nodeMap[edge.to];
        if (!from || !to) return null;
        const fp = getPos(from);
        const tp = getPos(to);
        const mx = (fp.x + tp.x) / 2;
        const my = (fp.y + tp.y) / 2 - 20;
        const d  = `M ${fp.x} ${fp.y} Q ${mx} ${my} ${tp.x} ${tp.y}`;

        return (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke="var(--hud-border)"
              strokeWidth={1}
              markerEnd="url(#arrow)"
            />
            {edge.animated && (
              <path
                d={d}
                fill="none"
                stroke="var(--hud-primary)"
                strokeWidth={1.5}
                strokeDasharray="4 8"
                strokeOpacity={0.7}
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1s" repeatCount="indefinite" />
              </path>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const { x, y } = getPos(node);
        const s = statusColor[node.status ?? "inactive"];
        return (
          <g key={node.id} transform={`translate(${x}, ${y})`}>
            {node.status === "active" && (
              <rect
                x={-24} y={-14} width={48} height={28}
                rx={3} ry={3}
                fill={s.fill}
                stroke={s.stroke}
                strokeOpacity={0.3}
                style={{ filter: "blur(4px)" }}
              />
            )}
            <rect
              x={-22} y={-12} width={44} height={24}
              rx={2} ry={2}
              fill="var(--hud-surface)"
              stroke={s.stroke}
              strokeWidth={1}
            />
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fill={s.stroke}
              fontSize={9}
              fontFamily="var(--font-mono)"
              letterSpacing="0.1em"
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
