import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  DeleteProjectParams,
  ListProjectDesignsParams,
  UpdateProjectParams,
} from '../../generated/endpoints/projects/projects.zod';
import type {
  CreateProjectContext,
  DeleteProjectContext,
  ListProjectsContext,
  ListProjectDesignsContext,
  UpdateProjectContext,
} from '../../generated/endpoints/projects/projects.context';
import type { AppEnv } from '../../entities/app-env';
import { DesignValidationError, NotFoundError, ValidationError } from '../../usecases/errors';
import { createProjectBodySchema, updateProjectBodySchema } from './request-schemas';

const designStatusQuery = z.enum(['queued', 'running', 'succeeded', 'failed']);
const listProjectsQuery = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
  cursor: z.string().min(1).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
const listProjectDesignJobsQuery = z.object({
  status: z.union([designStatusQuery, z.array(designStatusQuery)]).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  cursor: z.string().min(1).optional(),
});

export function createProjectsRoutes() {
  const router = new Hono<AppEnv>();

  router.get(
    '/',
    zValidator('query', listProjectsQuery),
    async (c: ListProjectsContext<AppEnv>) => {
      const projectsUsecase = c.get('usecases').projects;
      const userId = c.get('md').userId;
      const query = c.req.valid('query');
      const hasPaginationInput =
        query.limit !== undefined || query.cursor !== undefined || query.q !== undefined;

      try {
        if (!hasPaginationInput) {
          const data = await projectsUsecase.list(userId);
          return c.json({ items: data, nextCursor: null }, 200);
        }

        const result = await projectsUsecase.listPaginated({
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
    zValidator('json', createProjectBodySchema),
    async (c: CreateProjectContext<AppEnv>) => {
      const { name } = c.req.valid('json');
      const projectsUsecase = c.get('usecases').projects;
      const md = c.get('md');
      const userId = md.userId;
      const data = await projectsUsecase.create({
        name,
        ownerId: userId,
        ownerEmail: md.userEmail ?? null,
        ownerName: md.userName ?? null,
      });
      return c.json(data, 201);
    },
  );

  router.patch(
    '/:projectId',
    zValidator('param', UpdateProjectParams),
    zValidator('json', updateProjectBodySchema),
    async (c: UpdateProjectContext<AppEnv>) => {
      const { projectId } = c.req.valid('param');
      const { name } = c.req.valid('json');
      const projectsUsecase = c.get('usecases').projects;
      const userId = c.get('md').userId;
      try {
        const data = await projectsUsecase.updateName({ projectId, name, ownerId: userId });
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
    '/:projectId',
    zValidator('param', DeleteProjectParams),
    async (c: DeleteProjectContext<AppEnv>) => {
      const { projectId } = c.req.valid('param');
      const projectsUsecase = c.get('usecases').projects;
      const userId = c.get('md').userId;
      try {
        await projectsUsecase.delete({ projectId, ownerId: userId });
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
    '/:projectId/designs',
    zValidator('param', ListProjectDesignsParams),
    async (c: ListProjectDesignsContext<AppEnv>) => {
      const { projectId } = c.req.valid('param');
      const projectsUsecase = c.get('usecases').projects;
      const userId = c.get('md').userId;
      try {
        const data = await projectsUsecase.listDesigns(projectId, userId);
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
    '/:projectId/thumbnail/content',
    zValidator('param', ListProjectDesignsParams),
    async (c) => {
      const { projectId } = c.req.valid('param');
      const projectsUsecase = c.get('usecases').projects;
      const userId = c.get('md').userId;
      try {
        const asset = await projectsUsecase.getThumbnail({ projectId, ownerId: userId });
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
    '/:projectId/thumbnail/content',
    zValidator('param', ListProjectDesignsParams),
    async (c) => {
      const { projectId } = c.req.valid('param');
      const projectsUsecase = c.get('usecases').projects;
      const userId = c.get('md').userId;
      const contentType = c.req.header('content-type')?.split(';')[0]?.trim() ?? '';
      try {
        const body = new Uint8Array(await c.req.arrayBuffer());
        await projectsUsecase.saveThumbnail({
          projectId,
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
    '/:projectId/design-jobs',
    zValidator('param', ListProjectDesignsParams),
    zValidator('query', listProjectDesignJobsQuery),
    async (c) => {
      const { projectId } = c.req.valid('param');
      const query = c.req.valid('query');
      const status = query.status;
      const statuses = status ? (Array.isArray(status) ? status : [status]) : undefined;
      const designJobsUsecase = c.get('usecases').designJobs;
      const userId = c.get('md').userId;
      try {
        const data = await designJobsUsecase.query({
          type: 'listByProject',
          input: {
            projectId,
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
        if (error instanceof DesignValidationError) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  );

  return router;
}
