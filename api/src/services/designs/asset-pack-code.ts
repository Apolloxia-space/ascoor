import type { AssetPackPlan } from '../../repositories/ai/asset-pack-plan.repository';

export type GeneratedAssetPart = {
  slug: string;
  displayName: string;
  description: string;
  prompt: string;
  code: string;
  assetUriTs?: string | null;
};

const DECLARED_IDENTIFIER_PATTERN =
  /\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
const ASSIGNED_IDENTIFIER_PATTERN = /(^|[^\w$.])([A-Za-z_$][\w$]*)\s*=(?!=)/g;
const ACCENT_IDENTIFIER_PATTERN = /\baccent[A-Z][\w$]*/g;
const RESERVED_ASSIGNED_IDENTIFIERS = new Set(['result', 'globalThis', 'console', 'THREE']);

const getFallbackAccentColor = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('cyan')) return '0x39d7e8';
  if (lowerName.includes('yellow')) return '0xf0c84b';
  if (lowerName.includes('pink') || lowerName.includes('magenta')) return '0xff4fa3';
  if (lowerName.includes('green')) return '0x6ee07a';
  if (lowerName.includes('blue')) return '0x4f8cff';
  if (lowerName.includes('red')) return '0xd94b4b';
  if (lowerName.includes('orange')) return '0xff8a3d';
  if (lowerName.includes('purple') || lowerName.includes('violet')) return '0x9b5cff';
  return '0xffffff';
};

const addImplicitDeclarations = (code: string) => {
  const declared = new Set<string>();
  for (const match of code.matchAll(DECLARED_IDENTIFIER_PATTERN)) {
    const name = match[1];
    if (name) declared.add(name);
  }

  const implicit = new Set<string>();
  for (const match of code.matchAll(ASSIGNED_IDENTIFIER_PATTERN)) {
    const name = match[2];
    if (!name) continue;
    if (declared.has(name)) continue;
    if (RESERVED_ASSIGNED_IDENTIFIERS.has(name)) continue;
    implicit.add(name);
  }

  const fallbackAccents = new Set<string>();
  for (const match of code.matchAll(ACCENT_IDENTIFIER_PATTERN)) {
    const name = match[0];
    if (!name) continue;
    if (declared.has(name)) continue;
    if (implicit.has(name)) continue;
    fallbackAccents.add(name);
  }

  const declarations: Array<string> = [];
  if (implicit.size > 0) {
    declarations.push(`let ${[...implicit].join(', ')};`);
  }
  for (const name of fallbackAccents) {
    declarations.push(
      `const ${name} = new THREE.MeshStandardMaterial({ color: ${getFallbackAccentColor(name)}, roughness: 0.7, metalness: 0.05 });`,
    );
  }

  if (declarations.length === 0) return code;
  return `${declarations.join('\n')}\n${code}`;
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

  const normalized = withoutImports
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+(const|let|var|function|class)\s+/gm, '$1 ')
    .replace(/^\s*export\s*\{[^}]+\}\s*;?\s*$/gm, '')
    .replace(/^\s*(const|let|var)\s+result\s*=/gm, 'result =')
    .replace(/^\s*(const|let|var)\s+result\s*;?\s*$/gm, '');

  return addImplicitDeclarations(normalized);
};

const toVectorCode = (values: [number, number, number], fallback: [number, number, number]) =>
  values
    .map((value, index) => {
      if (!Number.isFinite(value)) return fallback[index];
      return Number(value.toFixed(4));
    })
    .join(', ');

const getPreviewLayoutForPart = (index: number) => {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return {
    position: [(column - 1.5) * 2.4, 0, row * 2.4] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number],
  };
};

export const buildPartPrompt = (params: {
  packTitle: string;
  originalPrompt: string;
  partPrompt: string;
}) => `Write executable Three.js code for one standalone reusable game asset part.

Pack: ${params.packTitle}
Original pack request: ${params.originalPrompt}

Part request:
${params.partPrompt}

Rules:
- Return JavaScript only.
- Use THREE globals only. Do not import.
- Assign the final part object to result.
- Generate only this part, not the full stage.
- The result must be a THREE.Group or THREE.Object3D with a short descriptive name.
- Keep the origin near the center/bottom of the prop so Ascoor can place it in a preview layout.
`;

export const composeAssetPackPreviewCode = (params: {
  plan: AssetPackPlan;
  parts: Array<GeneratedAssetPart>;
}) => {
  const lines: Array<string> = [
    'const pack = new THREE.Group();',
    `pack.name = ${JSON.stringify(params.plan.title)};`,
    'pack.userData.ascoorAssetPack = true;',
    '',
  ];

  params.parts.forEach((part, index) => {
    const layout = getPreviewLayoutForPart(index);
    const functionName = `create_${part.slug}`;
    const variableName = `part_${part.slug}`;

    lines.push(`function ${functionName}() {`);
    lines.push('  let result;');
    lines.push(sanitizeGeneratedCode(part.code).replace(/^/gm, '  '));
    lines.push('  return result;');
    lines.push('}');
    lines.push('');
    lines.push(`const ${variableName}Object = ${functionName}();`);
    lines.push(`const ${variableName} = new THREE.Group();`);
    lines.push(`${variableName}.name = ${JSON.stringify(part.slug)};`);
    lines.push(`${variableName}.userData.ascoorPartSlug = ${JSON.stringify(part.slug)};`);
    lines.push(`${variableName}.userData.ascoorPartName = ${JSON.stringify(part.displayName)};`);
    lines.push(`if (${variableName}Object) {`);
    lines.push(`  ${variableName}.add(${variableName}Object);`);
    lines.push('}');
    lines.push(`${variableName}.position.set(${toVectorCode(layout.position, [0, 0, 0])});`);
    lines.push(`${variableName}.rotation.set(${toVectorCode(layout.rotation, [0, 0, 0])});`);
    lines.push(`${variableName}.scale.set(${toVectorCode(layout.scale, [1, 1, 1])});`);
    lines.push(`pack.add(${variableName});`);
    lines.push('');
  });

  lines.push('result = pack;');
  return `${lines.join('\n')}\n`;
};
