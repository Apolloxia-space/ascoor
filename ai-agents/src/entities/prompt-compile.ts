import { z } from 'zod';

// Domain entity for prompt compile request/response
export const compilePromptInSchema = z.object({
  userPrompt: z.string().min(1),
  userId: z.string().nullish(),
  designId: z.string().nullish(),
  traceId: z.string().nullish(),
  requestId: z.string().nullish(),
});

export type CompilePromptIn = z.infer<typeof compilePromptInSchema>;

export type CompilePromptOut = {
  compiledPrompt: string;
};
