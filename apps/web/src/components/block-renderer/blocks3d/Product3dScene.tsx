"use client";

import { Box, Float } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

function RotatingProduct() {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.6;
  });
  return (
    <Float floatIntensity={0.6} speed={1.2}>
      <group ref={group}>
        <Box args={[1.6, 1.6, 1.6]} castShadow>
          <meshStandardMaterial color="#e2e8f0" metalness={0.7} roughness={0.25} />
        </Box>
        <Box args={[1.62, 1.62, 1.62]}>
          <meshStandardMaterial color="#6366f1" opacity={0.15} transparent wireframe />
        </Box>
      </group>
    </Float>
  );
}

export function Product3dScene() {
  return (
    <Canvas className="h-full w-full" camera={{ position: [0, 0.5, 4.5], fov: 42 }} dpr={[1, 1.5]}>
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.4} />
      <directionalLight intensity={1.5} position={[5, 8, 5]} />
      <pointLight color="#a78bfa" intensity={0.8} position={[-3, 2, 2]} />
      <RotatingProduct />
    </Canvas>
  );
}
