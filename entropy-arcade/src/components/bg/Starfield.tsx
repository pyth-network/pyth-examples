"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as React from "react";

function SpinningStars() {
  const ref = React.useRef<any>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02; // slow yaw
      ref.current.rotation.x += delta * 0.005; // subtle pitch
    }
  });
  return (
    <group ref={ref}>
      <Stars
        radius={100}
        depth={80}
        count={6000}
        factor={3}
        saturation={0}
        fade
        speed={0.8}
      />
    </group>
  );
}

export function StarfieldCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 1] }}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      {/* A very dark, subtle space tint */}
      <color attach="background" args={["#070707"]} />
      <SpinningStars />
    </Canvas>
  );
}
