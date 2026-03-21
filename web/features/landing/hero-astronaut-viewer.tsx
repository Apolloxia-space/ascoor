'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type HeroAstronautViewerProps = {
  className?: string;
  variant?: 'hero' | 'compact';
  rotationOffset?: number;
  headYawOffset?: number;
  autoRotate?: boolean;
};

const createAstronaut = (options?: { headYawOffset?: number }) => {
  const root = new THREE.Group();
  const { headYawOffset = 0 } = options ?? {};

  const suitMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xf5f1ec),
    metalness: 0.12,
    roughness: 0.72,
  });
  const jointMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xb7c4cf),
    metalness: 0.2,
    roughness: 0.52,
  });
  const bootMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x31475d),
    metalness: 0.16,
    roughness: 0.44,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xda9a9d),
    metalness: 0.18,
    roughness: 0.46,
  });
  const visorMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x8fd3ff),
    metalness: 0.05,
    roughness: 0.08,
    transmission: 0.8,
    transparent: true,
    opacity: 0.78,
    thickness: 0.45,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  const backpackMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xe6ded7),
    metalness: 0.1,
    roughness: 0.68,
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.92, 1.7, 8, 18), suitMaterial);
  body.position.set(0, 0.1, 0);
  root.add(body);

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.45, 0.58), backpackMaterial);
  backpack.position.set(0, 0.35, -0.88);
  backpack.rotation.x = -0.08;
  root.add(backpack);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.12, 18, 48), accentMaterial);
  belt.rotation.x = Math.PI / 2;
  belt.position.set(0, -0.2, 0);
  root.add(belt);

  const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.52, 0.18), jointMaterial);
  chestPanel.position.set(0, 0.48, 0.9);
  root.add(chestPanel);

  const chestLight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), accentMaterial);
  chestLight.position.set(0.18, 0.56, 1.02);
  root.add(chestLight);

  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(0, 1.85, 0);

  const helmetShell = new THREE.Mesh(new THREE.SphereGeometry(0.98, 32, 32), suitMaterial);
  helmetGroup.add(helmetShell);

  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 24), visorMaterial);
  visor.scale.set(1, 0.82, 0.72);
  visor.position.set(0, 0.02, 0.45);
  helmetGroup.add(visor);

  const visorRim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 18, 48), jointMaterial);
  visorRim.rotation.x = Math.PI / 2;
  visorRim.position.set(0, -0.3, 0.3);
  helmetGroup.add(visorRim);
  helmetGroup.rotation.y = headYawOffset;

  root.add(helmetGroup);

  const makeArm = (side: 1 | -1) => {
    const arm = new THREE.Group();

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.78, 6, 12), suitMaterial);
    upper.position.set(side * 1.02, 0.64, 0);
    upper.rotation.z = side * 0.48;
    arm.add(upper);

    const elbowPosition = new THREE.Vector3(side * 1.28, 0.08, 0.08);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 14), jointMaterial);
    elbow.position.copy(elbowPosition);
    arm.add(elbow);

    const forearm = new THREE.Group();
    forearm.position.copy(elbowPosition);
    forearm.rotation.z = side * 0.66;
    forearm.rotation.x = -0.18;
    forearm.rotation.y = side * 0.08;
    arm.add(forearm);

    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.64, 6, 12), suitMaterial);
    lower.position.set(0, -0.46, 0.03);
    forearm.add(lower);

    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14), accentMaterial);
    glove.position.set(0, -0.92, 0.12);
    forearm.add(glove);

    return arm;
  };

  const makeLeg = (side: 1 | -1) => {
    const leg = new THREE.Group();

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.92, 6, 12), suitMaterial);
    upper.position.set(side * 0.36, -1.12, 0);
    upper.rotation.z = side * 0.04;
    leg.add(upper);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14), jointMaterial);
    knee.position.set(side * 0.38, -1.82, 0.1);
    leg.add(knee);

    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.78, 6, 12), suitMaterial);
    lower.position.set(side * 0.38, -2.34, 0.18);
    lower.rotation.x = -0.24;
    leg.add(lower);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.24, 0.86), bootMaterial);
    boot.position.set(side * 0.38, -2.88, 0.42);
    leg.add(boot);

    return leg;
  };

  root.add(makeArm(-1), makeArm(1), makeLeg(-1), makeLeg(1));
  root.rotation.x = 0.16;
  root.rotation.y = -0.42;

  return root;
};

const disposeSceneMeshes = (root: THREE.Object3D) => {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    nodeMaterials.forEach((material) => {
      materials.add(material);
    });
  });

  geometries.forEach((geometry) => {
    geometry.dispose();
  });
  materials.forEach((material) => {
    material.dispose();
  });
};

export function HeroAstronautViewer({
  className,
  variant = 'hero',
  rotationOffset = 0,
  headYawOffset = 0,
  autoRotate = true,
}: HeroAstronautViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(4.9, 2.6, 6.1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.enabled = variant === 'hero';
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.target.set(0, 0.15, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const hemi = new THREE.HemisphereLight(0xfffaf5, 0x203247, 1.15);
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(7, 8, 6);
    const rim = new THREE.DirectionalLight(0x9fd6ff, 1);
    rim.position.set(-6, 2, -6);
    const fill = new THREE.PointLight(0xffd6dc, 1.6, 16, 2);
    fill.position.set(1.5, 2.6, 3.8);
    scene.add(ambient, hemi, key, rim, fill);

    const astronaut = createAstronaut({ headYawOffset });
    scene.add(astronaut);

    const applyLayout = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const scale =
        variant === 'compact'
          ? width < 520
            ? 0.58
            : width < 768
              ? 0.66
              : 0.74
          : width < 520
            ? 0.76
            : width < 768
              ? 0.86
              : 0.96;
      astronaut.scale.setScalar(scale);
      controls.target.set(0, variant === 'compact' ? -0.18 : width < 520 ? -0.1 : 0.12, 0);
      controls.update();
    };

    container.appendChild(renderer.domElement);
    applyLayout();

    const resizeObserver = new ResizeObserver(() => {
      applyLayout();
    });
    resizeObserver.observe(container);

    const timer = new THREE.Timer();
    timer.connect(document);

    const renderLoop = (timestamp?: number) => {
      timer.update(timestamp);
      const elapsed = timer.getElapsed();
      const verticalOffset = variant === 'compact' ? 0 : -0.04;
      astronaut.position.y =
        verticalOffset +
        Math.sin(elapsed * (variant === 'compact' ? 0.9 : 1.15)) *
        (variant === 'compact' ? 0.08 : 0.16);
      astronaut.rotation.y = autoRotate
        ? -0.42 + rotationOffset + elapsed * (variant === 'compact' ? 0.16 : 0.22)
        : -0.42 + rotationOffset;
      astronaut.rotation.z = autoRotate
        ? Math.sin(elapsed * (variant === 'compact' ? 0.72 : 0.9)) *
          (variant === 'compact' ? 0.03 : 0.05)
        : 0;
      controls.update();
      renderer.render(scene, camera);
      frameRef.current = window.requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      resizeObserver.disconnect();
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      timer.dispose();
      controls.dispose();
      disposeSceneMeshes(astronaut);
      renderer.dispose();
      scene.clear();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [autoRotate, headYawOffset, rotationOffset, variant]);

  return <div ref={containerRef} className={className} />;
}
