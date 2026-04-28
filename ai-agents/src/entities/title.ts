import { z } from 'zod';

// Domain entity for asset pack title request/response
export const assetPackTitleInSchema = z.object({
  prompt: z.string().min(1),
  userId: z.string().nullish(),
  packGenerationJobId: z.string().nullish(),
  traceId: z.string().nullish(),
  requestId: z.string().nullish(),
});

export type AssetPackTitleIn = z.infer<typeof assetPackTitleInSchema>;

export type AssetPackTitleOut = {
  title: string;
};
