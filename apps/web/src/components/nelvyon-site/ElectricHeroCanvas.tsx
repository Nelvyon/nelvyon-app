"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Points } from "three";

function ParticleField() {
  const ref = useRef<Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(1200 * 3);
    for (let i = 0; i < 1200; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 28;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.04;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.06;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#0066FF" size={0.055} sizeAttenuation transparent opacity={0.9} depthWrite={false} />
    </points>
  );
}

export function ElectricHeroCanvas() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 min-h-[480px] w-full">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 55 }}
        className="!absolute inset-0 h-full w-full"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.2} />
        <pointLight color="#0066FF" intensity={2.8} position={[4, 2, 6]} />
        <pointLight color="#3388ff" intensity={1.2} position={[-3, -1, 4]} />
        <ParticleField />
      </Canvas>
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,102,255,0.22),transparent_60%)]"
      />
    </div>
  );
}
