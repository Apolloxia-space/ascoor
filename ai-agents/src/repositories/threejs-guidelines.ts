const runtimeRules = [
  'Return executable JavaScript only.',
  'Use `THREE` globals and do not include import statements.',
  'Do not include markdown fences or explanations.',
  'Assign the final model to `result` at module scope.',
] as const;

const appContextRules = [
  'You are generating three.js model code for Ascoor, a 3D design studio.',
  'The output is executed inside Ascoor and then inspected and edited through a structure tree and transform controls.',
  'Keep the output compatible with that edit flow.',
] as const;

const structureRules = [
  'Build `result` as a top-level `THREE.Group`.',
  'First, make the model clearly recognizable as the user-requested object through overall silhouette, proportions, and major features.',
  'Keep a shallow, editable hierarchy.',
  'Split only major editable or functional parts into named `Group` or `Mesh` nodes under `result`.',
  'Choose part names that match the object domain.',
  'Collapse minor static details into their parent part when reasonable.',
  'Prefer local pivots for major editable parts so downstream transforms remain usable.',
  'Avoid unnecessary decorative subparts unless they are important for recognizability.',
  'If recognizability and fine-grained structure conflict, prefer recognizability with fewer, larger parts.',
] as const;

const axisRule = 'Use axis contract: X=front/back, Y=left/right, Z=up/down (global Z up).';
const axisComment = '// AXIS CONTRACT: X=front/back, Y=left/right, Z=up/down';

function joinInstructionSentences(lines: ReadonlyArray<string>): string {
  return lines.map((line) => line.trim()).join(' ');
}

export const threeJsRuntimeRules = [...runtimeRules];
export const threeJsStructureRules = [...structureRules];
export const threeJsPromptRules = [...structureRules];

export const threeJsDesignSystemInstruction = joinInstructionSentences([
  ...appContextRules,
  ...runtimeRules,
  axisRule,
  `Add this exact top comment in output: ${axisComment}.`,
]);

export function buildThreeJsCompiledPrompt(userPrompt: string): string {
  const rules = [...threeJsPromptRules];

  return `You are generating three.js model code.

Task:
- Create a simple 3D model in three.js that is clearly recognizable as the requested object.

Rules:
${rules.map((rule) => `- ${rule}`).join('\n')}

User request:
${userPrompt.trim()}
`;
}
