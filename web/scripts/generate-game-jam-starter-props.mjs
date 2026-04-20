import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class NodeFileReader {
    result = null;
    onloadend = null;

    async readAsArrayBuffer(blob) {
      this.result = await blob.arrayBuffer();
      this.onloadend?.({ target: this });
    }

    async readAsDataURL(blob) {
      const buffer = Buffer.from(await blob.arrayBuffer());
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
      this.onloadend?.({ target: this });
    }
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const outputRoot = path.join(repoRoot, 'context/marketing/game-jam-starter-props');
const glbDir = path.join(outputRoot, 'glb');
const objDir = path.join(outputRoot, 'obj');

const assetStyle =
  'Charming retro low-poly 3D game prop, PS1-era indie game style, simple primitive-friendly geometry, flat colors, no realistic details, no text, no logos, no characters, no animation, single centered object, game-ready GLB, low polygon count.';

const prompts = {
  wooden_crate:
    'A small wooden crate made of simple low-poly planks, slightly uneven shape, warm brown wood, dark gaps between boards.',
  wooden_barrel:
    'A squat wooden barrel with simple metal bands, chunky low-poly shape, warm brown wood and dark gray bands, slightly stylized and old.',
  blank_signpost:
    'A small wooden signpost with a blank sign board, no writing, thick simple post, slightly tilted, rustic fantasy village style.',
  lantern:
    'A chunky low-poly lantern with a simple metal frame and warm yellow glowing center, thick handle, compact shape, fantasy game prop.',
  campfire:
    'A small campfire made of low-poly logs arranged in a circle with simple orange and yellow flame shapes, a few gray stones around it.',
  treasure_chest:
    'A small closed treasure chest with a rounded low-poly lid, dark brown wood, simple gold trim, chunky lock shape, no detailed ornament.',
  stone_well:
    'A small stone well made of chunky low-poly gray stones, simple wooden roof, small bucket shape, compact fantasy village prop.',
  fence_segment:
    'A short wooden fence segment with three thick posts and two horizontal rails, rough low-poly planks, warm brown color, slightly uneven.',
  wooden_table:
    'A simple low-poly wooden table, chunky legs, square top, rustic game prop, slightly worn but not detailed.',
  broken_chair:
    'A small broken wooden chair with one missing plank and slightly tilted backrest, chunky low-poly parts, rustic brown wood, readable silhouette.',
  potion_bottle:
    'A small low-poly potion bottle with a round body, short neck, cork stopper, bright blue liquid, simple glass shape, fantasy inventory prop.',
  rock_cluster:
    'A cluster of three chunky low-poly rocks, irregular faceted shapes, gray flat colors, simple game environment prop.',
};

const palette = {
  wood: 0x7a4725,
  darkWood: 0x4b2b1a,
  lightWood: 0xa06534,
  metal: 0x3c3f41,
  gold: 0xc59a35,
  stone: 0x777b7f,
  darkStone: 0x4e5357,
  rope: 0xb58a55,
  fireOrange: 0xff7a1a,
  fireYellow: 0xffd15c,
  glow: 0xffc35c,
  potion: 0x2b9bd8,
  glass: 0x9fd8e8,
  cork: 0x9c6f3b,
};

const materials = Object.fromEntries(
  Object.entries(palette).map(([name, color]) => [
    name,
    new THREE.MeshStandardMaterial({
      name,
      color,
      roughness: 0.85,
      metalness: name === 'metal' || name === 'gold' ? 0.25 : 0,
      flatShading: true,
    }),
  ]),
);

materials.glass = new THREE.MeshStandardMaterial({
  name: 'glass',
  color: palette.glass,
  roughness: 0.35,
  metalness: 0,
  transparent: true,
  opacity: 0.52,
  flatShading: true,
});

materials.glow = new THREE.MeshStandardMaterial({
  name: 'warm_glow',
  color: palette.glow,
  emissive: palette.glow,
  emissiveIntensity: 0.8,
  roughness: 0.5,
  flatShading: true,
});

function namedMaterial(name, color) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    roughness: 0.88,
    flatShading: true,
  });
}

function addMesh(group, name, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  group.add(mesh);
  return mesh;
}

