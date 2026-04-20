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
const outputRoot = path.join(repoRoot, 'context/marketing/cyberpunk-voxel-props');
const glbDir = path.join(outputRoot, 'glb');
const objDir = path.join(outputRoot, 'obj');

const voxelSize = 0.16;
const assetStyle =
  '3D voxel art cyberpunk game prop, made only from chunky cubic blocks, retro indie game style, flat colors, cyan and magenta neon accents, no readable text, no logos, no characters, no animation, single centered object, game-ready GLB.';

const prompts = {
  voxel_vending_machine:
    'A voxel cyberpunk vending machine with a dark blocky body, blank glowing cyan display, magenta side light strip, and chunky base.',
  voxel_holo_terminal:
    'A voxel street terminal with a dark cubic base, tilted cyan hologram screen, and small unlabeled glowing buttons.',
  voxel_street_lamp:
    'A voxel cyberpunk street lamp with a blocky pole, bent arm, cyan light bar, and dark square base.',
  voxel_power_generator:
    'A voxel power generator box with vents, blocky cables, yellow hazard panels without symbols, and cyan indicator lights.',
  voxel_cable_spool:
    'A voxel cable spool with square reel sides, thick black cable blocks, and small cyan connector lights.',
  voxel_neon_barrier:
    'A voxel cyberpunk street barrier with two blocky posts, dark feet, and glowing magenta and cyan rails.',
  voxel_rooftop_ac:
    'A voxel rooftop air conditioner unit with dark vents, cubic metal casing, and cyan indicator lights.',
  voxel_data_crate:
    'A voxel reinforced data crate with dark panels, cyan glowing seams, and chunky corner guards.',
  voxel_neon_barrel:
    'A voxel cyberpunk barrel made from stacked block layers, dark body, cyan lower band, and magenta upper band.',
  voxel_holo_sign:
    'A voxel blank hologram signpost with a transparent cyan rectangular panel, dark pole, and magenta lower edge.',
  voxel_food_cart:
    'A voxel cyberpunk street food cart with a dark counter, blocky canopy, neon trim, and small cube wheels.',
  voxel_charging_pad:
    'A voxel drone charging pad with a blocky octagonal base, glowing cyan center, and magenta side panels.',
};

const colors = {
  graphite: 0x22262c,
  darkMetal: 0x343b43,
  midMetal: 0x59636d,
  black: 0x12161a,
  cyan: 0x22d9ff,
  cyanGlass: 0x88edff,
  magenta: 0xff43c9,
  yellow: 0xf0c84a,
  red: 0xe84f55,
};

function material(name, color, options = {}) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    emissive: options.emissive ? color : 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    roughness: 0.85,
    metalness: options.metalness ?? 0.04,
    transparent: options.opacity !== undefined,
    opacity: options.opacity ?? 1,
    flatShading: true,
  });
}

const m = {
  graphite: material('graphite', colors.graphite),
  darkMetal: material('dark_metal', colors.darkMetal),
  midMetal: material('mid_metal', colors.midMetal),
  black: material('black_cable', colors.black),
  yellow: material('yellow_panel', colors.yellow),
  red: material('red_indicator', colors.red, { emissive: true, emissiveIntensity: 0.35 }),
  cyan: material('cyan_neon', colors.cyan, { emissive: true, emissiveIntensity: 0.85 }),
  magenta: material('magenta_neon', colors.magenta, { emissive: true, emissiveIntensity: 0.85 }),
  cyanGlass: material('cyan_glass', colors.cyanGlass, {
    emissive: true,
    emissiveIntensity: 0.4,
    opacity: 0.58,
  }),
};

function voxel(group, name, x, y, z, w, h, d, mat) {
  const geometry = new THREE.BoxGeometry(w * voxelSize, h * voxelSize, d * voxelSize);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set((x + w / 2) * voxelSize, (y + h / 2) * voxelSize, (z + d / 2) * voxelSize);
  group.add(mesh);
  return mesh;
}

function voxels(group, prefix, blocks, mat) {
  blocks.forEach((block, index) => voxel(group, `${prefix}_${index + 1}`, ...block, mat));
}

