import { z } from 'zod';

// Domain entity for title design request/response
export const designTitleInSchema = z.object({
  prompt: z.string().min(1),
  userId: z.string().nullish(),
  designId: z.string().nullish(),
  traceId: z.string().nullish(),
  requestId: z.string().nullish(),
});

export type DesignTitleIn = z.infer<typeof designTitleInSchema>;

export type DesignTitleOut = {
  title: string;
};
