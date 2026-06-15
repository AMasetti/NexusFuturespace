# futurespace-ui

Sci-fi HUD and digital twin dashboard for the Optimus biped robot. Built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4.

Currently a **prototype** — sensor data is simulated. The goal is a real-time digital twin with live joint angles, sensor telemetry, and remote actuation over WebSocket.

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
  panels/               # ServoSliders, PowerConsumption, FloatingPanel, ...
  index.ts              # Barrel export — import all HUD components from here
lib/
  hud-data.ts           # Mock data and type definitions
  panels.ts             # Panel layout types, IDs, and initial positions
  persist.ts            # localStorage helpers (panels, camera, joint angles)
  utils.ts              # cn() helper
public/models/optimus/  # URDF + STL meshes for the 3D viewer
```

## HUD Panels

| Panel               | Description                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| Navigation Overlay  | Topographic map placeholder                                                                       |
| FreeRTOS · ESP32-C3 | Simulated task monitor — imu (200 Hz), cpg (100 Hz), telemetry (50 Hz), peripherals               |
| Servo Control       | Manual joint sliders for all 14 servo channels, grouped by limb, collapsible                      |
| Power Draw          | Simulated power consumption based on servo velocity — rolling 5 s chart, SG995/S3003 specs at 6 V |

Panel positions, camera orientation/zoom, and joint angles all persist to `localStorage` and restore on reload. Use the **Reset Layout** button in the header to clear saved state.

## 3D Viewer

`MujocoViewer` loads `public/models/optimus/Assembly.urdf` and renders each STL mesh as a dark fill + neon edge wireframe. Edge colours by part type: body = cyan, joints = aqua, tendons = green. Orbit controls with zoom/pan; camera state persists across reloads.

## Planned: Live Robot Integration

WebSocket API is defined in `optimus/firmware/src/comms/telemetry.cpp`:

- Connect to `ws://<robot-ip>:81`
- Receive JSON at 10 Hz: `{ t, pitch, roll, left: {hr,hp,k,ar}, right: {hr,hp,k,ar}, cpg: {...} }`
- Send commands: `set_period`, `set_amp_*`, `set_neutral`, `calibrate_imu`

The integration path: a React context/hook opens the WebSocket, parses state, and feeds live joint angles into `MujocoViewer` and the HUD panels.

## Deployment

Run locally or self-host. No cloud deployment configured.
