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
const outputRoot = path.join(repoRoot, 'context/marketing/cyberpunk-low-poly-props');
const glbDir = path.join(outputRoot, 'glb');
const objDir = path.join(outputRoot, 'obj');

const assetStyle =
  'Charming retro low-poly 3D cyberpunk game prop, PS1-era indie game style, chunky primitive-friendly geometry, flat colors, neon accent colors, no realistic details, no readable text, no logos, no characters, no animation, single centered object, game-ready GLB, low polygon count.';

const prompts = {
  neon_vending_machine:
    'A chunky low-poly cyberpunk vending machine with blank glowing panels, dark metal body, cyan and magenta neon accents, no readable text.',
  holo_terminal:
    'A small low-poly street terminal with a tilted screen, dark base, cyan hologram panel, chunky buttons without labels.',
  neon_street_lamp:
    'A slim but chunky low-poly cyberpunk street lamp with a bent pole, glowing cyan light bar, dark metal base.',
  power_generator:
    'A compact low-poly power generator box with vents, cables, yellow hazard panels without symbols, and small neon lights.',
  cable_spool:
    'A low-poly cable spool with thick black cables wrapped around a metal reel, small cyan connector lights.',
  neon_barrier:
    'A short cyberpunk street barrier with chunky posts, glowing magenta rail, dark metal feet, no writing.',
  rooftop_ac_unit:
    'A low-poly rooftop air conditioner unit with vents, dark gray metal casing, small cyan indicator lights.',
  data_crate:
    'A reinforced cyberpunk data crate with dark panels, glowing cyan seams, chunky corner guards, no logos.',
  neon_barrel:
    'A squat cyberpunk metal barrel with glowing magenta bands, dark gray body, simple low-poly shape.',
  holo_sign_blank:
    'A small blank hologram signpost with a transparent cyan rectangular panel, dark pole, no text or symbols.',
  street_food_cart:
    'A tiny cyberpunk street food cart with a dark counter, small canopy, neon trim, no readable signs.',
  drone_charging_pad:
    'A small low-poly drone charging pad with a hexagonal base, glowing cyan center, dark metal panels.',
};

const palette = {
  graphite: 0x24282d,
  darkMetal: 0x363b42,
  midMetal: 0x5a626c,
  blackCable: 0x15181c,
  cyan: 0x21d7ff,
  cyanSoft: 0x83ecff,
  magenta: 0xff3fc9,
  yellow: 0xf0c64b,
  red: 0xe54f4f,
  glass: 0x9eefff,
};

const materials = {
  graphite: mat('graphite', palette.graphite),
  darkMetal: mat('dark_metal', palette.darkMetal),
  midMetal: mat('mid_metal', palette.midMetal),
  blackCable: mat('black_cable', palette.blackCable),
  yellow: mat('hazard_yellow', palette.yellow),
  red: mat('warning_red', palette.red),
  cyan: glowMat('cyan_neon', palette.cyan, 0.9),
  cyanSoft: glowMat('soft_cyan_neon', palette.cyanSoft, 0.55),
  magenta: glowMat('magenta_neon', palette.magenta, 0.85),
  glass: glassMat('cyan_glass', palette.glass),
};

function mat(name, color) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    roughness: 0.82,
    metalness: 0.08,
    flatShading: true,
  });
}

function glowMat(name, color, intensity) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.45,
    metalness: 0,
    flatShading: true,
  });
}

function glassMat(name, color) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    emissive: color,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.52,
    roughness: 0.2,
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
  return addMesh(group, name, new THREE.DodecahedronGeometry(radius, 0), material, position, rotation, scale);
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
  const result = exporter.parse(asset.clone(true));
  await writeFile(path.join(objDir, `${filename}.obj`), result, 'utf8');
}

