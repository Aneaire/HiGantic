/**
 * HeroScene — The "Spark to Agent" 3D hero experience
 *
 * Story: A neural constellation of particles floats in space. As the user
 * moves their mouse, energy flows through the network. The 3D logo floats
 * at the center — a living, breathing agent waiting to be activated.
 */

import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { Float, useGLTF } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense, useRef, useMemo, useCallback, useState, useEffect } from "react";
import * as THREE from "three";

/* ── Color constants matching the brand ─────────────────────────────── */
const NEON = new THREE.Color("#34d399");
const NEON_DIM = new THREE.Color("#10b981");
const ZINC_700 = new THREE.Color("#3f3f46");

/* ═══════════════════════════════════════════════════════════════════════
   NEURAL PARTICLES — The core of the "spark" metaphor
   ═══════════════════════════════════════════════════════════════════════ */

const PARTICLE_COUNT = 1400;
const CONNECTION_COUNT = 180;

/** Vertex shader for instanced particles */
const particleVertexShader = `
  attribute float aScale;
  attribute float aPhase;
  attribute float aSpeed;
  attribute vec3 aOffset;

  uniform float uTime;
  uniform vec2 uMouse;

  varying float vAlpha;
  varying float vDistance;

  void main() {
    vec3 pos = position + aOffset;
    float t = uTime * aSpeed;
    pos.x += sin(t + aPhase) * 0.3;
    pos.y += cos(t * 0.7 + aPhase * 1.3) * 0.25;
    pos.z += sin(t * 0.5 + aPhase * 0.8) * 0.2;

    vec3 mousePos = vec3(uMouse.x * 3.0, uMouse.y * 2.0, 0.0);
    float mouseDist = distance(pos.xy, mousePos.xy);
    float mouseInfluence = smoothstep(4.0, 0.5, mouseDist) * 0.4;
    pos.xy += normalize(mousePos.xy - pos.xy + 0.001) * mouseInfluence;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aScale * (280.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vAlpha = smoothstep(12.0, 2.0, -mvPosition.z) * (0.3 + 0.7 * aScale / 3.0);
    vDistance = mouseDist;
  }
`;

/** Fragment shader for particles with soft glow */
const particleFragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uColorAccent;
  uniform float uTime;

  varying float vAlpha;
  varying float vDistance;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
    float colorMix = smoothstep(4.0, 0.5, vDistance);
    vec3 color = mix(uColor, uColorAccent, colorMix);
    alpha *= 0.7 + 0.3 * sin(uTime * 2.0 + vDistance);

    gl_FragColor = vec4(color, alpha);
  }