function box(group, name, size, position, material, rotation = [0, 0, 0]) {
  return addMesh(group, name, new THREE.BoxGeometry(size[0], size[1], size[2]), material, position, rotation);
}

function cylinder(group, name, radiusTop, radiusBottom, height, position, material, rotation = [0, 0, 0], segments = 8) {
  return addMesh(
    group,
    name,
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false),
    material,
    position,
    rotation,
  );
}

function cone(group, name, radius, height, position, material, rotation = [0, 0, 0], segments = 5) {
  return addMesh(group, name, new THREE.ConeGeometry(radius, height, segments), material, position, rotation);
}

function dodeca(group, name, radius, position, material, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  return addMesh(
    group,
    name,
    new THREE.DodecahedronGeometry(radius, 0),
    material,
    position,
    rotation,
    scale,
  );
}

function halfCylinderGeometry(radius, length, segments = 8) {
  const vertices = [];
  const indices = [];
  const half = length / 2;

  for (let i = 0; i <= segments; i += 1) {
    const angle = Math.PI - (Math.PI * i) / segments;
    const y = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    vertices.push(-half, y, z, half, y, z);
  }

  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const bottomLeft = vertices.length / 3;
  vertices.push(-half, 0, -radius, half, 0, -radius, -half, 0, radius, half, 0, radius);
  indices.push(bottomLeft, bottomLeft + 2, bottomLeft + 1, bottomLeft + 1, bottomLeft + 2, bottomLeft + 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function prepareAsset(group, name) {
  group.name = name;
  group.updateWorldMatrix(true, true);
  const box3 = new THREE.Box3().setFromObject(group);
  const center = box3.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.updateWorldMatrix(true, true);
  const grounded = new THREE.Box3().setFromObject(group);
  group.position.y -= grounded.min.y;
  group.updateWorldMatrix(true, true);
  return group;
}

function makeScene(asset) {
  const scene = new THREE.Scene();
  scene.name = `${asset.name}_scene`;
  scene.add(asset);
  return scene;
}

async function exportGlb(asset, filename) {
  const exporter = new GLTFExporter();
  const scene = makeScene(asset.clone(true));
  scene.updateWorldMatrix(true, true);
  const result = await new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      resolve,
      reject,
      { binary: true, trs: false, onlyVisible: true, includeCustomExtensions: false },
    );
  });

  if (!(result instanceof ArrayBuffer)) {
    throw new Error(`Expected ArrayBuffer from GLTFExporter for ${filename}`);
  }

  await writeFile(path.join(glbDir, `${filename}.glb`), Buffer.from(result));
}

async function exportObj(asset, filename) {
  const exporter = new OBJExporter();
  const result = exporter.parse(asset.clone(true));
  await writeFile(path.join(objDir, `${filename}.obj`), result, 'utf8');
}

function woodenCrate() {
  const g = new THREE.Group();
  box(g, 'dark_inner_box', [1.55, 1.25, 1.55], [0, 0.64, 0], materials.darkWood);
  box(g, 'front_plank_top', [1.7, 0.22, 0.14], [0, 1.12, 0.83], materials.lightWood);
  box(g, 'front_plank_mid', [1.55, 0.22, 0.14], [0, 0.64, 0.84], materials.wood);
  box(g, 'front_plank_bottom', [1.7, 0.22, 0.14], [0, 0.18, 0.83], materials.lightWood);
  box(g, 'back_plank_top', [1.7, 0.22, 0.14], [0, 1.12, -0.83], materials.lightWood);
  box(g, 'back_plank_mid', [1.55, 0.22, 0.14], [0, 0.64, -0.84], materials.wood);
  box(g, 'back_plank_bottom', [1.7, 0.22, 0.14], [0, 0.18, -0.83], materials.lightWood);
  box(g, 'left_plank', [0.14, 1.15, 1.72], [-0.83, 0.64, 0], materials.wood);
  box(g, 'right_plank', [0.14, 1.15, 1.72], [0.83, 0.64, 0], materials.wood);
  box(g, 'diagonal_brace_a', [0.16, 1.75, 0.12], [-0.02, 0.64, 0.94], materials.darkWood, [0, 0, -0.85]);
  box(g, 'diagonal_brace_b', [0.16, 1.75, 0.12], [0.02, 0.64, -0.94], materials.darkWood, [0, 0, 0.85]);
  return prepareAsset(g, 'wooden_crate');
}

