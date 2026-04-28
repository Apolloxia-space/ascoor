import { z } from 'zod';

export const assetPackPlanPartSchema = z.object({
  slug: z.string().min(1).max(80),
  displayName: z.string().min(1).max(80),
  description: z.string().min(1).max(400),
  prompt: z.string().min(1).max(2000),
});

export const assetPackPlanSchema = z.object({
  title: z.string().min(1).max(60),
  message: z.string().min(1).max(300),
  parts: z.array(assetPackPlanPartSchema).min(3).max(8),
});

export const assetPackPlanInSchema = z.object({
  prompt: z.string().min(1),
  userPrompt: z.string().min(1).nullish(),
  userId: z.string().nullish(),
  packGenerationJobId: z.string().nullish(),
  traceId: z.string().nullish(),
  requestId: z.string().nullish(),
});

export type AssetPackPlan = z.infer<typeof assetPackPlanSchema>;
export type AssetPackPlanIn = z.infer<typeof assetPackPlanInSchema>;
