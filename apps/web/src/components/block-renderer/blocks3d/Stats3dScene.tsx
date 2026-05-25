"use client";

import { Float, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";

type StatItem = { label?: string; value?: string };

function FloatingStat({ item, position }: { item: StatItem; position: [number, number, number] }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.12;
  });
  return (
    <Float floatIntensity={0.8} speed={1.5}>
      <group position={position} ref={ref}>
        <Text anchorX="center" anchorY="middle" color="#f8fafc" fontSize={0.55} fontWeight={700} position={[0, 0.2, 0]}>
          {item.value ?? "0"}
        </Text>
        <Text anchorX="center" anchorY="middle" color="#94a3b8" fontSize={0.18} position={[0, -0.35, 0]}>
          {(item.label ?? "").toUpperCase()}
        </Text>
      </group>
    </Float>
  );
}

export function Stats3dScene({ stats }: { stats: StatItem[] }) {
  const positions = useMemo<[number, number, number][]>(
    () => [
      [-2.2, 0, 0],
      [0, 0.3, -0.5],
      [2.2, -0.1, 0],
      [-1, -0.5, 0.8],
    ],
    [],
  );
  const items = stats.length ? stats.slice(0, 4) : [{ label: "Users", value: "10k+" }, { label: "Growth", value: "240%" }];

  return (
    <Canvas className="h-full w-full" camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 1.5]}>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.35} />
      <pointLight color="#6366f1" intensity={1.2} position={[0, 4, 4]} />
      {items.map((item, i) => (
        <FloatingStat item={item} key={`${item.label}-${i}`} position={positions[i % positions.length]} />
      ))}
    </Canvas>
  );
}
