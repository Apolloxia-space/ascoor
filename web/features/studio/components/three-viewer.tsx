'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { zipSync } from 'fflate';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';

import type { ViewMode } from '../types';
import { collectPartNodes, type PartNode } from '../lib/model-parts';
import { cn } from '@shared/lib/utils';

const VIEW_HELPER_DRAG_THRESHOLD = 4;

type ThreeViewerProps = {
  modelData: ArrayBuffer | null;
  modelCode: string | null;
  viewModeKey: ViewMode['key'];
  className?: string;
  onPartsChange?: (parts: Array<PartNode>) => void;
  onModelParseError?: (message: string | null) => void;
};

type ViewHelperInstance = THREE.Object3D & {
  animating: boolean;
  center: THREE.Vector3;
  location: {
    top: number | null;
    right: number;
    bottom: number;
    left: number | null;
  };
  update: (delta: number) => void;
  render: (renderer: THREE.WebGLRenderer) => void;
  handleClick: (event: PointerEvent) => boolean;
  setLabels: (labelX?: string, labelY?: string, labelZ?: string) => void;
  setLabelStyle: (font?: string, color?: string, radius?: number) => void;
  dispose: () => void;
};

export type ThreeViewerHandle = {
  focusFullModel: () => void;
  previewPart: (id: string) => void;
  clearPartPreview: () => void;
  exportGlb: () => Promise<Blob | null>;
  exportPartsZip: () => Promise<Blob | null>;
  exportObj: (mtlFilename: string) => { obj: Blob; mtl: Blob } | null;
  exportStl: () => Blob | null;
};

const toArrayBuffer = (data: ArrayBuffer | ArrayBufferView) => {
  if (data instanceof ArrayBuffer) {
    return data;
  }
  const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
};

const EXPORT_WRAPPER_SCENE_NAME = '__ascoor_export_scene__';

// GLB export expects a Scene root. Wrap non-Scene roots to avoid exporter-created aux scenes.
const wrapObjectForGlbExport = (object: THREE.Object3D) => {
  if (object instanceof THREE.Scene) {
    return object;
  }

  const scene = new THREE.Scene();
  scene.name = EXPORT_WRAPPER_SCENE_NAME;
  scene.add(object);
  return scene;
};

const exportObjectToGlb = async (object: THREE.Object3D): Promise<Blob> => {
  const exporter = new GLTFExporter();
  const exportRoot = wrapObjectForGlbExport(object);
  exportRoot.updateWorldMatrix(true, true);
  const binary = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      exportRoot,
      (result) => {
        if (result instanceof ArrayBuffer || ArrayBuffer.isView(result)) {
          resolve(toArrayBuffer(result));
          return;
        }
        reject(new Error('GLTF exporter did not return binary data.'));
      },
      (error) => {
        reject(error);
      },
      { binary: true, trs: false, onlyVisible: true, includeCustomExtensions: false },
    );
  });
  return new Blob([binary], { type: 'model/gltf-binary' });
};

const exportObjectToStl = (object: THREE.Object3D): Blob => {
  const exporter = new STLExporter();
  object.updateWorldMatrix(true, true);
  const result: unknown = exporter.parse(object, { binary: true });
  if (typeof result === 'string') {
    return new Blob([result], { type: 'model/stl' });
  }
  if (result instanceof DataView || result instanceof ArrayBuffer || ArrayBuffer.isView(result)) {
    return new Blob([toArrayBuffer(result)], { type: 'model/stl' });
  }
  throw new Error('STL exporter returned unsupported output.');
};

const sanitizeObjToken = (value: string, fallback: string) => {
  const normalized = value.trim().replace(/[^\w.-]+/g, '_');
  return normalized || fallback;
};

const sanitizeFilenameStem = (value: string, fallback: string) => {
  const normalized = value
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || fallback;
};

const createUniqueFilename = (
  value: string,
  fallback: string,
  extension: string,
  usedNames: Set<string>,
) => {
  const baseName = sanitizeFilenameStem(value, fallback);
  let filename = `${baseName}${extension}`;
  let index = 2;
  while (usedNames.has(filename)) {
    filename = `${baseName}_${index}${extension}`;
    index += 1;
  }
  usedNames.add(filename);
  return filename;
};

