# futurespace-ui

Sci-fi HUD component library and digital twin dashboard for monitoring the Optimus biped robot. Built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4.

Currently a **prototype** — all data is static/mocked. The goal is a real-time digital twin with live joint angles, sensor data, and remote actuation over WebSocket.

## Stack

- **Next.js 16** (App Router), React 19, TypeScript
- **Tailwind CSS v4** with custom HUD design tokens
- **Three.js / @react-three/fiber / drei** — 3D robot viewer
- **urdf-loader** — loads Optimus URDF + STL meshes
- **Framer Motion**, **Recharts**, **dnd-kit**, **Radix UI**, **Lucide**

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts

```bash
npm run dev        # Dev server
npm run build      # Production build
npm run lint       # ESLint
npm run type-check # TypeScript (no emit)
npm run format     # Prettier
```

## Routes

| Route        | Purpose                                                                      |
| ------------ | ---------------------------------------------------------------------------- |
| `/`          | Home                                                                         |
| `/robotics`  | Main HUD canvas — draggable/resizable floating panels with 3D Optimus viewer |
| `/showcase`  | Full component showcase — every HUD widget rendered for visual reference     |
| `/dashboard` | Alternate dashboard layout                                                   |

## Project Structure

```
app/                    # Next.js App Router pages
components/hud/         # HUD component library
  core/                 # HudPanel, HudBadge, HudLabel, HudSeparator, HudStatusDot
  data/                 # GaugeCircle, WaveformBar, HudProgressBar, LiveCounter, MiniBarChart
  visualization/        # MujocoViewer, TopographyMap, NodeGraph, ColorWheel, ...
  panels/               # SystemStatsCard, RoboticsPanel, UptimeCounter, ...
  index.ts              # Barrel export — import all HUD components from here
lib/
  hud-data.ts           # Mock data and type definitions
  utils.ts              # cn() helper
public/models/optimus/  # URDF + STL meshes for the 3D viewer
```

## Deployment

Run locally or self-host. No cloud deployment configured.