function woodenBarrel() {
  const g = new THREE.Group();
  cylinder(g, 'barrel_body', 0.55, 0.55, 1.35, [0, 0.7, 0], materials.wood, [0, 0, 0], 10);
  cylinder(g, 'top_cap', 0.5, 0.5, 0.08, [0, 1.42, 0], materials.lightWood, [0, 0, 0], 10);
  cylinder(g, 'bottom_cap', 0.5, 0.5, 0.08, [0, -0.02, 0], materials.darkWood, [0, 0, 0], 10);
  cylinder(g, 'top_metal_band', 0.59, 0.59, 0.12, [0, 1.12, 0], materials.metal, [0, 0, 0], 10);
  cylinder(g, 'bottom_metal_band', 0.59, 0.59, 0.12, [0, 0.28, 0], materials.metal, [0, 0, 0], 10);
  return prepareAsset(g, 'wooden_barrel');
}

function blankSignpost() {
  const g = new THREE.Group();
  box(g, 'tilted_post', [0.18, 1.55, 0.18], [0, 0.75, 0], materials.darkWood, [0, 0, -0.12]);
  box(g, 'blank_board', [1.55, 0.55, 0.16], [0.06, 1.25, 0.02], materials.wood, [0, 0, -0.06]);
  box(g, 'board_top_trim', [1.65, 0.08, 0.18], [0.05, 1.55, 0.02], materials.lightWood, [0, 0, -0.06]);
  box(g, 'board_bottom_trim', [1.65, 0.08, 0.18], [0.08, 0.95, 0.02], materials.darkWood, [0, 0, -0.06]);
  return prepareAsset(g, 'blank_signpost');
}

function lantern() {
  const g = new THREE.Group();
  box(g, 'glowing_center', [0.42, 0.62, 0.42], [0, 0.65, 0], materials.glow);
  cylinder(g, 'top_cap', 0.38, 0.34, 0.12, [0, 1.02, 0], materials.metal, [0, 0, 0], 8);
  cylinder(g, 'bottom_cap', 0.36, 0.4, 0.12, [0, 0.28, 0], materials.metal, [0, 0, 0], 8);
  for (const x of [-0.28, 0.28]) {
    for (const z of [-0.28, 0.28]) {
      box(g, `frame_${x}_${z}`, [0.07, 0.82, 0.07], [x, 0.65, z], materials.metal);
    }
  }
  addMesh(g, 'chunky_handle', new THREE.TorusGeometry(0.26, 0.035, 5, 10, Math.PI), materials.metal, [0, 1.13, 0], [0, 0, Math.PI]);
  return prepareAsset(g, 'lantern');
}

function campfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i += 1) {
    const angle = (Math.PI * 2 * i) / 4;
    cylinder(
      g,
      `log_${i + 1}`,
      0.08,
      0.1,
      1.05,
      [Math.cos(angle) * 0.08, 0.18, Math.sin(angle) * 0.08],
      materials.darkWood,
      [Math.PI / 2, 0, angle],
      6,
    );
  }
  cone(g, 'outer_flame', 0.36, 0.95, [0, 0.68, 0], materials.fireOrange, [0, 0, 0], 5);
  cone(g, 'inner_flame', 0.2, 0.68, [0.03, 0.68, 0.03], materials.fireYellow, [0, 0.2, 0], 5);
  for (let i = 0; i < 7; i += 1) {
    const angle = (Math.PI * 2 * i) / 7;
    dodeca(g, `stone_${i + 1}`, 0.13, [Math.cos(angle) * 0.62, 0.09, Math.sin(angle) * 0.62], materials.stone, [1.15, 0.7, 0.9]);
  }
  return prepareAsset(g, 'campfire');
}

