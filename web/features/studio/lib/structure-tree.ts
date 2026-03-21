import * as THREE from 'three';

export type StructureTreeNode = {
  id: string;
  name: string;
  displayName: string;
  nodeType: string;
  childCount: number;
  meshCount: number;
  hidden: boolean;
  children: Array<StructureTreeNode>;
};

const UNNAMED_NODE_LABEL = 'Unnamed Node';

const getNodeName = (object: THREE.Object3D) => object.name.trim();

const getDisplayName = (object: THREE.Object3D) => getNodeName(object) || UNNAMED_NODE_LABEL;

const getNodeType = (object: THREE.Object3D) => object.type?.trim() || 'Object3D';

const buildStructureTreeNode = (
  object: THREE.Object3D,
  ancestorHidden = false,
): {
  meshCount: number;
  node: StructureTreeNode;
} => {
  const hidden = ancestorHidden || !object.visible;
  const childResults = object.children.map((child) => buildStructureTreeNode(child, hidden));
  const childMeshCount = childResults.reduce((sum, child) => sum + child.meshCount, 0);
  const meshCount = childMeshCount + (object instanceof THREE.Mesh ? 1 : 0);

  return {
    meshCount,
    node: {
      id: object.uuid,
      name: getNodeName(object),
      displayName: getDisplayName(object),
      nodeType: getNodeType(object),
      childCount: object.children.length,
      meshCount,
      hidden,
      children: childResults.map((child) => child.node),
    },
  };
};

export const buildStructureTree = (root: THREE.Object3D): Array<StructureTreeNode> => {
  return [buildStructureTreeNode(root).node];
};

export const collectObjectNodeMap = (root: THREE.Object3D) => {
  const nodeMap = new Map<string, THREE.Object3D>();
  root.traverse((child) => {
    nodeMap.set(child.uuid, child);
  });
  return nodeMap;
};
