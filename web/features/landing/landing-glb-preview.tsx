'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type LandingGlbPreviewProps = {
  className?: string;
  src: string;
  autoRotateSpeed?: number;
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

export function LandingGlbPreview({
  className,
  src,
  autoRotateSpeed = 0.3,
}: LandingGlbPreviewProps) {
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
      32,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    const previewGroup = new THREE.Group();
    scene.add(previewGroup);

    const ambient = new THREE.AmbientLight(0xdce8ff, 0.72);
    const hemi = new THREE.HemisphereLight(0x8eb8ff, 0x07101f, 1.1);
    const key = new THREE.DirectionalLight(0xf5e8d0, 1.18);
    key.position.set(6, 7, 5);
    const rim = new THREE.DirectionalLight(0x6ea7ff, 1.05);
    rim.position.set(-5, 3, -5);
    const fill = new THREE.PointLight(0x7aa2ff, 0.8, 18, 2);
    fill.position.set(1.8, 2.4, 3.4);
    scene.add(ambient, hemi, key, rim, fill);

    let loadedModel: THREE.Object3D | null = null;

    const applyLayout = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const fitCameraToModel = (model: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      model.position.sub(center);
      model.position.y += size.y * 0.12;

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const distance =
        maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

      camera.position.set(distance * 0.72, maxDim * 0.44, distance * 1.08);
      camera.near = Math.max(0.01, distance / 50);
      camera.far = distance * 20;
      camera.lookAt(0, size.y * 0.1, 0);
      camera.updateProjectionMatrix();
    };

    const loader = new GLTFLoader();
    loader.load(src, (gltf) => {
      loadedModel = gltf.scene;
      previewGroup.add(loadedModel);
      fitCameraToModel(loadedModel);
    });

    const resizeObserver = new ResizeObserver(() => {
      applyLayout();
      if (loadedModel) {
        fitCameraToModel(loadedModel);
      }
    });

    container.appendChild(renderer.domElement);
    applyLayout();
    resizeObserver.observe(container);

    const timer = new THREE.Timer();
    timer.connect(document);

    const renderLoop = (timestamp?: number) => {
      timer.update(timestamp);
      const elapsed = timer.getElapsed();
      previewGroup.rotation.y = elapsed * autoRotateSpeed;
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
      if (loadedModel) {
        disposeSceneMeshes(loadedModel);
      }
      renderer.dispose();
      scene.clear();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [autoRotateSpeed, src]);

  return <div ref={containerRef} className={className} />;
}