function neonVendingMachine() {
  const g = new THREE.Group();
  box(g, 'main_body', [1.05, 2.0, 0.55], [0, 1.0, 0], materials.graphite);
  box(g, 'front_panel', [0.82, 1.45, 0.06], [0, 1.12, 0.31], materials.darkMetal);
  box(g, 'glowing_display', [0.62, 0.72, 0.08], [-0.05, 1.42, 0.36], materials.cyan);
  box(g, 'magenta_panel', [0.24, 1.55, 0.08], [0.46, 1.03, 0.36], materials.magenta);
  box(g, 'coin_slot_blank', [0.28, 0.1, 0.08], [0.32, 0.78, 0.37], materials.midMetal);
  box(g, 'bottom_tray', [0.62, 0.18, 0.1], [-0.08, 0.28, 0.37], materials.midMetal);
  for (const x of [-0.42, 0.42]) {
    box(g, `side_guard_${x}`, [0.09, 2.12, 0.66], [x, 1.04, 0], materials.darkMetal);
  }
  return prepareAsset(g, 'neon_vending_machine');
}

function holoTerminal() {
  const g = new THREE.Group();
  box(g, 'base', [0.95, 0.28, 0.75], [0, 0.14, 0], materials.darkMetal);
  box(g, 'neck', [0.24, 0.62, 0.24], [0, 0.58, 0], materials.graphite, [0.12, 0, 0]);
  box(g, 'screen_frame', [1.05, 0.72, 0.12], [0, 1.02, -0.08], materials.darkMetal, [-0.18, 0, 0]);
  box(g, 'holo_screen', [0.82, 0.5, 0.06], [0, 1.04, -0.01], materials.cyanSoft, [-0.18, 0, 0]);
  for (let i = 0; i < 4; i += 1) {
    box(g, `button_${i + 1}`, [0.14, 0.06, 0.08], [-0.3 + i * 0.2, 0.42, 0.38], i % 2 ? materials.magenta : materials.cyan);
  }
  return prepareAsset(g, 'holo_terminal');
}

function neonStreetLamp() {
  const g = new THREE.Group();
  cylinder(g, 'base', 0.28, 0.34, 0.18, [0, 0.09, 0], materials.darkMetal, [0, 0, 0], 8);
  cylinder(g, 'pole_lower', 0.07, 0.09, 1.2, [0, 0.75, 0], materials.graphite, [0, 0, 0], 7);
  box(g, 'angled_arm', [0.85, 0.09, 0.09], [0.38, 1.42, 0], materials.graphite, [0, 0, -0.35]);
  box(g, 'cyan_light_bar', [0.72, 0.12, 0.16], [0.75, 1.26, 0], materials.cyan, [0, 0, -0.35]);
  box(g, 'magenta_backlight', [0.52, 0.05, 0.18], [0.72, 1.18, -0.03], materials.magenta, [0, 0, -0.35]);
  return prepareAsset(g, 'neon_street_lamp');
}

function powerGenerator() {
  const g = new THREE.Group();
  box(g, 'generator_body', [1.35, 0.85, 0.82], [0, 0.43, 0], materials.darkMetal);
  box(g, 'top_panel', [1.18, 0.12, 0.72], [0, 0.91, 0], materials.graphite);
  for (let i = 0; i < 4; i += 1) {
    box(g, `vent_${i + 1}`, [0.08, 0.42, 0.05], [-0.38 + i * 0.25, 0.5, 0.44], materials.midMetal);
  }
  box(g, 'yellow_panel_left', [0.28, 0.34, 0.06], [-0.5, 0.46, 0.46], materials.yellow);
  box(g, 'cyan_indicator', [0.18, 0.1, 0.07], [0.49, 0.68, 0.47], materials.cyan);
  cylinder(g, 'side_cable_port', 0.13, 0.13, 0.08, [0.72, 0.38, 0], materials.magenta, [0, 0, Math.PI / 2], 8);
  addMesh(g, 'loose_cable', new THREE.TorusGeometry(0.34, 0.035, 6, 16, Math.PI * 1.35), materials.blackCable, [0.87, 0.24, 0.05], [Math.PI / 2, 0, -0.4]);
  return prepareAsset(g, 'power_generator');
}