`;

function NeuralParticles() {
  const meshRef = useRef<THREE.Points>(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0));

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const offsets = new Float32Array(PARTICLE_COUNT * 3);
    const scales = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.6) * 6;

      offsets[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      offsets[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
      offsets[i * 3 + 2] = r * Math.cos(phi) * 0.8;

      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      scales[i] = 0.5 + Math.random() * 2.5;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.2 + Math.random() * 0.8;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aOffset", new THREE.BufferAttribute(offsets, 3));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geo.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));

    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColor: { value: ZINC_700 },
      uColorAccent: { value: NEON },
    }),
    []
  );

  const handlePointerMove = useCallback((e: PointerEvent) => {
    mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uMouse.value.lerp(mouseRef.current, 0.05);
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   NEURAL CONNECTIONS — Lines between nearby particles
   ═══════════════════════════════════════════════════════════════════════ */

function NeuralConnections() {
  const lineRef = useRef<THREE.LineSegments>(null);

  const { geometry, connectionCount } = useMemo(() => {
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < 60; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1 + Math.random() * 4;
      nodes.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta) * 0.7,
          r * Math.cos(phi) * 0.8
        )
      );
    }

    const pairs: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 2.5 && pairs.length < CONNECTION_COUNT) {
          pairs.push([i, j]);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(pairs.length * 6);
    const opacities = new Float32Array(pairs.length * 2);

    pairs.forEach((pair, idx) => {
      const [a, b] = pair;
      positions[idx * 6] = nodes[a].x;
      positions[idx * 6 + 1] = nodes[a].y;
      positions[idx * 6 + 2] = nodes[a].z;
      positions[idx * 6 + 3] = nodes[b].x;
      positions[idx * 6 + 4] = nodes[b].y;
      positions[idx * 6 + 5] = nodes[b].z;
      opacities[idx * 2] = 0.15;
      opacities[idx * 2 + 1] = 0.15;
    });

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));

    return { geometry: geo, connectionCount: pairs.length };
  }, []);

  const lineVertexShader = `
    attribute float aOpacity;
    varying float vOpacity;
    void main() {
      vOpacity = aOpacity;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const lineFragmentShader = `
    uniform vec3 uColor;
    varying float vOpacity;
    void main() {
      gl_FragColor = vec4(uColor, vOpacity);
    }
  `;

  useFrame((state) => {
    if (!lineRef.current) return;
    const t = state.clock.elapsedTime;
    const opAttr = lineRef.current.geometry.getAttribute("aOpacity") as THREE.BufferAttribute;
    for (let i = 0; i < connectionCount; i++) {
      const pulse = Math.sin(t * 1.5 + i * 0.5) * 0.5 + 0.5;
      (opAttr.array as Float32Array)[i * 2] = 0.03 + pulse * 0.12;
      (opAttr.array as Float32Array)[i * 2 + 1] = 0.03 + pulse * 0.12;
    }
    opAttr.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={lineVertexShader}
        fragmentShader={lineFragmentShader}
        uniforms={{ uColor: { value: NEON_DIM } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ENERGY RINGS — Orbiting rings of light around the core
   ═══════════════════════════════════════════════════════════════════════ */

function EnergyRing({ radius, speed, tilt, opacity }: { radius: number; speed: number; tilt: number; opacity: number }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = state.clock.elapsedTime * speed;
    ringRef.current.rotation.x = tilt;
  });

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[radius, 0.008, 16, 100]} />
      <meshBasicMaterial color={NEON} transparent opacity={opacity} />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FLOATING LOGO — The 3D GLB model at the center
   ═══════════════════════════════════════════════════════════════════════ */

function FloatingLogo() {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  let gltf: ReturnType<typeof useGLTF> | null = null;
  try {
    gltf = useGLTF("/models/logo-3d.glb");
  } catch {
    // fallback
  }

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.y = t * 0.15;
    meshRef.current.position.y = Math.sin(t * 0.5) * 0.15;
  });

  if (gltf) {
    return (
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
        <group
          ref={meshRef}
          scale={1.2}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <primitive object={gltf.scene.clone()} />
          <mesh>
            <sphereGeometry args={[0.8, 32, 32]} />
            <meshBasicMaterial color={NEON} transparent opacity={hovered ? 0.08 : 0.04} />
          </mesh>
        </group>
      </Float>
    );
  }

  // Fallback: glowing icosahedron
  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6}>
      <group ref={meshRef}>
        <mesh
          scale={hovered ? 1.1 : 1}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <icosahedronGeometry args={[0.8, 1]} />
          <meshStandardMaterial
            color={NEON}
            emissive={NEON}
            emissiveIntensity={0.3}
            wireframe
            transparent
            opacity={0.6}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshBasicMaterial color={NEON} transparent opacity={0.05} />
        </mesh>
      </group>
    </Float>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CAMERA RIG — Smooth mouse-following camera
   ═══════════════════════════════════════════════════════════════════════ */

function CameraRig() {
  const { camera } = useThree();
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      targetRef.current.x = (e.clientX / window.innerWidth - 0.5) * 0.6;
      targetRef.current.y = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  useFrame(() => {
    mouseRef.current.x += (targetRef.current.x - mouseRef.current.x) * 0.02;
    mouseRef.current.y += (targetRef.current.y - mouseRef.current.y) * 0.02;

    camera.position.x = mouseRef.current.x * 1.5;
    camera.position.y = mouseRef.current.y * 1.0 + 0.3;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN HERO SCENE — Exported component
   ═══════════════════════════════════════════════════════════════════════ */

export default function HeroScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0.3, 7], fov: 50, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.15} />
          <pointLight position={[5, 5, 5]} intensity={0.3} color="#34d399" />
          <pointLight position={[-5, -3, 3]} intensity={0.15} color="#60a5fa" />

          <NeuralParticles />
          <NeuralConnections />

          <EnergyRing radius={2.5} speed={0.2} tilt={0.5} opacity={0.08} />
          <EnergyRing radius={3.5} speed={-0.15} tilt={1.2} opacity={0.05} />
          <EnergyRing radius={4.2} speed={0.1} tilt={0.8} opacity={0.03} />

          <FloatingLogo />
          <CameraRig />

          <EffectComposer>
            <Bloom
              intensity={0.8}
              luminanceThreshold={0.1}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(0.0005, 0.0005)}
            />
            <Vignette eskil={false} offset={0.1} darkness={0.6} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   AMBIENT SCENE — Lighter version for section backgrounds
   ═══════════════════════════════════════════════════════════════════════ */

const AMBIENT_COUNT = 300;

function AmbientParticles() {
  const meshRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(AMBIENT_COUNT * 3);

    for (let i = 0; i < AMBIENT_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const posAttr = meshRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    const t = state.clock.elapsedTime * 0.1;
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      (posAttr.array as Float32Array)[i * 3 + 1] += Math.sin(t + i) * 0.001;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        color={NEON_DIM}
        size={0.03}
        transparent
        opacity={0.2}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function AmbientScene() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <AmbientParticles />
        <EffectComposer>
          <Bloom intensity={0.4} luminanceThreshold={0.1} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
