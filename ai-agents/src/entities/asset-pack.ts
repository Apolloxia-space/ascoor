import { z } from 'zod';

// Domain entity for asset pack request/response
export const assetPackInSchema = z.object({
  prompt: z.string().min(1),
  userPrompt: z.string().min(1).nullish(),
  userId: z.string().nullish(),
  packGenerationJobId: z.string().nullish(),
  traceId: z.string().nullish(),
  requestId: z.string().nullish(),
  skipTitle: z.boolean().optional(),
});

export type AssetPackIn = z.infer<typeof assetPackInSchema>;

export type AssetPackOut = {
  message: string;
  title: string;
  code: string;
};
