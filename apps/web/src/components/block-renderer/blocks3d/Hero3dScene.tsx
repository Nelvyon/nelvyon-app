"use client";

import { Float, TorusKnot } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

function AnimatedTorus() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.25;
      ref.current.rotation.y += delta * 0.45;
    }
  });
  return (
    <Float floatIntensity={1.2} rotationIntensity={0.4} speed={1.8}>
      <TorusKnot ref={ref} args={[1.1, 0.38, 200, 32]}>
        <meshStandardMaterial color="#818cf8" emissive="#312e81" emissiveIntensity={0.35} metalness={0.85} roughness={0.15} />
      </TorusKnot>
    </Float>
  );
}

export function Hero3dScene() {
  return (
    <Canvas className="h-full w-full" dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <color attach="background" args={["#030712"]} />
      <fog attach="fog" args={["#030712", 4, 14]} />
      <ambientLight intensity={0.25} />
      <spotLight angle={0.35} castShadow intensity={2.2} penumbra={0.8} position={[8, 12, 6]} />
      <pointLight color="#f472b6" intensity={1.4} position={[-6, -2, 4]} />
      <pointLight color="#38bdf8" intensity={0.9} position={[4, -4, -2]} />
      <AnimatedTorus />
    </Canvas>
  );
}
