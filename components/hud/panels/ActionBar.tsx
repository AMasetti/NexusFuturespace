"use client";

import { cn } from "@/lib/utils";

interface Action {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

interface ActionBarProps {
  actions: Action[];
  layout?: "horizontal" | "vertical";
}

export function ActionBar({ actions, layout = "horizontal" }: ActionBarProps) {
  return (
    <div className={cn("flex gap-1", layout === "vertical" && "flex-col")}>
      {actions.map((action, i) => (
        <button
          key={i}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150",
            "min-w-[48px]",
            action.active
              ? "border-hud-primary bg-hud-primary/10 text-hud-primary shadow-[0_0_8px_var(--hud-glow)]"
              : "border-hud-border bg-hud-surface-2 text-hud-text hover:border-hud-border-bright hover:brightness-125",
            action.disabled && "opacity-30 cursor-not-allowed pointer-events-none"
          )}
          onClick={action.onClick}
          disabled={action.disabled}
          aria-label={action.label}
          title={action.label}
        >
          <span className="w-4 h-4 flex items-center justify-center">{action.icon}</span>
          <span className="font-label text-[7px] uppercase tracking-widest leading-none">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
