'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';

import type { RightPanelMode, ViewMode } from '../types';
import {
  buildStructureTree,
  collectObjectNodeMap,
  type StructureTreeNode,
} from '../lib/structure-tree';
import { cn } from '@shared/lib/utils';

const VIEW_HELPER_DRAG_THRESHOLD = 4;

type ThreeViewerProps = {
  modelData: ArrayBuffer | null;
  modelCode: string | null;
  viewModeKey: ViewMode['key'];
  interactionMode?: RightPanelMode;
  className?: string;
  onStructureTreeChange?: (tree: Array<StructureTreeNode>) => void;
  onSelectedNodeChange?: (node: SelectedNode | null) => void;
  onModelParseError?: (message: string | null) => void;
  onSceneMutated?: () => void;
};

type ViewHelperInstance = THREE.Object3D & {
  animating: boolean;
  center: THREE.Vector3;
  update: (delta: number) => void;
  render: (renderer: THREE.WebGLRenderer) => void;
  handleClick: (event: PointerEvent) => boolean;
  dispose: () => void;
};

export type TransformAxis = 'x' | 'y' | 'z';

export type SelectedNode = {
  id: string;
  name: string;
  nodeType: string;
  selectionKind: 'structure-node';
  hidden?: boolean;
  position: Record<TransformAxis, number>;
  rotation: Record<TransformAxis, number>;
};

export type ResetTransformTarget = 'position' | 'rotation' | 'all';

export type ThreeViewerHandle = {
  listStructureTree: () => Array<StructureTreeNode>;
  focusStructureNode: (id: string) => void;
  focusFullModel: () => void;
  clearSelection: () => void;
  setStructureNodeHidden: (id: string, hidden: boolean) => void;
  nudgeSelectedNode: (axis: TransformAxis, delta: number) => void;
  rotateSelectedNode: (axis: TransformAxis, deltaRadians: number) => void;
  resetSelectedNode: (target: ResetTransformTarget) => void;
  hideSelectedNode: () => void;
  restoreNode: (id: string) => void;
  exportGlb: (target?: 'download' | 'edited-model') => Promise<Blob | null>;
  exportStl: () => Blob | null;
};

type SelectedNodeState = {
  id: string;
  selectionKind: 'structure-node';
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

const exportObjectToGlb = async (object: THREE.Object3D): Promise<Blob> => {
  const exporter = new GLTFExporter();
  object.updateWorldMatrix(true, true);
  const binary = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      object,
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
      disposeMaterial(child.material);
    }
  });
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

    const storedOriginal = getStoredOriginalMaterial(child);
    const original = normalizeMaterialSet(storedOriginal ?? child.material);
    if (!storedOriginal) {
      child.userData.originalMaterial = original;
    }

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
  camera.position.set(distance, distance, distance * 0.85);
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

const captureInitialTransforms = (root: THREE.Object3D) => {
  root.traverse((child) => {
    child.userData.initialPosition = child.position.clone();
    child.userData.initialQuaternion = child.quaternion.clone();
  });
};

const getPointerInNdc = (
  event: {
    clientX: number;
    clientY: number;
  },
  element: HTMLElement,
) => {
  const bounds = element.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
  );
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

const findStructureTreeNode = (
  nodes: Array<StructureTreeNode>,
  id: string,
): StructureTreeNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findStructureTreeNode(node.children, id);
    if (found) {
      return found;
    }
  }
  return null;
};