function treasureChest() {
  const g = new THREE.Group();
  box(g, 'chest_base', [1.35, 0.65, 0.85], [0, 0.35, 0], materials.darkWood);
  addMesh(g, 'rounded_lid', halfCylinderGeometry(0.45, 1.35, 8), materials.wood, [0, 0.7, 0], [0, Math.PI / 2, 0]);
  box(g, 'front_gold_trim', [1.45, 0.1, 0.08], [0, 0.68, 0.46], materials.gold);
  box(g, 'bottom_gold_trim', [1.45, 0.1, 0.08], [0, 0.12, 0.46], materials.gold);
  box(g, 'lock', [0.18, 0.24, 0.1], [0, 0.43, 0.52], materials.gold);
  box(g, 'left_side_band', [0.1, 1.0, 0.95], [-0.5, 0.48, 0], materials.gold);
  box(g, 'right_side_band', [0.1, 1.0, 0.95], [0.5, 0.48, 0], materials.gold);
  return prepareAsset(g, 'treasure_chest');
}

function stoneWell() {
  const g = new THREE.Group();
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10;
    box(
      g,
      `stone_block_${i + 1}`,
      [0.34, 0.24, 0.22],
      [Math.cos(angle) * 0.62, 0.14, Math.sin(angle) * 0.62],
      i % 2 ? materials.stone : materials.darkStone,
      [0, -angle, 0],
    );
  }
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * (i + 0.5)) / 10;
    box(
      g,
      `upper_stone_${i + 1}`,
      [0.3, 0.22, 0.2],
      [Math.cos(angle) * 0.6, 0.42, Math.sin(angle) * 0.6],
      i % 2 ? materials.darkStone : materials.stone,
      [0, -angle, 0],
    );
  }
  box(g, 'left_roof_post', [0.12, 1.0, 0.12], [-0.55, 0.98, 0], materials.darkWood);
  box(g, 'right_roof_post', [0.12, 1.0, 0.12], [0.55, 0.98, 0], materials.darkWood);
  box(g, 'roof_left', [0.9, 0.12, 0.75], [-0.32, 1.55, 0], materials.wood, [0, 0, -0.42]);
  box(g, 'roof_right', [0.9, 0.12, 0.75], [0.32, 1.55, 0], materials.wood, [0, 0, 0.42]);
  cylinder(g, 'tiny_bucket', 0.16, 0.19, 0.28, [0, 0.78, 0], materials.darkWood, [0, 0, 0], 7);
  return prepareAsset(g, 'stone_well');
}

function fenceSegment() {
  const g = new THREE.Group();
  for (const x of [-0.75, 0, 0.75]) {
    box(g, `post_${x}`, [0.18, 1.1, 0.18], [x, 0.55, 0], materials.darkWood);
    cone(g, `post_tip_${x}`, 0.15, 0.22, [x, 1.21, 0], materials.darkWood, [0, Math.PI / 4, 0], 4);
  }
  box(g, 'top_rail', [1.8, 0.18, 0.16], [0, 0.82, 0.03], materials.wood, [0, 0, -0.05]);
  box(g, 'bottom_rail', [1.75, 0.18, 0.16], [0, 0.42, 0.02], materials.lightWood, [0, 0, 0.04]);
  return prepareAsset(g, 'fence_segment');
}

function woodenTable() {
  const g = new THREE.Group();
  box(g, 'table_top', [1.5, 0.18, 0.9], [0, 0.9, 0], materials.wood);
  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.3, 0.3]) {
      box(g, `leg_${x}_${z}`, [0.16, 0.82, 0.16], [x, 0.42, z], materials.darkWood, [0.04 * Math.sign(x), 0, 0.02 * Math.sign(z)]);
    }
  }
  box(g, 'front_apron', [1.25, 0.16, 0.12], [0, 0.72, 0.42], materials.darkWood);
  box(g, 'back_apron', [1.25, 0.16, 0.12], [0, 0.72, -0.42], materials.darkWood);
  return prepareAsset(g, 'wooden_table');
}

function brokenChair() {
  const g = new THREE.Group();
  box(g, 'seat', [0.9, 0.16, 0.8], [0, 0.55, 0], materials.wood);
  for (const x of [-0.32, 0.32]) {
    for (const z of [-0.28, 0.28]) {
      if (x > 0 && z > 0) continue;
      box(g, `leg_${x}_${z}`, [0.13, 0.58, 0.13], [x, 0.25, z], materials.darkWood, [0.05 * Math.sign(x), 0, 0]);
    }
  }
  box(g, 'broken_short_leg', [0.13, 0.28, 0.13], [0.32, 0.12, 0.28], materials.darkWood, [0.25, 0, -0.2]);
  box(g, 'left_back_post', [0.13, 1.2, 0.13], [-0.36, 1.02, -0.32], materials.darkWood, [-0.25, 0, 0]);
  box(g, 'right_back_post', [0.13, 0.86, 0.13], [0.36, 0.87, -0.32], materials.darkWood, [-0.18, 0, 0]);
  box(g, 'back_rest', [0.9, 0.16, 0.13], [0, 1.35, -0.48], materials.wood, [-0.25, 0, 0.03]);
  return prepareAsset(g, 'broken_chair');
}

