import { z } from 'zod';

// Domain entity for design request/response
export const designInSchema = z.object({
  prompt: z.string().min(1),
  userPrompt: z.string().min(1).nullish(),
  userId: z.string().nullish(),
  designId: z.string().nullish(),
  traceId: z.string().nullish(),
  requestId: z.string().nullish(),
});

export type DesignIn = z.infer<typeof designInSchema>;

export type DesignOut = {
  message: string;
  title: string;
  code: string;
};