function cableSpool() {
  const g = new THREE.Group();
  cylinder(g, 'left_reel', 0.42, 0.42, 0.12, [-0.42, 0.52, 0], materials.midMetal, [0, 0, Math.PI / 2], 10);
  cylinder(g, 'right_reel', 0.42, 0.42, 0.12, [0.42, 0.52, 0], materials.midMetal, [0, 0, Math.PI / 2], 10);
  cylinder(g, 'core', 0.24, 0.24, 0.78, [0, 0.52, 0], materials.darkMetal, [0, 0, Math.PI / 2], 8);
  addMesh(g, 'wrapped_cable_a', new THREE.TorusGeometry(0.28, 0.045, 6, 18), materials.blackCable, [0, 0.52, 0], [0, Math.PI / 2, 0]);
  addMesh(g, 'wrapped_cable_b', new THREE.TorusGeometry(0.34, 0.045, 6, 18), materials.blackCable, [0, 0.52, 0], [0, Math.PI / 2, 0]);
  box(g, 'cyan_connector', [0.18, 0.12, 0.16], [0.62, 0.3, 0.18], materials.cyan);
  return prepareAsset(g, 'cable_spool');
}

function neonBarrier() {
  const g = new THREE.Group();
  for (const x of [-0.75, 0.75]) {
    box(g, `post_${x}`, [0.18, 0.82, 0.18], [x, 0.41, 0], materials.graphite);
    box(g, `foot_${x}`, [0.45, 0.12, 0.45], [x, 0.06, 0], materials.darkMetal);
  }
  box(g, 'magenta_rail_top', [1.7, 0.14, 0.12], [0, 0.66, 0], materials.magenta);
  box(g, 'cyan_rail_bottom', [1.55, 0.12, 0.1], [0, 0.34, 0], materials.cyan);
  return prepareAsset(g, 'neon_barrier');
}

function rooftopAcUnit() {
  const g = new THREE.Group();
  box(g, 'ac_body', [1.35, 0.72, 0.92], [0, 0.36, 0], materials.midMetal);
  box(g, 'dark_front', [1.12, 0.46, 0.06], [0, 0.42, 0.49], materials.darkMetal);
  for (let i = 0; i < 5; i += 1) {
    box(g, `vent_slat_${i + 1}`, [0.08, 0.38, 0.08], [-0.42 + i * 0.21, 0.42, 0.54], materials.graphite);
  }
  cylinder(g, 'fan_ring', 0.28, 0.28, 0.07, [0.38, 0.78, -0.12], materials.graphite, [Math.PI / 2, 0, 0], 10);
  box(g, 'cyan_indicator', [0.18, 0.08, 0.08], [-0.52, 0.66, 0.54], materials.cyan);
  return prepareAsset(g, 'rooftop_ac_unit');
}

function dataCrate() {
  const g = new THREE.Group();
  box(g, 'crate_body', [1.3, 0.88, 0.95], [0, 0.44, 0], materials.graphite);
  box(g, 'front_panel', [1.02, 0.56, 0.07], [0, 0.48, 0.52], materials.darkMetal);
  box(g, 'cyan_seam_h', [1.15, 0.06, 0.08], [0, 0.73, 0.56], materials.cyan);
  box(g, 'cyan_seam_v', [0.06, 0.56, 0.08], [0.42, 0.48, 0.56], materials.cyan);
  for (const x of [-0.58, 0.58]) {
    for (const z of [-0.42, 0.42]) {
      box(g, `corner_guard_${x}_${z}`, [0.16, 0.98, 0.16], [x, 0.49, z], materials.midMetal);
    }
  }
  return prepareAsset(g, 'data_crate');
}

