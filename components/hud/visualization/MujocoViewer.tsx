"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import URDFLoader, { type URDFRobot as URDFRobotType } from "urdf-loader";
import { STLLoader, OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { JOINT_LABELS, type JointAngles } from "@/components/hud/panels/ServoSliders";
import type { CameraState } from "@/lib/persist";
import { HudPanel } from "@/components/hud/core/HudPanel";

const PI = Math.PI;
const H = PI / 2;

// ─── Neon edge materials ──────────────────────────────────────────────────────

const MAT_BODY = new THREE.LineBasicMaterial({ color: "#00C8FF" });
const MAT_JOINT = new THREE.LineBasicMaterial({ color: "#00FFFF" });
const MAT_TENDON = new THREE.LineBasicMaterial({ color: "#00FF9C" });

// Edge colour for the link under the cursor / being dragged.
const MAT_ACTIVE = new THREE.LineBasicMaterial({ color: "#FFD166" });

function pickEdgeMat(path: string) {
  const n = (path.split("/").pop() ?? "").toLowerCase();
  if (n.includes("knee") || n.includes("anckle") || n.includes("hip-l") || n.includes("hip-r"))
    return MAT_JOINT;
  if (n.includes("sartorius") || n.includes("tendon")) return MAT_TENDON;
  return MAT_BODY;
}

// ─── Drag-to-rotate ───────────────────────────────────────────────────────────

// Which servo turns when a link is grabbed. The URDF names are legacy
// (Servo-Knee-*-Top is the hip pitch), and the parallelogram bars hang off
// passive joints, so this follows what visibly moves each part.
const LINK_TO_JOINT: Partial<Record<string, keyof JointAngles>> = {
  "Showlder-L": "Servo-Showlder-L-Front-Back",
  "Showlder-R": "Servo-Showlder-R-Front-Back",
  "Arm-L": "Servo-Showlder-L-Inward-Outward",
  "Arm-R": "Servo-Showlder-R-Inward-Outward",
  "Forearm-L": "Servo-Forearm-L",
  "Forearm-R": "Servo-Forearm-R",
  "Hip-L": "Servo-Hip-L",
  "Hip-R": "Servo-Hip-R",
  "Knee-L": "Servo-Knee-L-Top",
  "Knee-R": "Servo-Knee-R-Top",
  "Sartorius-LT": "Servo-Knee-L-Top",
  "Sartorius-RT": "Servo-Knee-R-Top",
  "Tendon-LT": "Servo-Knee-L-Top",
  "Tendon-RT": "Servo-Knee-R-Top",
  "Sartorius-LB": "Servo-Knee-L-Bottom",
  "Sartorius-RB": "Servo-Knee-R-Bottom",
  "Tendon-LB": "Servo-Knee-L-Bottom",
  "Tendon-RB": "Servo-Knee-R-Bottom",
  "Anckle-L": "Servo-Knee-L-Bottom",
  "Anckle-R": "Servo-Knee-R-Bottom",
  "Feet-L": "Servo-Ankle-L",
  "Feet-R": "Servo-Ankle-R",
};

// Sign between a JointAngles value and the URDF joint value (see useFrame below).
const URDF_SIGN: Partial<Record<keyof JointAngles, number>> = {
  "Servo-Knee-L-Top": -1,
  "Servo-Knee-R-Top": -1,
  "Servo-Knee-L-Bottom": -1,
  "Servo-Ankle-L": -1,
  "Servo-Showlder-R-Front-Back": -1,
  "Servo-Showlder-L-Inward-Outward": -1,
  "Servo-Forearm-L": -1,
};

// Same travel as the sliders: 0–180° display = ±90° around halt.
const JOINT_LIMIT = H;

export interface JointDragHandlers {
  onDrag: (key: keyof JointAngles, rad: number, clientX: number, clientY: number) => void;
  onEnd: (key: keyof JointAngles, rad: number) => void;
}

type URDFNode = THREE.Object3D & { isURDFLink?: boolean; isURDFJoint?: boolean };

function linkOf(obj: THREE.Object3D | null): URDFNode | null {
  let o = obj as URDFNode | null;
  while (o && !o.isURDFLink) o = o.parent as URDFNode | null;
  return o;
}

// Swap the edge material of a link's own meshes (not its child links).
function highlightLink(link: URDFNode, on: boolean) {
  for (const child of link.children as URDFNode[]) {
    if (child.isURDFJoint) continue;
    child.traverse((o) => {
      if (o instanceof THREE.LineSegments) o.material = on ? MAT_ACTIVE : o.userData.baseMat;
    });
  }
}

// ─── URDF robot ───────────────────────────────────────────────────────────────

function URDFRobot({
  controlsRef,
  anglesRef,
  initialCamera,
  dragRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  anglesRef: React.RefObject<JointAngles | undefined>;
  initialCamera: CameraState | null;
  dragRef: React.RefObject<JointDragHandlers | null>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const rootRef = useRef<THREE.Group>(null);
  const robotRef = useRef<URDFRobotType | null>(null);
  const hoverRef = useRef<URDFNode | null>(null);
  const draggingRef = useRef(false);
  const { camera, gl } = useThree();
  // Canvas element in a ref: event handlers may mutate refs, not hook values.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    canvasRef.current = gl.domElement;
  }, [gl]);
  const setCursor = (cursor: string) => {
    if (canvasRef.current) canvasRef.current.style.cursor = cursor;
  };

  const setHover = (link: URDFNode | null) => {
    if (hoverRef.current === link) return;
    if (hoverRef.current) highlightLink(hoverRef.current, false);
    hoverRef.current = link;
    if (link) highlightLink(link, true);
    setCursor(link ? "grab" : "");
  };

  const draggableLink = (obj: THREE.Object3D) => {
    if (!dragRef.current) return null;
    const link = linkOf(obj);
    return link && LINK_TO_JOINT[link.name] ? link : null;
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingRef.current) setHover(draggableLink(e.object));
  };

  const onPointerOut = () => {
    if (!draggingRef.current) setHover(null);
  };

  // Knob-style drag: the joint turns by the angle the cursor sweeps around the
  // joint's on-screen pivot, so the part follows the mouse from any viewpoint.
  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    const robot = robotRef.current;
    const link = e.button === 0 ? draggableLink(e.object) : null;
    const key = link ? LINK_TO_JOINT[link.name] : undefined;
    const joint = key && robot?.joints[key];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!link || !key || !joint || !rect) return;
    e.stopPropagation();

    const controls = controlsRef.current;
    if (controls) controls.enabled = false;
    draggingRef.current = true;
    setHover(link);
    setCursor("grabbing");

    const pivot = joint.getWorldPosition(new THREE.Vector3());
    const ndc = pivot.clone().project(camera);
    const cx = rect.left + ((ndc.x + 1) / 2) * rect.width;
    const cy = rect.top + ((1 - ndc.y) / 2) * rect.height;
    // A positive turn about an axis pointing at the camera looks counter-clockwise.
    const axis = joint.axis.clone().transformDirection(joint.matrixWorld);
    const facing = axis.dot(camera.position.clone().sub(pivot)) >= 0 ? 1 : -1;
    const sign = facing * (URDF_SIGN[key] ?? 1);

    let last = Math.atan2(e.clientY - cy, e.clientX - cx);
    let value = anglesRef.current?.[key] ?? 0;

    const move = (ev: PointerEvent) => {
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      let d = a - last;
      if (d > PI) d -= 2 * PI;
      if (d < -PI) d += 2 * PI;
      last = a;
      // Screen y points down, so a growing atan2 is clockwise: negate for CCW.
      value = THREE.MathUtils.clamp(value - d * sign, -JOINT_LIMIT, JOINT_LIMIT);
      dragRef.current?.onDrag(key, value, ev.clientX, ev.clientY);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (controls) controls.enabled = true;
      draggingRef.current = false;
      setHover(null);
      dragRef.current?.onEnd(key, value);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const manager = new THREE.LoadingManager();
    const loader = new URDFLoader(manager);

    loader.loadMeshCb = (path, _mgr, done) => {
      const stl = new STLLoader(_mgr);
      stl.load(
        path,
        (geo) => {
          geo.computeVertexNormals();
          const fill = new THREE.Mesh(
            geo,
            new THREE.MeshBasicMaterial({
              color: "#020B14",
              polygonOffset: true,
              polygonOffsetFactor: 1,
              polygonOffsetUnits: 1,
            })
          );
          const edges = new THREE.EdgesGeometry(geo, 15);
          const lines = new THREE.LineSegments(edges, pickEdgeMat(path));
          lines.userData.baseMat = lines.material;
          const wrapper = new THREE.Group();
          wrapper.add(fill);
          wrapper.add(lines);
          done(wrapper);
        },
        undefined,
        (err) => done(new THREE.Object3D(), err as unknown as Error)
      );
    };

    manager.onLoad = () => {
      if (!group.children.length) return;
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      group.position.x = -center.x;
      group.position.z = -center.z;
      group.position.y = -box.min.y;

      if (controlsRef.current) {
        if (initialCamera) {
          // Restore saved camera — applied here so it runs after model centering
          camera.position.set(initialCamera.px, initialCamera.py, initialCamera.pz);
          controlsRef.current.target.set(initialCamera.tx, initialCamera.ty, initialCamera.tz);
        } else {
          // Default: orbit around model center
          const modelCenter = new THREE.Vector3(0, (box.max.y - box.min.y) / 2, 0);
          controlsRef.current.target.copy(modelCenter);
        }
        controlsRef.current.update();
      }
    };

    loader.load("/models/optimus/Assembly.urdf", (robot) => {
      robot.rotation.x = -H;
      robotRef.current = robot;
      group.add(robot);
    });

    return () => {
      while (group.children.length) group.remove(group.children[0]);
    };
  }, [controlsRef, camera, initialCamera]);

  useFrame(({ clock }) => {
    // Idle bob
    if (rootRef.current)
      rootRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.8) * 0.005;

    const robot = robotRef.current;
    const angles = anglesRef.current;
    if (!robot || !angles) return;

    const {
      "Servo-Hip-L": hipL,
      "Servo-Hip-R": hipR,
      "Servo-Knee-L-Top": kneeLTop,
      "Servo-Knee-R-Top": kneeRTop,
      "Servo-Knee-L-Bottom": kneeLBot,
      "Servo-Knee-R-Bottom": kneeRBot,
      "Servo-Ankle-L": ankleL,
      "Servo-Ankle-R": ankleR,
      "Servo-Showlder-L-Front-Back": shldrLFB,
      "Servo-Showlder-R-Front-Back": shldrRFB,
      "Servo-Showlder-L-Inward-Outward": shldrLLat,
      "Servo-Showlder-R-Inward-Outward": shldrRLat,
      "Servo-Forearm-L": forearmL,
      "Servo-Forearm-R": forearmR,
    } = angles;

    // Actuated joints — signs match hardware convention verified 2026-08-11
    robot.setJointValue("Servo-Hip-L", hipL);
    robot.setJointValue("Servo-Hip-R", hipR);
    robot.setJointValue("Servo-Knee-L-Top", -kneeLTop); // Hip Pitch L inverted in URDF
    robot.setJointValue("Servo-Knee-R-Top", -kneeRTop); // Hip Pitch R inverted in URDF
    robot.setJointValue("Servo-Knee-L-Bottom", -kneeLBot); // Knee Bend L inverted in URDF
    robot.setJointValue("Servo-Knee-R-Bottom", kneeRBot);
    robot.setJointValue("Servo-Ankle-L", -ankleL); // Ankle Roll L inverted in URDF
    robot.setJointValue("Servo-Ankle-R", ankleR);
    robot.setJointValue("Servo-Showlder-L-Front-Back", shldrLFB);
    robot.setJointValue("Servo-Showlder-R-Front-Back", -shldrRFB); // Shoulder FB R inverted in URDF
    // Shoulder lat: URDF 0 = arms lateral, hardware 0 = T-pose → offset -π/2; L also inverted
    robot.setJointValue("Servo-Showlder-L-Inward-Outward", -shldrLLat - Math.PI / 2);
    robot.setJointValue("Servo-Showlder-R-Inward-Outward", shldrRLat - Math.PI / 2);
    robot.setJointValue("Servo-Forearm-L", -forearmL); // Forearm Lat L inverted in URDF
    robot.setJointValue("Servo-Forearm-R", forearmR);

    // ── Left leg parallelogram ─────────────────────────────────────────────────
    // Sartorius-LT (parent=Hip-L): counter-rotates so it stays vertical in world
    robot.setJointValue("Unactuated-Knee-L-Top", -kneeLTop);
    robot.setJointValue("Unactuated-Tendon-L-Top", -kneeLTop);
    // Anckle-L (parent=Sartorius-LB): world angle = hipL + (-hipL) + kneeLTop + kneeLBot + θ
    // For ankle to stay level → θ = -(kneeLTop + kneeLBot)
    robot.setJointValue("Unactuated-Knee-L-Bottom", -kneeLBot);
    // Tendon-LB parent is Anckle-L (not Sartorius-LB), so it must also cancel ankleL
    robot.setJointValue("Unactuated-Tendon-L-Bottom", kneeLBot);

    // ── Right leg parallelogram ────────────────────────────────────────────────
    // R joints have axis=−Z: a value θ rotates −θ physically, so formulas are
    // sign-flipped vs left to produce the same physical counter-rotation.
    robot.setJointValue("Unactuated-Knee-R-Top", -kneeRTop);
    robot.setJointValue("Unactuated-Tendon-R-Top", -kneeRTop);
    robot.setJointValue("Unactuated-Knee-R-Bottom", -kneeRBot);
    robot.setJointValue("Unactuated-Tendon-R-Bottom", kneeRBot);
  });

  return (
    <group ref={rootRef}>
      <group
        ref={groupRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
      />
    </group>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene({
  autoRotate,
  anglesRef,
  initialCamera,
  onCameraChange,
  dragRef,
}: {
  autoRotate: boolean;
  anglesRef: React.RefObject<JointAngles | undefined>;
  initialCamera: CameraState | null;
  onCameraChange: (state: CameraState) => void;
  dragRef: React.RefObject<JointDragHandlers | null>;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  // Save camera when the user finishes a drag/zoom gesture
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const handler = () => {
      const cam = controls.object;
      onCameraChange({
        px: cam.position.x,
        py: cam.position.y,
        pz: cam.position.z,
        tx: controls.target.x,
        ty: controls.target.y,
        tz: controls.target.z,
      });
    };
    controls.addEventListener("end", handler);
    return () => controls.removeEventListener("end", handler);
  }, [onCameraChange]);

  return (
    <>
      <ambientLight intensity={1.2} color="#4488aa" />
      <directionalLight
        position={[2, 5, 3]}
        intensity={3.0}
        color="#a0d8ef"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
      />
      <directionalLight position={[-3, 2, -2]} intensity={1.5} color="#00C8FF" />
      <directionalLight position={[0, -3, 2]} intensity={0.8} color="#ffffff" />
      <pointLight position={[0, 2.5, 1]} intensity={2.0} color="#00C8FF" distance={8} decay={2} />
      <pointLight position={[0, 0.5, 0]} intensity={1.0} color="#ffffff" distance={4} decay={2} />

      <Grid
        args={[6, 6]}
        cellSize={0.2}
        cellThickness={0.4}
        cellColor="#0D4A6B"
        sectionSize={1}
        sectionThickness={0.8}
        sectionColor="#1A7BA0"
        fadeDistance={5}
        fadeStrength={1.2}
        infiniteGrid
      />

      <URDFRobot
        controlsRef={controlsRef}
        anglesRef={anglesRef}
        initialCamera={initialCamera}
        dragRef={dragRef}
      />

      <OrbitControls
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        minDistance={0.3}
        maxDistance={6}
        minPolarAngle={PI * 0.05}
        maxPolarAngle={PI * 0.85}
        makeDefault
      />
    </>
  );
}

// ─── Sim time ticker ──────────────────────────────────────────────────────────

function SimTime() {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<number>(0);
  useEffect(() => {
    start.current = performance.now();
    let id: number;
    const tick = () => {
      if (ref.current)
        ref.current.textContent = `TIME · ${((performance.now() - start.current) / 1000).toFixed(3)} s`;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div ref={ref} style={{ color: "rgba(0,255,156,0.85)", fontWeight: 700 }}>
      TIME · 0.000 s
    </div>
  );
}

// ─── Sim info panel ───────────────────────────────────────────────────────────

const PANEL: React.CSSProperties = {
  position: "absolute",
  bottom: 12,
  left: 12,
  zIndex: 20,
  fontFamily: "var(--font-jetbrains-mono, monospace)",
  fontSize: "9px",
  letterSpacing: "0.10em",
  lineHeight: "1.9",
  background: "rgba(2,11,20,0.78)",
  border: "1px solid rgba(0,200,255,0.20)",
  borderRadius: 3,
  padding: "8px 12px",
  display: "flex",
  gap: 20,
  pointerEvents: "auto",
};

const DIM: React.CSSProperties = { color: "rgba(0,200,255,0.45)" };
const VAL: React.CSSProperties = { color: "rgba(0,200,255,0.85)" };
const HEAD: React.CSSProperties = { color: "rgba(0,200,255,0.95)", fontWeight: 700 };

function SimInfoPanel({
  autoRotate,
  onToggleRotate,
}: {
  autoRotate: boolean;
  onToggleRotate: () => void;
}) {
  return (
    <div style={PANEL}>
      {/* Model info */}
      <div>
        <div style={HEAD}>MUJOCO v3.2.3</div>
        <div style={DIM}>
          MODEL &nbsp;<span style={VAL}>OPTIMUS FULL</span>
        </div>
        <div style={DIM}>
          DOF &nbsp;&nbsp;&nbsp;<span style={VAL}>23</span>
        </div>
        <div style={DIM}>
          JOINTS <span style={VAL}>23</span>
        </div>
        <div style={DIM}>
          BODIES <span style={VAL}>25</span>
        </div>
        <div style={DIM}>
          MESHES <span style={VAL}>24 STL</span>
        </div>
      </div>

      {/* Sim params */}
      <div>
        <SimTime />
        <div style={DIM}>
          TIMESTEP &nbsp;<span style={VAL}>0.001 s</span>
        </div>
        <div style={DIM}>
          SOLVER &nbsp;&nbsp;&nbsp;<span style={VAL}>PGS</span>
        </div>
        <div style={DIM}>
          INTEGRATOR <span style={VAL}>EULER</span>
        </div>
        <div style={DIM}>
          GRAVITY &nbsp;&nbsp;<span style={VAL}>9.81 m/s²</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <button
          onClick={onToggleRotate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            cursor: "pointer",
            border: "1px solid rgba(0,200,255,0.30)",
            background: "rgba(0,200,255,0.06)",
            borderRadius: 2,
            fontFamily: "inherit",
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(0,200,255,0.80)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              display: "inline-block",
              background: autoRotate ? "rgba(0,255,156,0.9)" : "rgba(0,200,255,0.4)",
            }}
          />
          {autoRotate ? "AUTO-ROTATE  ON" : "AUTO-ROTATE OFF"}
        </button>
      </div>
    </div>
  );
}

// ─── Sim info as a standalone panel (sidebar layout) ──────────────────────────

const SIM_INFO: [string, string][] = [
  ["Model", "Optimus full"],
  ["DOF", "23"],
  ["Joints", "23"],
  ["Bodies", "25"],
  ["Meshes", "24 STL"],
  ["Timestep", "0.001 s"],
  ["Solver", "PGS"],
  ["Integrator", "Euler"],
  ["Gravity", "9.81 m/s²"],
];

export function MujocoInfoPanel({
  autoRotate,
  onToggleRotate,
  collapsed,
  onToggle,
}: {
  autoRotate: boolean;
  onToggleRotate: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <HudPanel title="MuJoCo" subtitle="v3.2.3" collapsed={collapsed} onToggle={onToggle}>
      <div
        className="flex flex-col gap-3 p-3"
        style={{ fontFamily: "var(--font-jetbrains-mono, monospace)", fontSize: 10 }}
      >
        <SimTime />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {SIM_INFO.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span style={DIM}>{k.toUpperCase()}</span>
              <span style={VAL}>{v.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onToggleRotate}
          className="flex items-center justify-center gap-2 rounded-full px-3 py-1.5 tracking-widest uppercase transition-colors hover:bg-white/10"
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(0,200,255,0.85)",
            fontSize: 9,
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: autoRotate ? "rgba(0,255,156,0.9)" : "rgba(0,200,255,0.4)",
            }}
          />
          {autoRotate ? "Auto-rotate on" : "Auto-rotate off"}
        </button>
      </div>
    </HudPanel>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function MujocoViewer({
  className,
  jointAngles,
  initialCamera = null,
  onCameraChange,
  compact = false,
  autoRotate: autoRotateProp,
  onJointDrag,
  onJointDragEnd,
}: {
  className?: string;
  jointAngles?: JointAngles;
  initialCamera?: CameraState | null;
  onCameraChange?: (state: CameraState) => void;
  compact?: boolean;
  /** Controls rotation from outside (e.g. MujocoInfoPanel in a sidebar). */
  autoRotate?: boolean;
  /** Enables grab-and-drag on the model's parts to turn the servo behind them. */
  onJointDrag?: (key: keyof JointAngles, rad: number) => void;
  /** Called on release with the final angle — use it to commit to the robot. */
  onJointDragEnd?: (key: keyof JointAngles, rad: number) => void;
}) {
  const [autoRotateState, setAutoRotate] = useState(false);
  const autoRotate = autoRotateProp ?? autoRotateState;

  // Ref passed into the Canvas so useFrame always reads the latest value without
  // depending on React prop diffing across the Canvas boundary. Intentional
  // render-time mutation — we want the raw mutable ref, not reactive updates.
  const anglesRef = useRef<JointAngles | undefined>(jointAngles);
  // eslint-disable-next-line react-hooks/refs
  anglesRef.current = jointAngles;

  const handleCameraChange = (state: CameraState) => onCameraChange?.(state);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragTip, setDragTip] = useState<{
    key: keyof JointAngles;
    deg: number;
    x: number;
    y: number;
  } | null>(null);

  // Handlers live in a ref so the drag listeners always call the latest props.
  const dragRef = useRef<JointDragHandlers | null>(null);
  useEffect(() => {
    dragRef.current = onJointDrag
      ? {
          onDrag: (key, rad, clientX, clientY) => {
            onJointDrag(key, rad);
            const r = wrapperRef.current?.getBoundingClientRect();
            setDragTip({
              key,
              deg: Math.round(90 + (rad * 180) / PI),
              x: clientX - (r?.left ?? 0),
              y: clientY - (r?.top ?? 0),
            });
          },
          onEnd: (key, rad) => {
            setDragTip(null);
            onJointDragEnd?.(key, rad);
          },
        }
      : null;
  }, [onJointDrag, onJointDragEnd]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <Canvas
        camera={{ position: [1.2, 1.4, 2.0], fov: 44 }}
        gl={{ antialias: true, alpha: true }}
        // PCFShadowMap: three r18x deprecates the PCFSoft type `shadows` defaults to.
        shadows="percentage"
        style={{ display: "block", width: "100%", height: "100%", background: "transparent" }}
      >
        <Scene
          autoRotate={autoRotate}
          anglesRef={anglesRef}
          initialCamera={initialCamera}
          onCameraChange={handleCameraChange}
          dragRef={dragRef}
        />
      </Canvas>

      {dragTip && (
        <div
          className="pointer-events-none absolute rounded-full px-3 py-1 font-mono text-[10px] tracking-widest whitespace-nowrap uppercase"
          style={{
            left: dragTip.x + 14,
            top: dragTip.y - 28,
            background: "rgba(2,11,20,0.75)",
            border: "1px solid rgba(255,209,102,0.45)",
            color: "#FFD166",
            backdropFilter: "blur(8px)",
          }}
        >
          {JOINT_LABELS[dragTip.key]} · {dragTip.deg}°
        </div>
      )}

      {!compact && (
        <SimInfoPanel autoRotate={autoRotate} onToggleRotate={() => setAutoRotate((r) => !r)} />
      )}
    </div>
  );
}
