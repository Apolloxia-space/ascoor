const runtimeRules = [
  'Return executable JavaScript only.',
  'Use `THREE` globals and do not include import statements.',
  'Do not include markdown fences or explanations.',
  'Assign the final model to `result` at module scope.',
] as const;

const structureRules = [
  'Build `result` as a top-level `THREE.Group`.',
  'Keep each logical part as its own named `Group` or `Mesh` under `result`.',
  'Use stable part names such as `head`, `body`, `arm_l`, `arm_r`, `leg_l`, `leg_r`, `wing_l`, `wing_r`, or similarly clear role-based names.',
  'Preserve a readable object hierarchy instead of collapsing the model into a single unnamed mesh.',
  "Prefer local pivots that stay near each part's geometric center so downstream transforms remain usable.",
] as const;

const axisRule = 'Use axis contract: X=front/back, Y=left/right, Z=up/down (global Z up).';
const axisComment = '// AXIS CONTRACT: X=front/back, Y=left/right, Z=up/down';

function joinInstructionSentences(lines: ReadonlyArray<string>): string {
  return lines.map((line) => line.trim()).join(' ');
}

export const threeJsRuntimeRules = [...runtimeRules];
export const threeJsStructureRules = [...structureRules];
export const threeJsPromptRules = [...runtimeRules, ...structureRules, axisRule];

export const threeJsDesignSystemInstruction = joinInstructionSentences([
  ...runtimeRules,
  ...structureRules,
  axisRule,
  `Add this exact top comment in output: ${axisComment}.`,
]);

export function buildThreeJsCompiledPrompt(userPrompt: string): string {
  const rules = [...threeJsPromptRules, `Add this top comment in output:\n  ${axisComment}`];

  return `You are generating three.js model code.

Task:
- Create a parametric 3D model in three.js.

Rules:
${rules.map((rule) => `- ${rule}`).join('\n')}

User request:
${userPrompt.trim()}
`;
}