function neonBarrel() {
  const g = new THREE.Group();
  cylinder(g, 'barrel_body', 0.46, 0.5, 1.1, [0, 0.55, 0], materials.darkMetal, [0, 0, 0], 10);
  cylinder(g, 'top_cap', 0.46, 0.46, 0.08, [0, 1.13, 0], materials.midMetal, [0, 0, 0], 10);
  cylinder(g, 'bottom_cap', 0.48, 0.48, 0.08, [0, -0.03, 0], materials.graphite, [0, 0, 0], 10);
  cylinder(g, 'magenta_band_top', 0.51, 0.51, 0.1, [0, 0.87, 0], materials.magenta, [0, 0, 0], 10);
  cylinder(g, 'cyan_band_bottom', 0.52, 0.52, 0.1, [0, 0.28, 0], materials.cyan, [0, 0, 0], 10);
  return prepareAsset(g, 'neon_barrel');
}

function holoSignBlank() {
  const g = new THREE.Group();
  box(g, 'base', [0.52, 0.16, 0.52], [0, 0.08, 0], materials.darkMetal);
  cylinder(g, 'pole', 0.06, 0.08, 1.05, [0, 0.65, 0], materials.graphite, [0, 0, 0], 7);
  box(g, 'blank_holo_panel', [1.15, 0.58, 0.05], [0, 1.25, 0], materials.glass);
  box(g, 'panel_top_edge', [1.22, 0.06, 0.08], [0, 1.57, 0], materials.cyan);
  box(g, 'panel_bottom_edge', [1.22, 0.06, 0.08], [0, 0.93, 0], materials.magenta);
  return prepareAsset(g, 'holo_sign_blank');
}

function streetFoodCart() {
  const g = new THREE.Group();
  box(g, 'cart_body', [1.25, 0.62, 0.75], [0, 0.42, 0], materials.darkMetal);
  box(g, 'counter', [1.42, 0.12, 0.86], [0, 0.78, 0], materials.midMetal);
  box(g, 'canopy', [1.55, 0.16, 0.95], [0, 1.42, 0], materials.magenta);
  for (const x of [-0.55, 0.55]) {
    box(g, `canopy_post_${x}`, [0.07, 0.72, 0.07], [x, 1.08, -0.28], materials.graphite);
    cylinder(g, `wheel_${x}`, 0.15, 0.15, 0.08, [x, 0.13, 0.42], materials.blackCable, [Math.PI / 2, 0, 0], 8);
  }
  box(g, 'cyan_trim', [1.36, 0.06, 0.08], [0, 0.63, 0.42], materials.cyan);
  return prepareAsset(g, 'street_food_cart');
}

function droneChargingPad() {
  const g = new THREE.Group();
  cylinder(g, 'hex_base', 0.78, 0.86, 0.16, [0, 0.08, 0], materials.darkMetal, [0, Math.PI / 6, 0], 6);
  cylinder(g, 'cyan_center', 0.36, 0.36, 0.06, [0, 0.2, 0], materials.cyan, [0, Math.PI / 6, 0], 6);
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6;
    box(
      g,
      `panel_${i + 1}`,
      [0.34, 0.04, 0.08],
      [Math.cos(angle) * 0.54, 0.24, Math.sin(angle) * 0.54],
      i % 2 ? materials.magenta : materials.midMetal,
      [0, -angle, 0],
    );
  }
  return prepareAsset(g, 'drone_charging_pad');
}

const builders = {
  neon_vending_machine: neonVendingMachine,
  holo_terminal: holoTerminal,
  neon_street_lamp: neonStreetLamp,
  power_generator: powerGenerator,
  cable_spool: cableSpool,
  neon_barrier: neonBarrier,
  rooftop_ac_unit: rooftopAcUnit,
  data_crate: dataCrate,
  neon_barrel: neonBarrel,
  holo_sign_blank: holoSignBlank,
  street_food_cart: streetFoodCart,
  drone_charging_pad: droneChargingPad,
};

async function writeReadme(manifest) {
  const lines = [
    '# Cyberpunk Low Poly Props',
    '',
    'A small cyberpunk-flavored retro low-poly prop pack for Ascoor direction testing.',
    '',
    'These prototype assets were generated procedurally with Three.js, not with the current Ascoor model-generation flow.',
    'Use them for visual direction testing and prompt comparison.',
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
