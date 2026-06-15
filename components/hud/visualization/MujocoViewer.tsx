"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import URDFLoader, { type URDFRobot as URDFRobotType } from "urdf-loader";
import { STLLoader, OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { JointAngles } from "@/components/hud/panels/ServoSliders";

const PI = Math.PI;
const H = PI / 2;

// ─── Neon edge materials ──────────────────────────────────────────────────────

const MAT_BODY = new THREE.LineBasicMaterial({ color: "#00C8FF" });
const MAT_JOINT = new THREE.LineBasicMaterial({ color: "#00FFFF" });
const MAT_TENDON = new THREE.LineBasicMaterial({ color: "#00FF9C" });

function pickEdgeMat(path: string) {
  const n = (path.split("/").pop() ?? "").toLowerCase();
  if (n.includes("knee") || n.includes("anckle") || n.includes("hip-l") || n.includes("hip-r"))
    return MAT_JOINT;
  if (n.includes("sartorius") || n.includes("tendon")) return MAT_TENDON;
  return MAT_BODY;
}

// ─── URDF robot ───────────────────────────────────────────────────────────────

function URDFRobot({
  controlsRef,
  anglesRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  anglesRef: React.RefObject<JointAngles | undefined>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const rootRef = useRef<THREE.Group>(null);
  const robotRef = useRef<URDFRobotType | null>(null);

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

      const newCenter = new THREE.Vector3(0, (box.max.y - box.min.y) / 2, 0);
      if (controlsRef.current) {
        controlsRef.current.target.copy(newCenter);
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
  }, [controlsRef]);

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

    // Actuated joints — set directly
    robot.setJointValue("Servo-Hip-L", hipL);
    robot.setJointValue("Servo-Hip-R", hipR);
    robot.setJointValue("Servo-Knee-L-Top", kneeLTop);
    robot.setJointValue("Servo-Knee-R-Top", kneeRTop);
    robot.setJointValue("Servo-Knee-L-Bottom", kneeLBot);
    robot.setJointValue("Servo-Knee-R-Bottom", kneeRBot);
    robot.setJointValue("Servo-Ankle-L", ankleL);
    robot.setJointValue("Servo-Ankle-R", ankleR);
    robot.setJointValue("Servo-Showlder-L-Front-Back", shldrLFB);
    robot.setJointValue("Servo-Showlder-R-Front-Back", shldrRFB);
    robot.setJointValue("Servo-Showlder-L-Inward-Outward", shldrLLat);
    robot.setJointValue("Servo-Showlder-R-Inward-Outward", shldrRLat);
    robot.setJointValue("Servo-Forearm-L", forearmL);
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
      <group ref={groupRef} />
    </group>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene({
  autoRotate,
  anglesRef,
}: {
  autoRotate: boolean;
  anglesRef: React.RefObject<JointAngles | undefined>;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

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

      <URDFRobot controlsRef={controlsRef} anglesRef={anglesRef} />

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

// ─── Public component ─────────────────────────────────────────────────────────

export function MujocoViewer({
  className,
  jointAngles,
}: {
  className?: string;
  jointAngles?: JointAngles;
}) {
  const [autoRotate, setAutoRotate] = useState(true);

  // Ref passed into the Canvas so useFrame always reads the latest value without
  // depending on React prop diffing across the Canvas boundary. Intentional
  // render-time mutation — we want the raw mutable ref, not reactive updates.
  const anglesRef = useRef<JointAngles | undefined>(jointAngles);
  // eslint-disable-next-line react-hooks/refs
  anglesRef.current = jointAngles;

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [1.2, 1.4, 2.0], fov: 44 }}
        gl={{ antialias: true, alpha: true }}
        shadows
        style={{ display: "block", width: "100%", height: "100%", background: "transparent" }}
      >
        <Scene autoRotate={autoRotate} anglesRef={anglesRef} />
      </Canvas>

      <SimInfoPanel autoRotate={autoRotate} onToggleRotate={() => setAutoRotate((r) => !r)} />
    </div>
  );
}