const createEditedModelExportObject = (
  source: THREE.Object3D,
  options?: { onlyVisible?: boolean },
) => {
  if (options?.onlyVisible && !source.visible) {
    return new THREE.Group();
  }

  const clone = source.clone(true);
  const stack: Array<{ source: THREE.Object3D; target: THREE.Object3D }> = [
    { source, target: clone },
  ];

  while (stack.length > 0) {
    const current = stack.pop() as { source: THREE.Object3D; target: THREE.Object3D };

    if (options?.onlyVisible && !current.source.visible) {
      current.target.parent?.remove(current.target);
      continue;
    }

    current.target.visible = current.source.visible;
    delete current.target.userData.originalMaterial;

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
    interactionMode = 'create',
    className,
    onStructureTreeChange,
    onSelectedNodeChange,
    onModelParseError,
    onSceneMutated,
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
  const structureTreeRef = useRef<Array<StructureTreeNode>>([]);
  const selectionHelperRef = useRef<THREE.BoxHelper | null>(null);
  const structureNodeMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const selectedNodeRef = useRef<SelectedNodeState | null>(null);
  const interactionModeRef = useRef<RightPanelMode>(interactionMode);
  const structureSelectionCycleRef = useRef<{
    signature: string;
    index: number;
  } | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());

  useEffect(() => {
    interactionModeRef.current = interactionMode;
    if (interactionMode === 'edit') return;
    structureSelectionCycleRef.current = null;
  }, [interactionMode]);

  const updateStructureTree = (tree: Array<StructureTreeNode>) => {
    structureTreeRef.current = tree;
    onStructureTreeChange?.(tree);
  };

  const syncStructureTree = () => {
    const sourceModel = sourceModelRef.current;
    if (!sourceModel) {
      structureNodeMapRef.current = new Map();
      updateStructureTree([]);
      return;
    }
    structureNodeMapRef.current = collectObjectNodeMap(sourceModel);
    updateStructureTree(buildStructureTree(sourceModel));
  };

  const getSelectedSourceNode = () => {
    const selectedNode = selectedNodeRef.current;
    if (!selectedNode) return null;
    return structureNodeMapRef.current.get(selectedNode.id) ?? null;
  };

  const getSelectedNodeSnapshot = (): SelectedNode | null => {
    const selectedNode = selectedNodeRef.current;
    const activeNode = getSelectedSourceNode();
    if (!selectedNode || !activeNode) return null;
    const sourceTreeNode =
      structureTreeRef.current.length > 0
        ? findStructureTreeNode(structureTreeRef.current, selectedNode.id)
        : null;
    const rotation = new THREE.Euler().setFromQuaternion(activeNode.quaternion, 'XYZ');
    return {
      id: selectedNode.id,
      name: sourceTreeNode?.displayName ?? activeNode.name ?? 'Node',
      nodeType: sourceTreeNode?.nodeType ?? activeNode.type ?? 'Object3D',
      selectionKind: 'structure-node',
      hidden: sourceTreeNode?.hidden ?? !activeNode.visible,
      position: {
        x: activeNode.position.x,
        y: activeNode.position.y,
        z: activeNode.position.z,
      },
      rotation: {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
      },
    };
  };

  const clearSelectionHighlight = () => {
    const helper = selectionHelperRef.current;
    if (!helper) return;
    helper.parent?.remove(helper);
    helper.geometry.dispose();
    disposeMaterial(helper.material);
    selectionHelperRef.current = null;
  };

  const updateSelectionHighlight = () => {
    const scene = sceneRef.current;
    const selectedNode = getSelectedSourceNode();
    clearSelectionHighlight();
    if (!scene || !selectedNode) return;
    selectedNode.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(selectedNode);
    if (box.isEmpty()) return;
    const helper = new THREE.BoxHelper(selectedNode, 0x38bdf8);
    helper.renderOrder = 2;
    if (!Array.isArray(helper.material)) {
      if ('depthTest' in helper.material) {
        helper.material.depthTest = false;
      }
      if ('transparent' in helper.material) {
        helper.material.transparent = true;
      }
      if ('opacity' in helper.material) {
        helper.material.opacity = 0.95;
      }
    }
    scene.add(helper);
    selectionHelperRef.current = helper;
  };

  const emitSelectedNodeChange = () => {
    updateSelectionHighlight();
    onSelectedNodeChange?.(getSelectedNodeSnapshot());
  };

  const emitSceneMutated = () => {
    onSceneMutated?.();
  };

  const selectNode = (selection: SelectedNodeState | null) => {
    if (!selection) {
      structureSelectionCycleRef.current = null;
    }
    selectedNodeRef.current = selection;
    emitSelectedNodeChange();
  };

  const getStructureSelectionPath = (object: THREE.Object3D | null) => {
    const ids: Array<string> = [];
    let current = object;
    while (current) {
      const sourceNodeId =
        typeof current.userData.sourceNodeId === 'string'
          ? current.userData.sourceNodeId
          : current.uuid;
      if (structureNodeMapRef.current.has(sourceNodeId) && !ids.includes(sourceNodeId)) {
        ids.push(sourceNodeId);
      }
      current = current.parent;
    }
    const path = ids.reverse();
    const rootId = structureTreeRef.current[0]?.id;
    if (rootId && path[0] === rootId && path.length > 1) {
      return path.slice(1);
    }
    return path;
  };

  const selectClickTargetFromHit = (object: THREE.Object3D | null) => {
    const targets = getStructureSelectionPath(object).map(
      (id) => ({ id, selectionKind: 'structure-node' }) satisfies SelectedNodeState,
    );
    if (targets.length === 0) return false;

    const signature = targets.map((target) => target.id).join('>');
    const cycle = structureSelectionCycleRef.current;
    const selectedNode = selectedNodeRef.current;

    let nextIndex = 0;
    if (cycle && cycle.signature === signature) {
      nextIndex = (cycle.index + 1) % targets.length;
    } else if (selectedNode) {
      const currentIndex = targets.findIndex((target) => target.id === selectedNode.id);
      if (currentIndex >= 0) {
        nextIndex = (currentIndex + 1) % targets.length;
      }
    }

    structureSelectionCycleRef.current = {
      signature,
      index: nextIndex,
    };
    selectNode(targets[nextIndex]);
    return true;
  };

  const updateSelectedNode = (
    updater: (node: THREE.Object3D) => void,
    options?: { syncStructureTree?: boolean },
  ) => {
    const node = getSelectedSourceNode();
    if (!node) return;
    updater(node);
    node.updateWorldMatrix(true, true);
    if (options?.syncStructureTree !== false) {
      syncStructureTree();
    }
    emitSelectedNodeChange();
    emitSceneMutated();
  };

  useImperativeHandle(
    ref,
    () => ({
      listStructureTree: () => structureTreeRef.current,
      focusStructureNode: (id: string) => {
        const node = structureNodeMapRef.current.get(id);
        if (!node) return;
        selectNode({ id, selectionKind: 'structure-node' });
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (!camera || !controls) return;
        focusCameraOnObject(camera, controls, node);
      },
      focusFullModel: () => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        const source = sourceModelRef.current ?? modelRef.current;
        if (!camera || !controls || !source) return;
        focusCameraOnObject(camera, controls, source);
      },
      clearSelection: () => {
        selectNode(null);
      },
      setStructureNodeHidden: (id: string, hidden: boolean) => {
        const node = structureNodeMapRef.current.get(id);
        if (!node) return;
        node.visible = !hidden;
        node.updateWorldMatrix(true, true);
        syncStructureTree();
        emitSelectedNodeChange();
        emitSceneMutated();
      },
      nudgeSelectedNode: (axis: TransformAxis, delta: number) => {
        updateSelectedNode((node) => {
          node.position[axis] += delta;
        });
      },
      rotateSelectedNode: (axis: TransformAxis, deltaRadians: number) => {
        updateSelectedNode((node) => {
          if (axis === 'x') {
            node.rotateX(deltaRadians);
          } else if (axis === 'y') {
            node.rotateY(deltaRadians);
          } else {
            node.rotateZ(deltaRadians);
          }
        });
      },
      resetSelectedNode: (target: ResetTransformTarget) => {
        updateSelectedNode((node) => {
          const initialPosition = node.userData.initialPosition as THREE.Vector3 | undefined;
          const initialQuaternion = node.userData.initialQuaternion as THREE.Quaternion | undefined;
          if ((target === 'position' || target === 'all') && initialPosition) {
            node.position.copy(initialPosition);
          }
          if ((target === 'rotation' || target === 'all') && initialQuaternion) {
            node.quaternion.copy(initialQuaternion);
          }
        });
      },
      hideSelectedNode: () => {
        updateSelectedNode((node) => {
          node.visible = false;
        });
      },
      restoreNode: (id: string) => {
        const node = structureNodeMapRef.current.get(id);
        if (!node) return;
        node.visible = true;
        node.updateWorldMatrix(true, true);
        syncStructureTree();
        emitSelectedNodeChange();
        emitSceneMutated();
      },
      exportGlb: async (target = 'download') => {
        const source = sourceModelRef.current ?? modelRef.current;
        if (!source) return null;
        const object = target === 'edited-model' ? createEditedModelExportObject(source) : source;
        try {
          return await exportObjectToGlb(object);
        } finally {
          if (target === 'edited-model') {
            disposeObject(object);
          }
        }
      },
      exportStl: () => {
        const source = sourceModelRef.current ?? modelRef.current;
        if (!source) return null;
        const object = createEditedModelExportObject(source, { onlyVisible: true });
        try {
          return exportObjectToStl(object);
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
    camera.up.set(0, 0, 1);
    camera.position.set(6, 6, 4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);

    const viewHelper = new ViewHelper(camera, renderer.domElement) as unknown as ViewHelperInstance;
    viewHelper.center.copy(controls.target);

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

    const getStructureNodeIdFromObject = (object: THREE.Object3D | null) => {
      let current = object;
      while (current) {
        const sourceNodeId =
          typeof current.userData.sourceNodeId === 'string'
            ? current.userData.sourceNodeId
            : current.uuid;
        if (structureNodeMapRef.current.has(sourceNodeId)) {
          return sourceNodeId;
        }
        current = current.parent;
      }
      return null;
    };

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
        } else if (interactionModeRef.current === 'edit') {
          const model = modelRef.current;
          const pointer = getPointerInNdc(clickEvent, renderer.domElement);
          const raycaster = raycasterRef.current;
          raycaster.setFromCamera(pointer, camera);
          const intersections = model ? raycaster.intersectObject(model, true) : [];
          const hitObject = intersections[0]?.object ?? null;
          const structureNodeId = getStructureNodeIdFromObject(hitObject);
          if (structureNodeId) {
            selectClickTargetFromHit(hitObject);
          } else {
            selectNode(null);
          }
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
      selectionHelperRef.current?.update();
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
      renderer.dispose();
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
      clearSelectionHighlight();
      structureNodeMapRef.current = new Map();
      selectedNodeRef.current = null;
      updateStructureTree([]);
      emitSelectedNodeChange();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls) return;

    const toDispose = new Set<THREE.Object3D>();
    if (modelRef.current) toDispose.add(modelRef.current);
    if (sourceModelRef.current) toDispose.add(sourceModelRef.current);
    toDispose.forEach((object) => {
      object.parent?.remove(object);
      disposeObject(object);
    });
    modelRef.current = null;
    sourceModelRef.current = null;
    structureNodeMapRef.current = new Map();
    selectedNodeRef.current = null;
    updateStructureTree([]);
    emitSelectedNodeChange();

    const applyLoadedModel = (object: THREE.Object3D) => {
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });

      sourceModelRef.current = object;
      scene.add(object);
      modelRef.current = object;
      syncStructureTree();
      applyViewMode(object, viewModeKey);
      fitCameraToObject(camera, controls, object);
      captureInitialTransforms(object);
      onModelParseError?.(null);
    };

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
        applyLoadedModel(gltf.scene);
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
  }, [modelCode, modelData, onModelParseError, viewModeKey]);

  useEffect(() => {
    if (!modelRef.current) return;
    applyViewMode(modelRef.current, viewModeKey);
  }, [viewModeKey]);

  return <div ref={containerRef} className={cn('h-full w-full', className)} />;
});