function prepare(group, name) {
  group.name = name;
  group.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.updateWorldMatrix(true, true);
  const grounded = new THREE.Box3().setFromObject(group);
  group.position.y -= grounded.min.y;
  group.updateWorldMatrix(true, true);
  return group;
}

function vendingMachine() {
  const g = new THREE.Group();
  voxel(g, 'body', -3, 0, -2, 6, 12, 4, m.graphite);
  voxel(g, 'front_panel', -2, 2, 1.9, 4, 8, 1, m.darkMetal);
  voxel(g, 'cyan_display', -2, 6, 2.5, 3, 4, 1, m.cyan);
  voxel(g, 'magenta_strip', 2, 2, 2.5, 1, 8, 1, m.magenta);
  voxel(g, 'dispense_slot', -2, 2, 2.55, 3, 1, 1, m.midMetal);
  voxel(g, 'base', -4, 0, -3, 8, 1, 6, m.darkMetal);
  voxels(g, 'side_guard', [[-4, 0, -2, 1, 12, 4], [3, 0, -2, 1, 12, 4]], m.darkMetal);
  return prepare(g, 'voxel_vending_machine');
}

function holoTerminal() {
  const g = new THREE.Group();
  voxel(g, 'base', -3, 0, -2, 6, 2, 4, m.darkMetal);
  voxel(g, 'neck', -1, 2, -1, 2, 4, 2, m.graphite);
  voxel(g, 'screen_frame', -4, 6, -1, 8, 4, 1, m.darkMetal);
  voxel(g, 'screen', -3, 7, -0.35, 6, 2, 1, m.cyanGlass);
  voxels(
    g,
    'button',
    [
      [-3, 3, 2, 1, 1, 1],
      [-1, 3, 2, 1, 1, 1],
      [1, 3, 2, 1, 1, 1],
      [3, 3, 2, 1, 1, 1],
    ],
    m.cyan,
  );
  voxel(g, 'magenta_button', 0, 3, 2, 1, 1, 1, m.magenta);
  return prepare(g, 'voxel_holo_terminal');
}

function streetLamp() {
  const g = new THREE.Group();
  voxel(g, 'base', -2, 0, -2, 4, 1, 4, m.darkMetal);
  voxel(g, 'pole_lower', -1, 1, -1, 2, 8, 2, m.graphite);
  voxel(g, 'pole_upper', 0, 9, -1, 2, 2, 2, m.graphite);
  voxel(g, 'arm', 1, 10, -1, 5, 1, 2, m.graphite);
  voxel(g, 'cyan_light', 3, 9, -1, 5, 1, 2, m.cyan);
  voxel(g, 'magenta_tip', 7, 9, -1, 1, 1, 2, m.magenta);
  return prepare(g, 'voxel_street_lamp');
}

function powerGenerator() {
  const g = new THREE.Group();
  voxel(g, 'body', -4, 0, -3, 8, 5, 6, m.darkMetal);
  voxel(g, 'top', -3, 5, -2, 6, 1, 4, m.graphite);
  voxels(
    g,
    'vent',
    [
      [-3, 2, 3, 1, 2, 1],
      [-1, 2, 3, 1, 2, 1],
      [1, 2, 3, 1, 2, 1],
      [3, 2, 3, 1, 2, 1],
    ],
    m.midMetal,
  );
  voxel(g, 'yellow_panel', -4, 1, 3.5, 2, 2, 1, m.yellow);
  voxel(g, 'cyan_indicator', 2, 3, 3.5, 1, 1, 1, m.cyan);
  voxels(g, 'cable', [[4, 1, -1, 2, 1, 1], [5, 1, 0, 1, 1, 3], [4, 1, 2, 2, 1, 1]], m.black);
  return prepare(g, 'voxel_power_generator');
}

