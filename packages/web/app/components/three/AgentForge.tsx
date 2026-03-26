/**
 * AgentForge — 3D scene between "What it does" and "How it works"
 *
 * Story: Particles converge from chaos into a structured hexagonal grid,
 * representing the transformation from raw ideas into organized, capable agents.
 */

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense, useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";

const NEON = new THREE.Color("#34d399");
const BLUE = new THREE.Color("#60a5fa");
const AMBER = new THREE.Color("#fbbf24");
const NODE_COUNT = 42;

/* ── Hex Grid Nodes — representing agent capabilities ─────────────── */

function ForgeNodes({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const { hexPositions, chaosPositions, nodeColors } = useMemo(() => {
    const hexPositions: THREE.Vector3[] = [];
    const chaosPositions: THREE.Vector3[] = [];

    const rings = 4;
    let idx = 0;
    for (let q = -rings; q <= rings; q++) {
      for (let r = -rings; r <= rings; r++) {
        if (Math.abs(q + r) > rings) continue;
        if (idx >= NODE_COUNT) break;
        const x = q * 0.7 + r * 0.35;
        const y = r * 0.6;
        hexPositions.push(new THREE.Vector3(x, y, 0));
        chaosPositions.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 6
          )
        );
        idx++;
      }
    }

    const nodeColors = hexPositions.map(() => {
      const r = Math.random();
      if (r < 0.5) return NEON;
      if (r < 0.8) return BLUE;
      return AMBER;
    });

    return { hexPositions, chaosPositions, nodeColors };
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.08;
  });

  return (
    <group ref={groupRef}>
      {hexPositions.map((hexPos, i) => {
        const chaosPos = chaosPositions[i];
        const lerpedX = THREE.MathUtils.lerp(chaosPos.x, hexPos.x, progress);
        const lerpedY = THREE.MathUtils.lerp(chaosPos.y, hexPos.y, progress);
        const lerpedZ = THREE.MathUtils.lerp(chaosPos.z, hexPos.z, progress);

        return (
          <group key={i} position={[lerpedX, lerpedY, lerpedZ]}>
            <mesh>
              <sphereGeometry args={[0.06 + progress * 0.04, 16, 16]} />
              <meshBasicMaterial
                color={nodeColors[i]}
                transparent
                opacity={0.3 + progress * 0.5}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.15 + progress * 0.05, 16, 16]} />
              <meshBasicMaterial
                color={nodeColors[i]}
                transparent
                opacity={0.05 + progress * 0.08}
              />
            </mesh>
          </group>
        );
      })}

      {progress > 0.3 && (
        <ForgeConnections
          positions={hexPositions.map((hexPos, i) => {
            const chaosPos = chaosPositions[i];
            return new THREE.Vector3(
              THREE.MathUtils.lerp(chaosPos.x, hexPos.x, progress),
              THREE.MathUtils.lerp(chaosPos.y, hexPos.y, progress),
              THREE.MathUtils.lerp(chaosPos.z, hexPos.z, progress)
            );
          })}
          opacity={(progress - 0.3) / 0.7}
        />
      )}
    </group>
  );
}

function ForgeConnections({
  positions,
  opacity,
}: {
  positions: THREE.Vector3[];
  opacity: number;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const lines: number[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (positions[i].distanceTo(positions[j]) < 1.2) {
          lines.push(
            positions[i].x, positions[i].y, positions[i].z,
            positions[j].x, positions[j].y, positions[j].z
          );
        }
      }
    }
    const arr = new Float32Array(lines);
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return geo;
  }, [positions]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color={NEON}
        transparent
        opacity={opacity * 0.15}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

/* ── Central Core — the "agent" being forged ──────────────────────── */

function ForgeCore({ progress }: { progress: number }) {
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!coreRef.current) return;
    coreRef.current.rotation.x = state.clock.elapsedTime * 0.3;
    coreRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    coreRef.current.scale.setScalar(0.3 + progress * 0.7);
  });

  return (
    <Float speed={2} rotationIntensity={0.2}>
      <mesh ref={coreRef}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshBasicMaterial
          color={NEON}
          wireframe
          transparent
          opacity={0.2 + progress * 0.4}
        />
      </mesh>
      <mesh scale={0.6}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshBasicMaterial color={NEON} transparent opacity={progress * 0.1} />
      </mesh>
    </Float>
  );
}

/* ── Main AgentForge Component ─────────────────────────────────────── */

export default function AgentForge() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const start = viewportHeight;
      const end = -rect.height;
      const current = rect.top;
      const raw = 1 - (current - end) / (start - end);
      setProgress(Math.max(0, Math.min(1, raw)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[50vh] md:h-[60vh] my-0">
      <div className="absolute top-8 left-0 right-0 z-10 text-center">
        <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-neon-400/40 transition-all duration-500">
          {progress < 0.5 ? "Raw ideas..." : "Structured agents"}
        </p>
      </div>

      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ForgeNodes progress={progress} />
          <ForgeCore progress={progress} />

          <EffectComposer>
            <Bloom intensity={0.6} luminanceThreshold={0.15} mipmapBlur />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-zinc-950 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
    </div>
  );
}
