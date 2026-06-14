"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import URDFLoader from "urdf-loader";
import { STLLoader, OrbitControls as OrbitControlsImpl } from "three-stdlib";

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

function URDFRobot({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const groupRef = useRef<THREE.Group>(null);
  const rootRef = useRef<THREE.Group>(null);

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
          // Solid dark fill — occludes back faces so hidden edges disappear
          const fill = new THREE.Mesh(
            geo,
            new THREE.MeshBasicMaterial({
              color: "#020B14",
              polygonOffset: true,
              polygonOffsetFactor: 1,
              polygonOffsetUnits: 1,
            })
          );
          // Neon contour edges rendered on top
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

      // Point OrbitControls at the actual robot center after repositioning
      const newCenter = new THREE.Vector3(0, (box.max.y - box.min.y) / 2, 0);
      if (controlsRef.current) {
        controlsRef.current.target.copy(newCenter);
        controlsRef.current.update();
      }
    };

    loader.load("/models/optimus/Assembly.urdf", (robot) => {
      robot.rotation.x = -H;
      group.add(robot);
    });

    return () => {
      while (group.children.length) group.remove(group.children[0]);
    };
  }, [controlsRef]);

  useFrame(({ clock }) => {
    if (rootRef.current)
      rootRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.8) * 0.005;
  });

  return (
    <group ref={rootRef}>
      <group ref={groupRef} />
    </group>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene({ autoRotate }: { autoRotate: boolean }) {
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

      <URDFRobot controlsRef={controlsRef} />

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

// ─── Public component ─────────────────────────────────────────────────────────

const OV: React.CSSProperties = {
  position: "absolute",
  zIndex: 10,
  fontFamily: "var(--font-jetbrains-mono, monospace)",
  fontSize: "9px",
  letterSpacing: "0.10em",
  lineHeight: "1.75",
  color: "rgba(0,200,255,0.50)",
  pointerEvents: "none",
};

const BTN: React.CSSProperties = {
  position: "absolute",
  bottom: 12,
  left: 12,
  zIndex: 20,
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 12px",
  cursor: "pointer",
  border: "1px solid rgba(0,200,255,0.35)",
  background: "rgba(2,11,20,0.70)",
  borderRadius: 2,
  fontFamily: "var(--font-jetbrains-mono, monospace)",
  fontSize: "9px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(0,200,255,0.80)",
};

export function MujocoViewer({ className, height = 520 }: { className?: string; height?: number }) {
  const [autoRotate, setAutoRotate] = useState(true);

  return (
    <div className={className} style={{ position: "relative", height }}>
      <div style={{ ...OV, top: 10, left: 12 }}>
        <div style={{ color: "rgba(0,200,255,0.90)", fontWeight: 700 }}>MUJOCO v3.2.3</div>
        <div>MODEL · OPTIMUS FULL</div>
        <div>DOF · 23</div>
        <div>JOINTS· 23</div>
        <div>BODIES· 25</div>
        <div>MESHES· 24 STL</div>
      </div>
      <div style={{ ...OV, top: 10, right: 12, textAlign: "right" }}>
        <SimTime />
        <div>TIMESTEP · 0.001 s</div>
        <div>SOLVER · PGS</div>
        <div>INTEGRATOR· EULER</div>
        <div>GRAVITY · 9.81 m/s²</div>
      </div>

      <Canvas
        camera={{ position: [1.2, 1.4, 2.0], fov: 44 }}
        gl={{ antialias: true, alpha: true }}
        shadows
        style={{ display: "block", background: "transparent" }}
      >
        <Scene autoRotate={autoRotate} />
      </Canvas>

      <button style={BTN} onClick={() => setAutoRotate((r) => !r)}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            display: "inline-block",
            background: autoRotate ? "rgba(0,255,156,0.9)" : "rgba(0,200,255,0.4)",
          }}
        />
        {autoRotate ? "AUTO-ROTATE  ON" : "AUTO-ROTATE  OFF"}
      </button>
    </div>
  );
}