function cableSpool() {
  const g = new THREE.Group();
  voxels(
    g,
    'left_reel',
    [
      [-4, 1, -2, 1, 4, 4],
      [-5, 2, -1, 1, 2, 2],
    ],
    m.midMetal,
  );
  voxels(
    g,
    'right_reel',
    [
      [3, 1, -2, 1, 4, 4],
      [4, 2, -1, 1, 2, 2],
    ],
    m.midMetal,
  );
  voxel(g, 'core', -3, 2, -1, 6, 2, 2, m.darkMetal);
  voxels(
    g,
    'wrapped_cable',
    [
      [-3, 1, -2, 6, 1, 1],
      [-3, 4, -2, 6, 1, 1],
      [-3, 1, 1, 6, 1, 1],
      [-3, 4, 1, 6, 1, 1],
      [-3, 2, -2, 6, 2, 1],
    ],
    m.black,
  );
  voxel(g, 'cyan_connector', 4, 1, 2, 2, 1, 1, m.cyan);
  return prepare(g, 'voxel_cable_spool');
}

function neonBarrier() {
  const g = new THREE.Group();
  voxels(g, 'feet', [[-5, 0, -2, 3, 1, 4], [2, 0, -2, 3, 1, 4]], m.darkMetal);
  voxels(g, 'posts', [[-4, 1, -1, 2, 5, 2], [3, 1, -1, 2, 5, 2]], m.graphite);
  voxel(g, 'magenta_rail', -3, 4, -1, 6, 1, 2, m.magenta);
  voxel(g, 'cyan_rail', -3, 2, -1, 6, 1, 2, m.cyan);
  return prepare(g, 'voxel_neon_barrier');
}

function rooftopAc() {
  const g = new THREE.Group();
  voxel(g, 'body', -4, 0, -3, 8, 5, 6, m.midMetal);
  voxel(g, 'front_dark', -3, 1, 3, 6, 3, 1, m.darkMetal);
  voxels(
    g,
    'vents',
    [
      [-3, 2, 3.5, 1, 2, 1],
      [-1, 2, 3.5, 1, 2, 1],
      [1, 2, 3.5, 1, 2, 1],
      [3, 2, 3.5, 1, 2, 1],
    ],
    m.graphite,
  );
  voxels(g, 'fan_cross', [[1, 5, -1, 4, 1, 1], [2, 5, -2, 1, 1, 4]], m.graphite);
  voxel(g, 'cyan_light', -4, 4, 3.5, 1, 1, 1, m.cyan);
  return prepare(g, 'voxel_rooftop_ac');
}

function dataCrate() {
  const g = new THREE.Group();
  voxel(g, 'body', -4, 0, -3, 8, 5, 6, m.graphite);
  voxel(g, 'front_panel', -3, 1, 3, 6, 3, 1, m.darkMetal);
  voxel(g, 'cyan_horizontal_seam', -4, 3, 3.6, 8, 1, 1, m.cyan);
  voxel(g, 'cyan_vertical_seam', 1, 1, 3.7, 1, 3, 1, m.cyan);
  voxels(
    g,
    'corner_guard',
    [
      [-5, 0, -4, 1, 6, 1],
      [4, 0, -4, 1, 6, 1],
      [-5, 0, 3, 1, 6, 1],
      [4, 0, 3, 1, 6, 1],
    ],
    m.midMetal,
  );
  return prepare(g, 'voxel_data_crate');
}

function neonBarrel() {
  const g = new THREE.Group();
  voxels(
    g,
    'body_layers',
    [
      [-2, 0, -2, 4, 1, 4],
      [-3, 1, -2, 6, 3, 4],
      [-2, 4, -2, 4, 1, 4],
    ],
    m.darkMetal,
  );
  voxel(g, 'cyan_band', -3, 1, -3, 6, 1, 1, m.cyan);
  voxel(g, 'cyan_band_back', -3, 1, 2, 6, 1, 1, m.cyan);
  voxel(g, 'magenta_band', -3, 3, -3, 6, 1, 1, m.magenta);
  voxel(g, 'magenta_band_back', -3, 3, 2, 6, 1, 1, m.magenta);
  return prepare(g, 'voxel_neon_barrel');
}

function holoSign() {
  const g = new THREE.Group();
  voxel(g, 'base', -2, 0, -2, 4, 1, 4, m.darkMetal);
  voxel(g, 'pole', -1, 1, -1, 2, 6, 2, m.graphite);
  voxel(g, 'holo_panel', -5, 7, -0.5, 10, 4, 1, m.cyanGlass);
  voxel(g, 'top_edge', -5, 11, -1, 10, 1, 2, m.cyan);
  voxel(g, 'bottom_edge', -5, 6, -1, 10, 1, 2, m.magenta);
  return prepare(g, 'voxel_holo_sign');
}

