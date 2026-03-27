import { z } from 'zod';

import { CREATE_FORM_MAX_CHARS, DEFAULT_FORM_MAX_CHARS } from '../../constants/form-limits';
import { CANCEL_SUBSCRIPTION_REASONS } from '../../entities/subscription';

const requiredTrimmedString = (maxChars: number) => z.string().trim().min(1).max(maxChars);
const requiredIdentifier = () => z.string().trim().min(1);
const RENDER_FAILURE_MAX_CHARS = 2000;
const PREVIEW_RESULT_STATUSES = ['succeeded', 'failed'] as const;

export const createDesignJobBodySchema = z
  .object({
    projectId: requiredIdentifier(),
    userPrompt: requiredTrimmedString(CREATE_FORM_MAX_CHARS),
  })
  .strict();

export const createDesignBodySchema = z
  .object({
    projectId: requiredIdentifier(),
    displayName: requiredTrimmedString(DEFAULT_FORM_MAX_CHARS),
  })
  .strict();

export const updateDesignBodySchema = z
  .object({
    displayName: requiredTrimmedString(DEFAULT_FORM_MAX_CHARS),
  })
  .strict();

export const reportDesignPreviewResultBodySchema = z
  .object({
    status: z.enum(PREVIEW_RESULT_STATUSES),
    errorMessage: z.string().trim().max(RENDER_FAILURE_MAX_CHARS).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'failed' && (!value.errorMessage || value.errorMessage.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'errorMessage is required when status is failed',
        path: ['errorMessage'],
      });
    }
  })
  .strict();

export const createProjectBodySchema = z
  .object({
    name: requiredTrimmedString(DEFAULT_FORM_MAX_CHARS),
  })
  .strict();

export const updateProjectBodySchema = z
  .object({
    name: requiredTrimmedString(DEFAULT_FORM_MAX_CHARS),
  })
  .strict();

export const updateUserBodySchema = z
  .object({
    displayName: requiredTrimmedString(DEFAULT_FORM_MAX_CHARS),
  })
  .strict();

export const cancelBodySchema = z
  .object({
    reason: z.enum(CANCEL_SUBSCRIPTION_REASONS).optional(),
    details: z.string().trim().max(DEFAULT_FORM_MAX_CHARS).optional(),
  })
  .strict();
