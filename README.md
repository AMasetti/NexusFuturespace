# futurespace-ui

Sci-fi HUD digital twin for the Optimus biped robot. Built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4.

Connects to the robot over **ROS 2 + rosbridge** — live IMU telemetry, real-time joint tracking, and bidirectional servo control from the browser.

## Stack

| Layer      | Tech                                               |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19, TypeScript      |
| Styling    | Tailwind CSS v4, custom HUD design tokens          |
| 3D viewer  | Three.js / @react-three/fiber / drei, urdf-loader  |
| ROS bridge | roslib (WebSocket client → rosbridge_suite)        |
| UI extras  | Framer Motion, Recharts, dnd-kit, Radix UI, Lucide |

## Running locally (dev)

```bash
cd futurespace-ui
npm install
npm run dev        # http://localhost:3000/robotics
```

For live robot data, also run the Docker stack (see [../docker/](../docker/)).

## Scripts

```bash
npm run dev        # Dev server with hot reload
npm run build      # Production build
npm run lint       # ESLint
```

## Docker deployment

The production stack is two containers managed by `../docker/compose.yml`:

```bash
cd docker
docker compose up --build
# UI: http://localhost:3010/robotics
```

| Container        | Role                                                        |
| ---------------- | ----------------------------------------------------------- |
| `ros2-bridge`    | Connects to `ws://optimus.local:81`, publishes ROS 2 topics |
| `futurespace-ui` | Next.js on :3000 + rosbridge (`wss://`) on :9090            |

`NEXT_PUBLIC_ROS_WS_URL` is baked at build time — changing it requires `--build`.

## Architecture

```
Robot (ESP32-C3)
  ws://optimus.local:81   ← plain WS, LAN only
        │
        ▼
  ros2-bridge container (ROS 2 Humble)
        │  publishes
        ├─ /optimus/imu/raw          (sensor_msgs/Imu)
        ├─ /optimus/imu/orientation  (geometry_msgs/Vector3Stamped)
        ├─ /optimus/imu/gravity      (geometry_msgs/Vector3Stamped)
        └─ /optimus/joint_states     (sensor_msgs/JointState)
        │  subscribes
        ├─ /optimus/cmd/joint        → set_joint WS command
        ├─ /optimus/cmd/neutral      → set_neutral WS command
        └─ /optimus/cmd/calibrate_imu
        │
        ▼
  rosbridge_suite   wss://:9090   ← TLS termination here
        │
        ▼
  Browser — lib/ros.tsx (RosProvider + useRosTopic hooks)
        │
        ├─ IMU Live panel  — pitch, roll, yaw rate, accel/gyro, gravity arrow
        ├─ Servo Control   — observe mode (tracks robot) / override mode (controls robot)
        └─ Power Draw      — modelled current from joint velocity (MG995 physics)
```

## Control modes

| Mode                  | Behaviour                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Observe** (default) | Sliders and 3D viewer track the robot's live joint set points. Read-only.                                                                                                                                 |
| **Override**          | Click "Take Control" — sliders pre-load to the robot's current pose (zero-jerk), become interactive. Moving a slider publishes immediately to `/optimus/cmd/joint`. Click "Release Control" to hand back. |

When `NEXT_PUBLIC_ROS_WS_URL` is unset or rosbridge is unreachable, the UI falls back to simulated data and all panels still work.

## Routes

| Route        | Purpose                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| `/robotics`  | Main HUD canvas — draggable/resizable floating panels with live 3D Optimus viewer |
| `/showcase`  | Full component showcase — every HUD widget rendered for visual reference          |
| `/dashboard` | Alternate dashboard layout                                                        |

## Project structure

```
app/
  robotics/page.tsx       # Main HUD page — panels, control mode state machine
components/hud/
  core/                   # HudPanel, HudBadge, HudLabel, HudSeparator, HudStatusDot
  data/                   # GaugeCircle, WaveformBar, HudProgressBar, LiveCounter
  visualization/          # MujocoViewer, TopographyMap, ...
  panels/
    ServoSliders.tsx      # 14-channel servo control (readOnly + headerExtra props)
    PowerConsumption.tsx  # MG995/S3003 servo power model
    FloatingPanel.tsx     # Drag/resize panel container
lib/
  ros.tsx                 # RosProvider, useRosTopic, useRosStatus, useRosPublish
  panels.ts               # Panel layout types, IDs, initial positions
  persist.ts              # localStorage helpers (panels, camera, joints)
public/models/optimus/    # URDF + 24 STL meshes for the 3D viewer
```

## HUD panels

| Panel               | Data source                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| IMU · MPU6050       | `/optimus/imu/orientation` + `/optimus/imu/raw` — pitch, roll, yaw rate, accel/gyro bars, gravity arrow |
| FreeRTOS · ESP32-C3 | Static — task list, stack sizes, peripheral info (200 Hz IMU, 100 Hz CPG, 50 Hz telemetry)              |
| Servo Control       | `/optimus/joint_states` in observe mode; publishes `/optimus/cmd/joint` in override mode                |
| Power Draw          | Modelled from joint velocity using MG995 servo physics (idle 0.36 A → stall 2.0 A at 6 V)               |
| Navigation Overlay  | Topographic map placeholder                                                                             |

Panel positions, camera state, and joint angles persist to `localStorage`. **Reset Layout** in the header clears all saved state.

## TLS

rosbridge runs with a self-signed TLS cert generated on first container boot (`/etc/rosbridge-tls/`). On first use, visit `https://localhost:9090` in your browser, accept the cert, then reload the UI. You only need to do this once per browser profile.