function foodCart() {
  const g = new THREE.Group();
  voxel(g, 'cart_body', -4, 1, -2, 8, 4, 4, m.darkMetal);
  voxel(g, 'counter', -5, 5, -3, 10, 1, 6, m.midMetal);
  voxel(g, 'canopy', -5, 9, -3, 10, 1, 6, m.magenta);
  voxels(g, 'posts', [[-4, 5, -2, 1, 4, 1], [3, 5, -2, 1, 4, 1]], m.graphite);
  voxels(g, 'wheels', [[-4, 0, 2, 2, 2, 1], [2, 0, 2, 2, 2, 1]], m.black);
  voxel(g, 'cyan_trim', -5, 4, 2.5, 10, 1, 1, m.cyan);
  return prepare(g, 'voxel_food_cart');
}

function chargingPad() {
  const g = new THREE.Group();
  voxels(
    g,
    'base',
    [
      [-3, 0, -4, 6, 1, 8],
      [-4, 0, -3, 8, 1, 6],
      [-2, 1, -2, 4, 1, 4],
    ],
    m.darkMetal,
  );
  voxel(g, 'cyan_center', -2, 2, -2, 4, 1, 4, m.cyan);
  voxels(
    g,
    'magenta_panels',
    [
      [-5, 1, -1, 2, 1, 2],
      [3, 1, -1, 2, 1, 2],
      [-1, 1, -5, 2, 1, 2],
      [-1, 1, 3, 2, 1, 2],
    ],
    m.magenta,
  );
  return prepare(g, 'voxel_charging_pad');
}

const builders = {
  voxel_vending_machine: vendingMachine,
  voxel_holo_terminal: holoTerminal,
  voxel_street_lamp: streetLamp,
  voxel_power_generator: powerGenerator,
  voxel_cable_spool: cableSpool,
  voxel_neon_barrier: neonBarrier,
  voxel_rooftop_ac: rooftopAc,
  voxel_data_crate: dataCrate,
  voxel_neon_barrel: neonBarrel,
  voxel_holo_sign: holoSign,
  voxel_food_cart: foodCart,
  voxel_charging_pad: chargingPad,
};

async function exportGlb(asset, filename) {
  const exporter = new GLTFExporter();
  const scene = new THREE.Scene();
  scene.name = `${filename}_scene`;
  scene.add(asset.clone(true));
  scene.updateWorldMatrix(true, true);
  const result = await new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, {
      binary: true,
      trs: false,
      onlyVisible: true,
      includeCustomExtensions: false,
    });
  });

  if (!(result instanceof ArrayBuffer)) {
    throw new Error(`Expected ArrayBuffer from GLTFExporter for ${filename}`);
  }

  await writeFile(path.join(glbDir, `${filename}.glb`), Buffer.from(result));
}

async function exportObj(asset, filename) {
  const exporter = new OBJExporter();
  await writeFile(path.join(objDir, `${filename}.obj`), exporter.parse(asset.clone(true)), 'utf8');
}

async function writeReadme(manifest) {
  const lines = [
    '# Cyberpunk Voxel Props',
    '',
    'A 3D voxel-art cyberpunk prop pack for Ascoor direction testing.',
    '',
    'These prototype assets were generated procedurally with Three.js from cubic blocks.',
    'Use them to compare whether voxel-style constraints feel stronger than low-poly constraints.',
    '',
    '## Contents',
    '',
    '- `glb/`: Binary glTF files',
    '- `obj/`: OBJ files',
    '- `manifest.json`: Asset names, source, and prompts',
    '',
    '## Public copy note',
    '',
    'Do not claim "Made with Ascoor" unless the specific model was actually generated by Ascoor.',
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
      source: 'threejs_voxel_procedural',
      prompt,
      glb: `glb/${name}.glb`,
      obj: `obj/${name}.obj`,
    });
    console.log(`generated ${name}`);
  }

  await writeFile(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  await writeReadme(manifest);
  console.log(`\nWrote ${manifest.length} voxel assets to ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