function potionBottle() {
  const g = new THREE.Group();
  addMesh(g, 'round_glass_body', new THREE.SphereGeometry(0.42, 8, 6), materials.glass, [0, 0.46, 0], [0, 0, 0], [1, 1.05, 1]);
  cylinder(g, 'blue_liquid', 0.34, 0.38, 0.32, [0, 0.34, 0], materials.potion, [0, 0, 0], 8);
  cylinder(g, 'short_neck', 0.15, 0.18, 0.36, [0, 0.88, 0], materials.glass, [0, 0, 0], 8);
  cylinder(g, 'cork', 0.14, 0.16, 0.2, [0, 1.12, 0], materials.cork, [0, 0, 0], 7);
  cylinder(g, 'rope_tie', 0.19, 0.19, 0.05, [0, 0.72, 0], materials.rope, [0, 0, 0], 8);
  return prepareAsset(g, 'potion_bottle');
}

function rockCluster() {
  const g = new THREE.Group();
  dodeca(g, 'large_rock', 0.48, [-0.28, 0.35, 0], materials.stone, [1.1, 0.8, 0.9], [0.2, 0.1, -0.1]);
  dodeca(g, 'middle_rock', 0.36, [0.32, 0.26, 0.1], materials.darkStone, [1, 0.75, 1.2], [0.1, -0.2, 0.3]);
  dodeca(g, 'small_rock', 0.24, [0.05, 0.18, -0.42], materials.stone, [0.9, 0.7, 1.15], [-0.2, 0.4, 0.1]);
  return prepareAsset(g, 'rock_cluster');
}

const builders = {
  wooden_crate: woodenCrate,
  wooden_barrel: woodenBarrel,
  blank_signpost: blankSignpost,
  lantern,
  campfire,
  treasure_chest: treasureChest,
  stone_well: stoneWell,
  fence_segment: fenceSegment,
  wooden_table: woodenTable,
  broken_chair: brokenChair,
  potion_bottle: potionBottle,
  rock_cluster: rockCluster,
};

async function writeReadme(manifest) {
  const lines = [
    '# Game Jam Starter Props',
    '',
    'A small retro low-poly 3D prop pack for validating the new Ascoor product direction.',
    '',
    'These prototype assets were generated procedurally with Three.js, not with the current Ascoor model-generation flow.',
    'Use them for market validation and visual direction testing. Do not claim "Made with Ascoor" unless the specific model was actually generated by Ascoor.',
    '',
    '## Contents',
    '',
    '- `glb/`: Binary glTF files',
    '- `obj/`: OBJ files',
    '- `manifest.json`: Asset names, source, and prompts',
    '',
    '## License',
    '',
    'Prototype pack for Ascoor validation. Decide the final public license before uploading to itch.io.',
    '',
    '## Assets',
    '',
    ...manifest.map((asset) => `- ${asset.name}: ${asset.prompt}`),
    '',
  ];

  await writeFile(path.join(outputRoot, 'README.md'), `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  await mkdir(glbDir, { recursive: true });
  await mkdir(objDir, { recursive: true });

  const manifest = [];

  for (const [name, build] of Object.entries(builders)) {
    const asset = build();
    const prompt = `${prompts[name]} ${assetStyle}`;
    await exportGlb(asset, name);
    await exportObj(asset, name);
    manifest.push({
      name,
      source: 'threejs_procedural',
      prompt,
      glb: `glb/${name}.glb`,
      obj: `obj/${name}.obj`,
    });
    console.log(`generated ${name}`);
  }

  await writeFile(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  await writeReadme(manifest);
  console.log(`\nWrote ${manifest.length} assets to ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