const formatObjFloat = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  const formatted = value.toFixed(6);
  return formatted.replace(/\.?0+$/, '') || '0';
};

const hasMaterialOpacity = (
  material: THREE.Material,
): material is THREE.Material & {
  opacity: number;
} => {
  return 'opacity' in material && typeof material.opacity === 'number';
};

const toSrgbColorComponents = (color: THREE.Color) => {
  const converted = color.clone();
  THREE.ColorManagement.workingToColorSpace(converted, THREE.SRGBColorSpace);
  return [converted.r, converted.g, converted.b] as const;
};

const buildMtlText = (materials: Array<THREE.Material>) => {
  const lines = ['# Exported by Ascoor'];

  materials.forEach((material) => {
    const [r, g, b] = hasMaterialColor(material)
      ? toSrgbColorComponents(material.color)
      : ([0.8, 0.8, 0.8] as const);

    lines.push(`newmtl ${material.name}`);
    lines.push('Ka 0 0 0');
    lines.push(`Kd ${formatObjFloat(r)} ${formatObjFloat(g)} ${formatObjFloat(b)}`);

    if (hasMaterialEmissive(material)) {
      const emissive = material.emissive.clone().multiplyScalar(material.emissiveIntensity);
      const [er, eg, eb] = toSrgbColorComponents(emissive);
      if (er > 0 || eg > 0 || eb > 0) {
        lines.push(`Ke ${formatObjFloat(er)} ${formatObjFloat(eg)} ${formatObjFloat(eb)}`);
      }
    }

    if (hasMaterialOpacity(material)) {
      lines.push(`d ${formatObjFloat(material.opacity)}`);
    }

    lines.push('illum 2');
    lines.push('');
  });

  return `${lines.join('\n')}\n`;
};

const prepareObjectForObjExport = (object: THREE.Object3D) => {
  const exportedMaterials: Array<THREE.Material> = [];
  const usedNames = new Set<string>();
  let unnamedMaterialIndex = 1;

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const nextMaterial = Array.isArray(child.material)
      ? (child.material[0] ?? createFallbackMaterial())
      : child.material;
    const material = isMaterialLike(nextMaterial) ? nextMaterial : createFallbackMaterial();

    child.material = material;

    const baseName = sanitizeObjToken(material.name, `material_${unnamedMaterialIndex}`);
    let uniqueName = baseName;
    let duplicateIndex = 2;
    while (usedNames.has(uniqueName)) {
      uniqueName = `${baseName}_${duplicateIndex}`;
      duplicateIndex += 1;
    }
    usedNames.add(uniqueName);
    material.name = uniqueName;
    exportedMaterials.push(material);
    unnamedMaterialIndex += 1;
  });

  return exportedMaterials;
};

const exportObjectToObj = (
  object: THREE.Object3D,
  mtlFilename: string,
): { obj: Blob; mtl: Blob } => {
  const exporter = new OBJExporter();
  object.updateWorldMatrix(true, true);
  const exportedMaterials = prepareObjectForObjExport(object);
  const result = exporter.parse(object);
  const objText = `mtllib ${mtlFilename}\n${result}`;
  const mtlText = buildMtlText(exportedMaterials);

  return {
    obj: new Blob([objText], { type: 'text/plain;charset=utf-8' }),
    mtl: new Blob([mtlText], { type: 'text/plain;charset=utf-8' }),
  };
};

const createFallbackMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.78,
    metalness: 0.08,
  });

const isMaterialLike = (value: unknown): value is THREE.Material => {
  if (!value || typeof value !== 'object') return false;
  if (!('dispose' in value) || typeof value.dispose !== 'function') return false;
  if (!('clone' in value) || typeof value.clone !== 'function') return false;
  return true;
};

const normalizeMaterialSet = (value: unknown): THREE.Material | Array<THREE.Material> => {
  if (Array.isArray(value)) {
    const normalized = value.map((item) =>
      isMaterialLike(item) ? item : createFallbackMaterial(),
    );
    return normalized.length > 0 ? normalized : [createFallbackMaterial()];
  }
  return isMaterialLike(value) ? value : createFallbackMaterial();
};

