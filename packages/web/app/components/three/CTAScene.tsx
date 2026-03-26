/**
 * CTAScene — Final call-to-action 3D background
 *
 * Story: A calm, resolved particle field with a single bright focal point,
 * representing the finished agent — ready, stable, alive.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Suspense, useRef, useMemo } from "react";
import * as THREE from "three";

const NEON = new THREE.Color("#34d399");
const STAR_COUNT = 600;

function StarField() {
  const meshRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 8;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = Math.sin(angle) * r - 4;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    meshRef.current.rotation.z = state.clock.elapsedTime * 0.01;
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        color={NEON}
        size={0.02}
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function PulsingCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (coreRef.current) {
      const scale = 1 + Math.sin(t * 1.5) * 0.1;
      coreRef.current.scale.setScalar(scale);
    }
    if (glowRef.current) {
      const glowScale = 1.5 + Math.sin(t * 0.8) * 0.3;
      glowRef.current.scale.setScalar(glowScale);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.03 + Math.sin(t * 1.2) * 0.02;
    }
  });

  return (
    <group position={[0, 0, -2]}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshBasicMaterial color={NEON} transparent opacity={0.8} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color={NEON} transparent opacity={0.04} />
      </mesh>
    </group>
  );
}

export default function CTAScene() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <StarField />
          <PulsingCore />

          <EffectComposer>
            <Bloom
              intensity={1.0}
              luminanceThreshold={0.05}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.15} darkness={0.5} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
