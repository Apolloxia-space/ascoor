import { z } from 'zod';

import { CREATE_FORM_MAX_CHARS, DEFAULT_FORM_MAX_CHARS } from '../../constants/form-limits';
import { CANCEL_SUBSCRIPTION_REASONS } from '../../entities/subscription';

const requiredTrimmedString = (maxChars: number) => z.string().trim().min(1).max(maxChars);
const requiredIdentifier = () => z.string().trim().min(1);
const RENDER_FAILURE_MAX_CHARS = 2000;

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
    type: z.literal('studio_ts'),
  })
  .strict();

export const updateDesignBodySchema = z
  .object({
    displayName: requiredTrimmedString(DEFAULT_FORM_MAX_CHARS),
  })
  .strict();

export const reportDesignRenderFailureBodySchema = z
  .object({
    errorMessage: requiredTrimmedString(RENDER_FAILURE_MAX_CHARS),
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
