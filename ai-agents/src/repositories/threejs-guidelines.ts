const runtimeRules = [
  'Return executable JavaScript only.',
  'THREE core API only.',
  'Use `THREE` globals and do not include import statements.',
  'Do not include markdown fences or explanations.',
  'Assign the final model to `result` at module scope.',
  'Give every major `Group` or `Mesh` a short descriptive `name` based on its role.',
] as const;

function joinInstructionSentences(lines: ReadonlyArray<string>): string {
  return lines.map((line) => line.trim()).join(' ');
}

export const threeJsRuntimeRules = [...runtimeRules];
export const threeJsStructureRules: Array<string> = [];
export const threeJsPromptRules: Array<string> = [];

export const threeJsAssetPackSystemInstruction = joinInstructionSentences(runtimeRules);

export function buildThreeJsCompiledPrompt(userPrompt: string): string {
  return `Write three.js code that creates the object requested below.

User request:
${userPrompt.trim()}
`;
}
