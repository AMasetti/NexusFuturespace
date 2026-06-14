@AGENTS.md

# futurespace-ui — Robotics Digital Twin UI

Next.js 16 sci-fi HUD component library and digital twin dashboard for monitoring Optimus (and future robots). Currently a **prototype** — all data is static/mocked, no live robot connection yet. The goal is a real-time digital twin with live joint angles, sensor data, and remote actuation over WebSocket.

## Stack

- **Next.js 16** (App Router) — see `AGENTS.md` for breaking changes vs older versions
- **React 19**, TypeScript, Tailwind CSS v4
- **Three.js / @react-three/fiber / drei** — 3D robot viewer
- **urdf-loader** — loads Optimus URDF from `public/models/optimus/Assembly.urdf`
- **Framer Motion**, **Recharts**, **dnd-kit** (drag/resize panels), **Radix UI**, **Lucide**

## Dev

```bash
cd futurespace-ui
npm run dev    # http://localhost:3000
npm run build
npm run lint
```

## Routes

| Route        | Purpose                                                                                 |
| ------------ | --------------------------------------------------------------------------------------- |
| `/`          | Landing / home                                                                          |
| `/robotics`  | **Main page.** Floating HUD panel canvas with 3D Optimus viewer centered behind panels. |
| `/showcase`  | Full component showcase — every HUD widget rendered for visual reference.               |
| `/dashboard` | Alternate dashboard layout.                                                             |

## Project Structure

```
app/
  layout.tsx          # Fonts: Rajdhani (display), JetBrains Mono, Exo 2
  globals.css         # CSS variables: --hud-bg, --hud-primary, --hud-text, --hud-border, etc.
  page.tsx            # Home
  robotics/page.tsx   # Main HUD canvas with floating/resizable panels
  showcase/page.tsx   # Component showcase
  dashboard/page.tsx  # Dashboard layout

components/hud/
  index.ts            # Re-exports all HUD components — import from here
  core/               # HudPanel, HudBadge, HudLabel, HudSeparator, HudStatusDot
  data/               # GaugeCircle, WaveformBar, HudProgressBar, LiveCounter, MiniBarChart
  visualization/      # MujocoViewer, TopographyMap, SonarPulse, NodeGraph, ColorWheel,
                      # MicroscopyViewer, CircuitSchematic
  panels/             # SystemStatsCard, WeatherCard, ConversationPanel, ResourceCounter,
                      # SuitViewer, VehicleStatusCard, UptimeCounter, CameraFeed,
                      # StatusBar, ActionBar, SensorInventoryPanel, RoboticsPanel

lib/
  hud-data.ts         # Mock data generators (waveform, system stats, conversations, etc.)
  utils.ts            # cn() helper (clsx + tailwind-merge)

public/
  models/optimus/     # URDF + STL meshes for the 3D viewer
    Assembly.urdf
    meshes/*.stl      # 24 STL files (body segments, joints, tendons)

Mujuco/Optimus Full/  # MuJoCo XML + same STL meshes (source of truth for mesh files)
```

## 3D Robot Viewer (MujocoViewer)

`components/hud/visualization/MujocoViewer.tsx` — the centerpiece of `/robotics`.

- Loads `public/models/optimus/Assembly.urdf` via `urdf-loader`
- Renders each STL as a **dark fill mesh** (occludes back faces) + **neon edge lines** on top — gives the wireframe HUD aesthetic
- Edge color by part type: body=cyan `#00C8FF`, joints=aqua `#00FFFF`, tendons=green `#00FF9C`
- Slow idle bob animation (`sin(t * 0.8) * 0.005` on Y)
- Auto-rotate toggle button (bottom-left)
- HUD overlay shows model stats (DOF: 23, bodies: 25, meshes: 24)

**No live joint data yet.** The next step is wiring the Optimus WebSocket telemetry (`ws://<robot-ip>:81`) into this viewer to drive actual joint angles in real time.

## Floating Panel Canvas (/robotics)

- Panels are freely draggable (grip handle top-right) and resizable (right/bottom/corner)
- Snap-to-grid: 40px grid aligned to viewport so dots and panels always align
- z-order: clicking a panel brings it to front
- Current panels: Joint Status, Power Systems, Nav Overlay, Motor Telemetry, System Metrics, Mission Status
- All data is static/mocked — these panels will eventually consume live WebSocket data from Optimus

## HUD Design System

All components live under `components/hud/` and are exported from `components/hud/index.ts`.

CSS color tokens (defined in `globals.css`):

- `hud-bg` — dark background
- `hud-primary` — cyan accent (`#00C8FF`)
- `hud-secondary` — teal accent
- `hud-warning` — amber/warning
- `hud-text`, `hud-border` — text and border

Fonts: `font-display` = Rajdhani, `font-mono` = JetBrains Mono.

## Planned: Live Robot Integration

The WebSocket API is already defined in `optimus/firmware/src/comms/telemetry.cpp`:

- Connect to `ws://<robot-ip>:81`
- Receive JSON at 10 Hz: `{ t, pitch, roll, left: {hr,hp,k,ar}, right: {hr,hp,k,ar}, cpg: {...} }`
- Send commands: `set_period`, `set_amp_*`, `set_neutral`, `calibrate_imu`

The integration path: create a React context/hook that opens the WebSocket, parses state, and feeds it into `MujocoViewer` (to drive joint angles) and the HUD panels (to show live sensor values).
