"use client";

import { createContext, useContext } from "react";

// Which surface HUD panels render on. "glass" swaps the hard-edged HUD frame
// for a rounded, translucent card so existing panels can sit inside a frosted
// sidebar without each one knowing about it.
export type HudSurface = "hud" | "glass";

const HudSurfaceContext = createContext<HudSurface>("hud");

export const HudSurfaceProvider = HudSurfaceContext.Provider;

export function useHudSurface(): HudSurface {
  return useContext(HudSurfaceContext);
}
