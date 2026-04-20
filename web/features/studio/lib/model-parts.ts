import * as THREE from 'three';

export type PartNode = {
  id: string;
  name: string;
  displayName: string;
};

const UNNAMED_PART_LABEL = 'Unnamed Part';

const getPartName = (object: THREE.Object3D) => object.name.trim();

const getPartDisplayName = (object: THREE.Object3D) => getPartName(object) || UNNAMED_PART_LABEL;

const isWrapperRoot = (root: THREE.Object3D) => {
  return (root instanceof THREE.Scene || root instanceof THREE.Group) && root.children.length > 0;
};

export const collectPartNodes = (root: THREE.Object3D) => {
  const partObjects = isWrapperRoot(root) ? root.children : [root];
  const partObjectMap = new Map<string, THREE.Object3D>();
  const parts = partObjects.map((object) => {
    partObjectMap.set(object.uuid, object);
    return {
      id: object.uuid,
      name: getPartName(object),
      displayName: getPartDisplayName(object),
    } satisfies PartNode;
  });

  return {
    parts,
    partObjectMap,
  };
};