const getStoredOriginalMaterial = (mesh: THREE.Mesh) => {
  const stored = mesh.userData.originalMaterial as unknown;
  if (Array.isArray(stored)) {
    return stored.length > 0 && stored.every((item) => isMaterialLike(item)) ? stored : null;
  }
  return isMaterialLike(stored) ? stored : null;
};

const getStoredBaseMaterial = (mesh: THREE.Mesh) => {
  const stored = mesh.userData.baseMaterial as unknown;
  if (Array.isArray(stored)) {
    return stored.length > 0 && stored.every((item) => isMaterialLike(item)) ? stored : null;
  }
  return isMaterialLike(stored) ? stored : null;
};

const cloneMaterialSet = (material: THREE.Material | Array<THREE.Material>) => {
  if (Array.isArray(material)) {
    return material.map((item) => item.clone());
  }
  return material.clone();
};

const hasMaterialColor = (
  material: THREE.Material,
): material is THREE.Material & {
  color: THREE.Color;
} => {
  return 'color' in material && material.color instanceof THREE.Color;
};

const hasMaterialEmissive = (
  material: THREE.Material,
): material is THREE.Material & {
  emissive: THREE.Color;
  emissiveIntensity: number;
} => {
  return (
    'emissive' in material &&
    material.emissive instanceof THREE.Color &&
    'emissiveIntensity' in material &&
    typeof material.emissiveIntensity === 'number'
  );
};

const isSameMaterialReference = (
  left: THREE.Material | Array<THREE.Material> | null,
  right: unknown,
) => {
  if (!left) return false;
  if (Array.isArray(left)) {
    return (
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => item === right[index])
    );
  }
  return left === right;
};

const ensureMeshMaterialSnapshots = (mesh: THREE.Mesh) => {
  const storedOriginal = getStoredOriginalMaterial(mesh);
  const original = normalizeMaterialSet(storedOriginal ?? mesh.material);
  if (!storedOriginal) {
    mesh.userData.originalMaterial = original;
  }

  const storedBase = getStoredBaseMaterial(mesh);
  const base = storedBase ?? cloneMaterialSet(original);
  if (!storedBase) {
    mesh.userData.baseMaterial = base;
  }

  return {
    original,
    base,
  };
};

const disposeMaterial = (material: unknown) => {
  if (Array.isArray(material)) {
    material.forEach((mat) => {
      disposeMaterial(mat);
    });
    return;
  }
  if (isMaterialLike(material)) {
    material.dispose();
  }
};

const disposeObject = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const storedOriginal = getStoredOriginalMaterial(child);
      const storedBase = getStoredBaseMaterial(child);
      disposeMaterial(child.material);
      if (storedOriginal && !isSameMaterialReference(storedOriginal, child.material)) {
        disposeMaterial(storedOriginal);
      }
      if (
        storedBase &&
        !isSameMaterialReference(storedBase, child.material) &&
        !isSameMaterialReference(storedBase, storedOriginal)
      ) {
        disposeMaterial(storedBase);
      }
    }
  });
};

const disposeRenderer = (renderer: THREE.WebGLRenderer) => {
  renderer.renderLists.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
};

const cloneMaterialForMode = (material: THREE.Material, mode: ViewMode['key']) => {
  const clone = material.clone();
  if ('wireframe' in clone) {
    clone.wireframe = mode === 'wireframe';
  }
  if (mode === 'translucent' || mode === 'xray') {
    if ('transparent' in clone) {
      clone.transparent = true;
    }
    if ('opacity' in clone) {
      clone.opacity = mode === 'xray' ? 0.2 : 0.55;
    }
  }
  if (mode === 'xray' && 'depthWrite' in clone) {
    clone.depthWrite = false;
  }
  if (mode === 'shaded' && 'flatShading' in clone) {
    clone.flatShading = true;
    clone.needsUpdate = true;
  }
  return clone;
};

