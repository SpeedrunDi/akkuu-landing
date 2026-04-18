import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

function EggMesh() {
  const ref = useRef<THREE.Mesh>(null);

  // Procedural egg geometry: stretched sphere, top narrower than bottom
  const geometry = useMemo(() => {
    const geom = new THREE.SphereGeometry(1, 128, 128);
    const pos = geom.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Stretch Y to egg shape
      const t = (v.y + 1) / 2; // 0 bottom -> 1 top
      const taper = 1 - 0.18 * Math.pow(t, 2) - 0.05 * Math.pow(1 - t, 1.5);
      v.x *= taper;
      v.z *= taper;
      v.y *= 1.32;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <mesh ref={ref} geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color="#f5ecd9"
        roughness={0.38}
        metalness={0.05}
        clearcoat={0.25}
        clearcoatRoughness={0.45}
        sheen={0.6}
        sheenColor={'#f0d89a'}
        sheenRoughness={0.8}
      />
    </mesh>
  );
}

export default function Egg3D() {
  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.2, 4.2], fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[4, 5, 3]} intensity={1.4} castShadow />
          <directionalLight position={[-3, 2, -2]} intensity={0.45} color="#c9a86a" />
          <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.9}>
            <EggMesh />
          </Float>
          <ContactShadows position={[0, -1.75, 0]} opacity={0.35} scale={6} blur={2.5} far={4} />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  );
}
