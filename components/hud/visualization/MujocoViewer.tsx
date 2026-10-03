"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import URDFLoader, { type URDFRobot as URDFRobotType } from "urdf-loader";
import { STLLoader, OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { RobotDef, ServoAngles, ServoDef } from "@/lib/robot-def";
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

export interface JointDragHandlers {
  onDrag: (key: string, rad: number, clientX: number, clientY: number) => void;
  onEnd: (key: string, rad: number) => void;
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

// ─── Robot model (built from robot.json) ──────────────────────────────────────
// Everything robot-specific comes from the definition file; loading,
// highlighting and drag-to-turn below work the same for any robot.

type Angles = ServoAngles;
const D2R = PI / 180;

interface RobotModel {
  urdf: string;
  /** Writes servo angles into the URDF joints (every frame). */
  apply: (robot: URDFRobotType, angles: Angles) => void;
  /** Servo that turns a grabbed link, if any. */
  servoForLink: (link: URDFNode) => string | undefined;
  /** URDF joint the part visibly turns around, and its sign vs the servo value. */
  pivot: (key: string) => { joint: string; sign: number };
  limits: (key: string) => readonly [number, number];
  label: (key: string) => string;
  /** Angle as the sliders show it. */
  displayDeg: (rad: number) => number;
}

export interface ModelInfo {
  dof: number;
  joints: number;
  links: number;
  meshes: number;
}

function buildModel(def: RobotDef): RobotModel {
  const byId = new Map<string, ServoDef>(def.servos.map((s) => [s.id, s]));
  const servoByJoint = new Map<string, string>();
  for (const s of def.servos) for (const t of s.joints) servoByJoint.set(t.joint, s.id);

  return {
    urdf: def.urdf,
    // urdf = scale · servo + offset, for every joint each servo drives
    apply: (robot, angles) => {
      for (const s of def.servos) {
        const v = angles[s.id] ?? 0;
        for (const t of s.joints) robot.setJointValue(t.joint, t.scale * v + t.offsetDeg * D2R);
      }
    },
    // Walk up from the grabbed link to the first joint a servo drives.
    servoForLink: (link) => {
      let o = link.parent as URDFNode | null;
      while (o) {
        if (o.isURDFJoint && servoByJoint.has(o.name)) return servoByJoint.get(o.name);
        o = o.parent as URDFNode | null;
      }
      return undefined;
    },
    pivot: (key) => {
      const s = byId.get(key);
      const term = s?.joints.find((t) => t.joint === s.pivot);
      return { joint: s?.pivot ?? key, sign: term?.scale ?? 1 };
    },
    limits: (key) => {
      const lim = byId.get(key)?.limitsDeg ?? [-90, 90];
      return [lim[0] * D2R, lim[1] * D2R];
    },
    label: (key) => byId.get(key)?.label ?? key,
    displayDeg: (rad) => Math.round(def.zeroDeg + rad / D2R),
  };
}

// ─── URDF robot ───────────────────────────────────────────────────────────────

function URDFRobot({
  model,
  controlsRef,
  anglesRef,
  initialCamera,
  dragRef,
  onInfo,
}: {
  model: RobotModel;
  onInfo?: (info: ModelInfo) => void;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  anglesRef: React.RefObject<Angles | undefined>;
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
  const onInfoRef = useRef(onInfo);
  useEffect(() => {
    onInfoRef.current = onInfo;
  }, [onInfo]);
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
    return link && model.servoForLink(link) ? link : null;
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
    const key = link ? model.servoForLink(link) : undefined;
    const pivotJoint = key ? model.pivot(key) : undefined;
    const joint = pivotJoint && robot?.joints[pivotJoint.joint];
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
    const sign = facing * pivotJoint.sign;

    let last = Math.atan2(e.clientY - cy, e.clientX - cx);
    let value = anglesRef.current?.[key] ?? 0;

    const move = (ev: PointerEvent) => {
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      let d = a - last;
      if (d > PI) d -= 2 * PI;
      if (d < -PI) d += 2 * PI;
      last = a;
      // Screen y points down, so a growing atan2 is clockwise: negate for CCW.
      const [lo, hi] = model.limits(key);
      value = THREE.MathUtils.clamp(value - d * sign, lo, hi);
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

    let meshes = 0;
    loader.loadMeshCb = (path, _mgr, done) => {
      meshes += 1;
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
          // Picking hits the fill mesh; raycasting every edge too only costs time.
          lines.raycast = () => {};
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
      const robot = robotRef.current;
      if (robot) {
        const joints = Object.values(robot.joints);
        onInfoRef.current?.({
          dof: joints.filter((j) => j.jointType !== "fixed").length,
          joints: joints.length,
          links: Object.keys(robot.links).length,
          meshes,
        });
      }
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
          // Default: orbit around model center, far enough to fit the model
          const size = box.getSize(new THREE.Vector3());
          const modelCenter = new THREE.Vector3(0, size.y / 2, 0);
          const fov = (camera as THREE.PerspectiveCamera).fov ?? 44;
          const fit = (Math.max(size.x, size.y, size.z) / 2 / Math.tan((fov * D2R) / 2)) * 1.6;
          const dir = camera.position.clone().sub(controlsRef.current.target).normalize();
          camera.position
            .copy(modelCenter)
            .addScaledVector(dir, Math.min(5.5, Math.max(0.35, fit)));
          controlsRef.current.target.copy(modelCenter);
        }
        controlsRef.current.update();
      }
    };

    loader.load(model.urdf, (robot) => {
      robot.rotation.x = -H;
      robotRef.current = robot;
      group.add(robot);
    });

    return () => {
      while (group.children.length) group.remove(group.children[0]);
    };
  }, [controlsRef, camera, initialCamera, model.urdf]);

  useFrame(({ clock }) => {
    // Idle bob
    if (rootRef.current)
      rootRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.8) * 0.005;

    const robot = robotRef.current;
    const angles = anglesRef.current;
    if (robot && angles) model.apply(robot, angles);
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
  model,
  onInfo,
  autoRotate,
  anglesRef,
  initialCamera,
  onCameraChange,
  dragRef,
}: {
  model: RobotModel;
  onInfo?: (info: ModelInfo) => void;
  autoRotate: boolean;
  anglesRef: React.RefObject<Angles | undefined>;
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
        model={model}
        onInfo={onInfo}
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

// ─── Model panel (sidebar) ────────────────────────────────────────────────────

const DIM: React.CSSProperties = { color: "rgba(0,200,255,0.45)" };
const VAL: React.CSSProperties = { color: "rgba(0,200,255,0.85)" };

/** URDF counts come from the loaded model; simulator settings from robot.json. */
export function ModelInfoPanel({
  def,
  info,
  autoRotate,
  onToggleRotate,
  collapsed,
  onToggle,
}: {
  def: RobotDef;
  info: ModelInfo | null;
  autoRotate: boolean;
  onToggleRotate: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const rows: [string, string][] = [
    ["Model", def.name],
    ["Servos", String(def.servos.length)],
    ["DOF", info ? String(info.dof) : "…"],
    ["Joints", info ? String(info.joints) : "…"],
    ["Links", info ? String(info.links) : "…"],
    ["Meshes", info ? `${info.meshes} STL` : "…"],
    ...Object.entries(def.sim?.params ?? {}),
  ];
  return (
    <HudPanel title="Model" subtitle={def.sim?.engine} collapsed={collapsed} onToggle={onToggle}>
      <div
        className="flex flex-col gap-3 p-3"
        style={{ fontFamily: "var(--font-jetbrains-mono, monospace)", fontSize: 10 }}
      >
        {def.sim && <SimTime />}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span style={DIM}>{k.toUpperCase()}</span>
              <span className="truncate" style={VAL}>
                {v.toUpperCase()}
              </span>
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
  autoRotate = false,
  onJointDrag,
  onJointDragEnd,
  def,
  onModelInfo,
}: {
  className?: string;
  jointAngles?: Angles;
  initialCamera?: CameraState | null;
  onCameraChange?: (state: CameraState) => void;
  autoRotate?: boolean;
  /** Enables grab-and-drag on the model's parts to turn the servo behind them. */
  onJointDrag?: (key: string, rad: number) => void;
  /** Called on release with the final angle — use it to commit to the robot. */
  onJointDragEnd?: (key: string, rad: number) => void;
  /** Robot definition (public/models/<id>/robot.json). */
  def: RobotDef;
  /** Called once the URDF has loaded, with counts for the Model panel. */
  onModelInfo?: (info: ModelInfo) => void;
}) {
  const model = useMemo(() => buildModel(def), [def]);

  // Ref passed into the Canvas so useFrame always reads the latest value without
  // depending on React prop diffing across the Canvas boundary. Intentional
  // render-time mutation — we want the raw mutable ref, not reactive updates.
  const anglesRef = useRef<Angles | undefined>(jointAngles);
  // eslint-disable-next-line react-hooks/refs
  anglesRef.current = jointAngles;

  const handleCameraChange = (state: CameraState) => onCameraChange?.(state);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragTip, setDragTip] = useState<{
    key: string;
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
              deg: model.displayDeg(rad),
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
  }, [onJointDrag, onJointDragEnd, model]);

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
          model={model}
          onInfo={onModelInfo}
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
          {model.label(dragTip.key)} · {dragTip.deg}°
        </div>
      )}
    </div>
  );
}