const applyViewMode = (root: THREE.Object3D, mode: ViewMode['key']) => {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const { original } = ensureMeshMaterialSnapshots(child);

    if (mode === 'solid') {
      if (child.material !== original) {
        disposeMaterial(child.material);
        child.material = original;
      }
      return;
    }

    const nextMaterial = Array.isArray(original)
      ? original.map((mat) => cloneMaterialForMode(mat, mode))
      : cloneMaterialForMode(original, mode);

    if (child.material !== original) {
      disposeMaterial(child.material);
    }
    child.material = nextMaterial;
  });
};

const fitCameraToObject = (
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
) => {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  object.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim > 0 ? maxDim * 1.6 : 6;

  camera.near = Math.max(0.01, distance / 100);
  camera.far = Math.max(500, distance * 10);
  camera.position.set(distance, distance * 0.85, distance);
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.update();
};

const focusCameraOnObject = (
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
) => {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim > 0 ? maxDim * 1.6 : 6;

  const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
  camera.near = Math.max(0.01, distance / 100);
  camera.far = Math.max(500, distance * 10);
  camera.position.copy(center.clone().add(direction.multiplyScalar(distance)));
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
};

const sanitizeGeneratedCode = (input: string) => {
  const trimmed = input.trim();
  const fenced = trimmed.match(/```(?:javascript|js|typescript|ts)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? trimmed).trim();
  const withoutImports = body
    .split('\n')
    .filter(
      (line) =>
        !/^\s*import\s+.*from\s+['"]three['"]\s*;?\s*$/.test(line) &&
        !/^\s*(const|let|var)\s+THREE\s*=\s*require\(\s*['"]three['"]\s*\)\s*;?\s*$/.test(line),
    )
    .join('\n');

  return withoutImports
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+(const|let|var|function|class)\s+/gm, '$1 ')
    .replace(/^\s*export\s*\{[^}]+\}\s*;?\s*$/gm, '')
    .replace(/^\s*(const|let|var)\s+result\s*=/gm, 'result =');
};

const toRenderableObject = (result: unknown): THREE.Object3D => {
  if (!result) {
    throw new Error('Generated code must assign the final object to `result`.');
  }
  if (result instanceof THREE.Scene) {
    return result;
  }
  if (result instanceof THREE.Object3D) {
    return result;
  }
  if (
    Array.isArray(result) &&
    result.length > 0 &&
    result.every((item) => item instanceof THREE.Object3D)
  ) {
    const group = new THREE.Group();
    result.forEach((item) => {
      group.add(item);
    });
    return group;
  }
  throw new Error(
    'Generated code must assign `result` as THREE.Object3D, THREE.Scene, or Object3D[].',
  );
};

const evaluateGeneratedCode = (code: string): THREE.Object3D => {
  const sanitizedCode = sanitizeGeneratedCode(code);
  const source = `
"use strict";
let result;
${sanitizedCode}
const __runtimeResult =
  typeof result !== "undefined"
    ? result
    : (typeof globalThis.result !== "undefined" ? globalThis.result : undefined);
return __runtimeResult;
`;
  const runtime = new Function('THREE', 'console', source) as (
    three: typeof THREE,
    runtimeConsole: Console,
  ) => unknown;
  const output = runtime(THREE, console);
  return toRenderableObject(output);
};

const AUXILIARY_SCENE_NAMES = new Set(['AuxScene', 'Aux_Scene', EXPORT_WRAPPER_SCENE_NAME]);

const hasIdentityTransform = (object: THREE.Object3D) => {
  return (
    object.position.x === 0 &&
    object.position.y === 0 &&
    object.position.z === 0 &&
    object.quaternion.x === 0 &&
    object.quaternion.y === 0 &&
    object.quaternion.z === 0 &&
    object.quaternion.w === 1 &&
    object.scale.x === 1 &&
    object.scale.y === 1 &&
    object.scale.z === 1
  );
};

// Older exports may already contain an aux wrapper scene. Strip it before rendering/exporting.
const unwrapAuxiliarySceneRoot = (object: THREE.Object3D) => {
  let current = object;

  while (
    (current instanceof THREE.Scene || current instanceof THREE.Group) &&
    AUXILIARY_SCENE_NAMES.has(current.name) &&
    current.children.length === 1 &&
    hasIdentityTransform(current)
  ) {
    const [child] = current.children;
    if (!child) break;
    current.remove(child);
    current = child;
  }

  return current;
};

const assertWithoutConsoleError = (run: () => void, message: string) => {
  const originalConsoleError = console.error;
  let hasConsoleError = false;

  console.error = () => {
    hasConsoleError = true;
  };

  try {
    run();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : message);
  } finally {
    console.error = originalConsoleError;
  }

  if (hasConsoleError) {
    throw new Error(message);
  }
};

const createModelExportObject = (
  source: THREE.Object3D,
  options?: { onlyVisible?: boolean; forceVisible?: boolean },
) => {
  if (options?.onlyVisible && !options.forceVisible && !source.visible) {
    return new THREE.Group();
  }

  const clone = source.clone(true);
  const stack: Array<{ source: THREE.Object3D; target: THREE.Object3D }> = [
    { source, target: clone },
  ];

  while (stack.length > 0) {
    const current = stack.pop() as { source: THREE.Object3D; target: THREE.Object3D };

    if (options?.onlyVisible && !options.forceVisible && !current.source.visible) {
      current.target.parent?.remove(current.target);
      continue;
    }

    current.target.visible = options?.forceVisible ? true : current.source.visible;
    delete current.target.userData.originalMaterial;
    delete current.target.userData.baseMaterial;

    if (current.source instanceof THREE.Mesh && current.target instanceof THREE.Mesh) {
      current.target.castShadow = current.source.castShadow;
      current.target.receiveShadow = current.source.receiveShadow;
      current.target.geometry = current.source.geometry.clone();

      const original = normalizeMaterialSet(
        getStoredOriginalMaterial(current.source) ?? current.source.material,
      );
      const cloneMaterial = (material: THREE.Material) => {
        const materialClone = material.clone();
        materialClone.needsUpdate = true;
        return materialClone;
      };

      current.target.material = Array.isArray(original)
        ? original.map(cloneMaterial)
        : cloneMaterial(original);
    }

    current.target.children.forEach((child, index) => {
      const sourceChild = current.source.children[index];
      if (!sourceChild) return;
      stack.push({ source: sourceChild, target: child });
    });
  }

  return clone;
};

export const ThreeViewer = forwardRef<ThreeViewerHandle, ThreeViewerProps>(function ThreeViewer(
  {
    modelData,
    modelCode,
    viewModeKey,
    className,
    onPartsChange,
    onModelParseError,
  }: ThreeViewerProps,
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const sourceModelRef = useRef<THREE.Object3D | null>(null);
  const viewHelperRef = useRef<ViewHelperInstance | null>(null);
  const viewHelperPointerRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    dragging: boolean;
    active: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    dragging: false,
    active: false,
  });
  const frameRef = useRef<number | null>(null);
  const partsRef = useRef<Array<PartNode>>([]);
  const partObjectMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const viewModeKeyRef = useRef<ViewMode['key']>(viewModeKey);

  useEffect(() => {
    viewModeKeyRef.current = viewModeKey;
  }, [viewModeKey]);

  const syncParts = () => {
    const sourceModel = sourceModelRef.current;
    if (!sourceModel) {
      partsRef.current = [];
      partObjectMapRef.current = new Map();
      onPartsChange?.([]);
      return;
    }
    const { parts, partObjectMap } = collectPartNodes(sourceModel);
    partsRef.current = parts;
    partObjectMapRef.current = partObjectMap;
    onPartsChange?.(parts);
  };

  useImperativeHandle(
    ref,
    () => ({
      focusFullModel: () => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        const source = sourceModelRef.current ?? modelRef.current;
        if (!camera || !controls || !source) return;
        focusCameraOnObject(camera, controls, source);
      },
      previewPart: (id: string) => {
        const source = sourceModelRef.current ?? modelRef.current;
        const target = partObjectMapRef.current.get(id);
        if (!source || !target) return;

        const visibleNodes = new Set<THREE.Object3D>();
        let ancestor: THREE.Object3D | null = target;
        while (ancestor) {
          visibleNodes.add(ancestor);
          ancestor = ancestor.parent;
        }
        target.traverse((child) => {
          visibleNodes.add(child);
        });

        source.traverse((child) => {
          child.visible = visibleNodes.has(child);
        });
        source.updateWorldMatrix(true, true);

        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (camera && controls) {
          focusCameraOnObject(camera, controls, target);
        }
      },
      clearPartPreview: () => {
        const source = sourceModelRef.current ?? modelRef.current;
        if (!source) return;
        source.traverse((child) => {
          child.visible = true;
        });
        source.updateWorldMatrix(true, true);
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (camera && controls) {
          focusCameraOnObject(camera, controls, source);
        }
      },
      exportGlb: async () => {
        const source = sourceModelRef.current ?? modelRef.current;
        if (!source) return null;
        const object = createModelExportObject(source, { forceVisible: true });
        try {
          return await exportObjectToGlb(object);
        } finally {
          disposeObject(object);
        }
      },
      exportPartsZip: async () => {
        const parts = partsRef.current;
        if (parts.length === 0) return null;

        const files: Record<string, Uint8Array> = {};
        const usedNames = new Set<string>();

        for (const part of parts) {
          const source = partObjectMapRef.current.get(part.id);
          if (!source) continue;

          const object = createModelExportObject(source, { forceVisible: true });
          try {
            const blob = await exportObjectToGlb(object);
            const filename = createUniqueFilename(
              part.displayName || part.name,
              `part_${usedNames.size + 1}`,
              '.glb',
              usedNames,
            );
            files[filename] = new Uint8Array(await blob.arrayBuffer());
          } finally {
            disposeObject(object);
          }
        }

        if (Object.keys(files).length === 0) return null;
        const zipped = zipSync(files);
        const zipBytes = zipped.slice();
        return new Blob([zipBytes.buffer], { type: 'application/zip' });
      },
      exportStl: () => {
        const source = sourceModelRef.current ?? modelRef.current;
        if (!source) return null;
        const object = createModelExportObject(source, { onlyVisible: true });
        try {
          return exportObjectToStl(object);
        } finally {
          disposeObject(object);
        }
      },
      exportObj: (mtlFilename: string) => {
        const source = sourceModelRef.current ?? modelRef.current;
        if (!source) return null;
        const object = createModelExportObject(source, { onlyVisible: true });
        try {
          return exportObjectToObj(object, mtlFilename);
        } finally {
          disposeObject(object);
        }
      },
    }),
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (rendererRef.current) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', '3D viewer');
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      2000,
    );
    camera.up.set(0, 1, 0);
    camera.position.set(6, 4, 6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.target.set(0, 0, 0);

    const viewHelper = new ViewHelper(camera, renderer.domElement) as unknown as ViewHelperInstance;
    viewHelper.center.copy(controls.target);
    viewHelper.location.right = 12;
    viewHelper.location.bottom = 12;
    viewHelper.setLabels('X', 'Y', 'Z');
    viewHelper.setLabelStyle('bold 24px Arial', '#ffffff', 14);

    const hemi = new THREE.HemisphereLight(0xf8fafc, 0x111827, 1.1);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(6, 8, 6);
    const rimLight = new THREE.DirectionalLight(0x94a3b8, 0.35);
    rimLight.position.set(-5, 4, -4);

    scene.add(hemi, keyLight, rimLight);

    container.appendChild(renderer.domElement);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    viewHelperRef.current = viewHelper;

    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const handlePointerDown = (event: PointerEvent) => {
      const state = viewHelperPointerRef.current;
      renderer.domElement.focus({ preventScroll: true });
      state.pointerId = event.pointerId;
      state.startX = event.clientX;
      state.startY = event.clientY;
      state.dragging = false;
      state.active = true;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = viewHelperPointerRef.current;
      if (!state.active || state.pointerId !== event.pointerId) return;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      if (state.dragging) return;
      if (Math.hypot(dx, dy) >= VIEW_HELPER_DRAG_THRESHOLD) {
        state.dragging = true;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const state = viewHelperPointerRef.current;
      if (!state.active || state.pointerId !== event.pointerId) return;
      if (!state.dragging) {
        const clickEvent = { clientX: state.startX, clientY: state.startY } as PointerEvent;
        const handledByViewHelper = viewHelper.handleClick(clickEvent);
        if (handledByViewHelper) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
      state.pointerId = null;
      state.dragging = false;
      state.active = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown, true);
    renderer.domElement.addEventListener('pointermove', handlePointerMove, true);
    renderer.domElement.addEventListener('pointerup', handlePointerUp, true);
    renderer.domElement.addEventListener('pointercancel', handlePointerUp, true);

    const timer = new THREE.Timer();
    timer.connect(document);

    const renderLoop = (timestamp?: number) => {
      timer.update(timestamp);
      const delta = timer.getDelta();
      viewHelper.center.copy(controls.target);
      if (viewHelper.animating) {
        viewHelper.update(delta);
      }
      controls.enabled = !viewHelper.animating;
      controls.update();
      renderer.clear();
      renderer.render(scene, camera);
      viewHelper.render(renderer);
      frameRef.current = window.requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown, true);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove, true);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp, true);
      renderer.domElement.removeEventListener('pointercancel', handlePointerUp, true);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      timer.dispose();
      controls.dispose();
      viewHelper.dispose();
      disposeRenderer(renderer);
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      viewHelperRef.current = null;
      modelRef.current = null;
      sourceModelRef.current = null;
      partsRef.current = [];
      partObjectMapRef.current = new Map();
      onPartsChange?.([]);
    };
  }, [onPartsChange]);

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !controls || !renderer) return;

    const previousObjects = new Set<THREE.Object3D>();
    if (modelRef.current) previousObjects.add(modelRef.current);
    if (sourceModelRef.current) previousObjects.add(sourceModelRef.current);

    const clearCurrentModel = () => {
      previousObjects.forEach((object) => {
        object.parent?.remove(object);
        disposeObject(object);
      });
      modelRef.current = null;
      sourceModelRef.current = null;
      partsRef.current = [];
      partObjectMapRef.current = new Map();
      onPartsChange?.([]);
    };

    const applyLoadedModel = (object: THREE.Object3D) => {
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });

      scene.add(object);
      try {
        assertWithoutConsoleError(() => {
          applyViewMode(object, viewModeKeyRef.current);
          fitCameraToObject(camera, controls, object);
          renderer.clear();
          renderer.render(scene, camera);
        }, 'Model failed to render.');

        previousObjects.forEach((previousObject) => {
          previousObject.parent?.remove(previousObject);
          disposeObject(previousObject);
        });
        sourceModelRef.current = object;
        modelRef.current = object;
        syncParts();
        onModelParseError?.(null);
      } catch (error) {
        object.parent?.remove(object);
        disposeObject(object);
        throw error;
      }
    };

    if (!modelCode && !modelData) {
      clearCurrentModel();
      return;
    }

    if (modelCode) {
      try {
        applyLoadedModel(evaluateGeneratedCode(modelCode));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to execute generated JavaScript model.';
        onModelParseError?.(message);
      }
      return;
    }

    if (!modelData) return;

    const gltfLoader = new GLTFLoader();
    let disposed = false;

    gltfLoader.parse(
      modelData,
      '',
      (gltf) => {
        if (disposed) return;
        try {
          applyLoadedModel(unwrapAuxiliarySceneRoot(gltf.scene));
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Loaded model contains invalid geometry and could not be rendered.';
          onModelParseError?.(message);
        }
      },
      (error) => {
        if (disposed) return;
        const message = error instanceof Error ? error.message : 'Unable to parse GLB model.';
        onModelParseError?.(message);
      },
    );

    return () => {
      disposed = true;
    };
  }, [modelCode, modelData, onModelParseError, onPartsChange]);

  useEffect(() => {
    if (!modelRef.current) return;
    applyViewMode(modelRef.current, viewModeKey);
  }, [viewModeKey]);

  return <div ref={containerRef} className={cn('h-full w-full', className)} />;
});
