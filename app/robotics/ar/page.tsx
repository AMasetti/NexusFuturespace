"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { createXRStore, XR } from "@react-three/xr";
import type { Mesh } from "three";

const store = createXRStore({ hand: true, controller: true });

function HelloCube() {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt;
  });
  return (
    <group position={[0, 1.3, -1]}>
      <mesh ref={ref}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color="#00e5ff" />
      </mesh>
      <Text position={[0, 0.25, 0]} fontSize={0.08} color="white">
        Hello Nexus AR
      </Text>
    </group>
  );
}

export default function ArHelloPage() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-black text-white">
      <button
        onClick={() => store.enterAR()}
        className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-black"
      >
        Enter AR
      </button>
      <p className="text-sm text-white/60">Meta Quest 3 · immersive-ar</p>
      <Canvas className="!h-px !w-px">
        <XR store={store}>
          <ambientLight intensity={1} />
          <directionalLight position={[1, 2, 1]} intensity={2} />
          <HelloCube />
        </XR>
      </Canvas>
    </main>
  );
}
