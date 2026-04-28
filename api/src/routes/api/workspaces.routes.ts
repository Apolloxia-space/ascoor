import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  DeleteWorkspaceParams,
  ListWorkspaceAssetPacksParams,
  UpdateWorkspaceParams,
} from '../../generated/endpoints/workspaces/workspaces.zod';
import type {
  CreateWorkspaceContext,
  DeleteWorkspaceContext,
  ListWorkspacesContext,
  ListWorkspaceAssetPacksContext,
  UpdateWorkspaceContext,
} from '../../generated/endpoints/workspaces/workspaces.context';
import type { AppEnv } from '../../entities/app-env';
import { AssetPackValidationError, NotFoundError, ValidationError } from '../../usecases/errors';
import { createWorkspaceBodySchema, updateWorkspaceBodySchema } from './request-schemas';

const assetPackStatusQuery = z.enum(['queued', 'running', 'succeeded', 'failed']);
const listWorkspacesQuery = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
  cursor: z.string().min(1).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
const listWorkspacePackGenerationJobsQuery = z.object({
  status: z.union([assetPackStatusQuery, z.array(assetPackStatusQuery)]).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  cursor: z.string().min(1).optional(),
});

export function createWorkspacesRoutes() {
  const router = new Hono<AppEnv>();

  router.get(
    '/',
    zValidator('query', listWorkspacesQuery),
    async (c: ListWorkspacesContext<AppEnv>) => {
      const workspacesUsecase = c.get('usecases').workspaces;
      const userId = c.get('md').userId;
      const query = c.req.valid('query');
      const hasPaginationInput =
        query.limit !== undefined || query.cursor !== undefined || query.q !== undefined;

      try {
        if (!hasPaginationInput) {
          const data = await workspacesUsecase.list(userId);
          return c.json({ items: data, nextCursor: null }, 200);
        }

        const result = await workspacesUsecase.listPaginated({
          ownerId: userId,
          limit: query.limit,
          cursor: query.cursor,
          query: query.q,
        });
        return c.json({ items: result.data, nextCursor: result.nextCursor }, 200);
      } catch (error) {
        if (error instanceof ValidationError) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  );

  router.post(
    '/',
    zValidator('json', createWorkspaceBodySchema),
    async (c: CreateWorkspaceContext<AppEnv>) => {
      const { name } = c.req.valid('json');
      const workspacesUsecase = c.get('usecases').workspaces;
      const md = c.get('md');
      const userId = md.userId;
      const data = await workspacesUsecase.create({
        name,
        ownerId: userId,
        ownerEmail: md.userEmail ?? null,
        ownerName: md.userName ?? null,
      });
      return c.json(data, 201);
    },
  );

  router.patch(
    '/:workspaceId',
    zValidator('param', UpdateWorkspaceParams),
    zValidator('json', updateWorkspaceBodySchema),
    async (c: UpdateWorkspaceContext<AppEnv>) => {
      const { workspaceId } = c.req.valid('param');
      const { name } = c.req.valid('json');
      const workspacesUsecase = c.get('usecases').workspaces;
      const userId = c.get('md').userId;
      try {
        const data = await workspacesUsecase.updateName({ workspaceId, name, ownerId: userId });
        return c.json(data, 200);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  );

  router.delete(
    '/:workspaceId',
    zValidator('param', DeleteWorkspaceParams),
    async (c: DeleteWorkspaceContext<AppEnv>) => {
      const { workspaceId } = c.req.valid('param');
      const workspacesUsecase = c.get('usecases').workspaces;
      const userId = c.get('md').userId;
      try {
        await workspacesUsecase.delete({ workspaceId, ownerId: userId });
        return c.body(null, 204);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  );

  router.get(
    '/:workspaceId/asset-packs',
    zValidator('param', ListWorkspaceAssetPacksParams),
    async (c: ListWorkspaceAssetPacksContext<AppEnv>) => {
      const { workspaceId } = c.req.valid('param');
      const workspacesUsecase = c.get('usecases').workspaces;
      const userId = c.get('md').userId;
      try {
        const data = await workspacesUsecase.listAssetPacks(workspaceId, userId);
        return c.json(data, 200);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  );

  router.get(
    '/:workspaceId/thumbnail/content',
    zValidator('param', ListWorkspaceAssetPacksParams),
    async (c) => {
      const { workspaceId } = c.req.valid('param');
      const workspacesUsecase = c.get('usecases').workspaces;
      const userId = c.get('md').userId;
      try {
        const asset = await workspacesUsecase.getThumbnail({ workspaceId, ownerId: userId });
        const body = Uint8Array.from(asset.data).buffer;
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': asset.mime,
            'Cache-Control': 'private, max-age=31536000, immutable',
          },
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  );

  router.put(
    '/:workspaceId/thumbnail/content',
    zValidator('param', ListWorkspaceAssetPacksParams),
    async (c) => {
      const { workspaceId } = c.req.valid('param');
      const workspacesUsecase = c.get('usecases').workspaces;
      const userId = c.get('md').userId;
      const contentType = c.req.header('content-type')?.split(';')[0]?.trim() ?? '';
      try {
        const body = new Uint8Array(await c.req.arrayBuffer());
        await workspacesUsecase.saveThumbnail({
          workspaceId,
          ownerId: userId,
          content: body,
          contentType,
        });
        return c.body(null, 204);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return c.json({ error: error.message }, 404);
        }
        if (error instanceof ValidationError) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  );

  router.get(
    '/:workspaceId/pack-generation-jobs',
    zValidator('param', ListWorkspaceAssetPacksParams),
    zValidator('query', listWorkspacePackGenerationJobsQuery),
    async (c) => {
      const { workspaceId } = c.req.valid('param');
      const query = c.req.valid('query');
      const status = query.status;
      const statuses = status ? (Array.isArray(status) ? status : [status]) : undefined;
      const packGenerationJobsUsecase = c.get('usecases').packGenerationJobs;
      const userId = c.get('md').userId;
      try {
        const data = await packGenerationJobsUsecase.query({
          type: 'listByWorkspace',
          input: {
            workspaceId,
            userId,
            statuses,
            limit: query.limit,
            cursor: query.cursor ?? null,
          },
        });
        return c.json(data, 200);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return c.json({ error: error.message }, 404);
        }
        if (error instanceof AssetPackValidationError) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  );

  return router;
}
