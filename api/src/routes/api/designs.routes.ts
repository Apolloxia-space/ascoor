import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  GetDesignParams,
  GetDesignAssetContentParams,
  GetDesignAssetContentQueryParams,
  UpdateDesignParams,
  DeleteDesignParams,
} from '../../generated/endpoints/designs/designs.zod';
import type {
  GetDesignContext,
  CreateDesignContext,
  UpdateDesignContext,
  DeleteDesignContext,
} from '../../generated/endpoints/designs/designs.context';
import type { AppEnv } from '../../entities/app-env';
import { NotFoundError, ValidationError } from '../../usecases/errors';
import {
  createDesignBodySchema,
  reportDesignRenderFailureBodySchema,
  updateDesignBodySchema,
} from './request-schemas';

export function createDesignsRoutes() {
  const router = new Hono<AppEnv>();

  router.post(
    '/',
    zValidator('json', createDesignBodySchema),
    async (c: CreateDesignContext<AppEnv>) => {
      const { projectId, displayName, type } = c.req.valid('json');
      const userId = c.get('md').userId;
      const designsUsecase = c.get('usecases').designs;
    try {
      const created = await designsUsecase.create({
        projectId,
        displayName,
        type,
        ownerId: userId,
      });
      return c.json(created, 201);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
    },
  );

  router.get(
    '/:designId',
    zValidator('param', GetDesignParams),
    async (c: GetDesignContext<AppEnv>) => {
      const { designId } = c.req.valid('param');
      const usecase = c.get('usecases').designs;
      const userId = c.get('md').userId;
      try {
        const data = await usecase.get(userId, designId);
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
    '/:designId/assets/content',
    zValidator('param', GetDesignAssetContentParams),
    zValidator('query', GetDesignAssetContentQueryParams),
    async (c) => {
      const { designId } = c.req.valid('param');
      const { type } = c.req.valid('query');
      const usecase = c.get('usecases').designs;
      const userId = c.get('md').userId;
      try {
        const asset = await usecase.getAssetContent(userId, designId, type);
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

  router.get('/:designId/edited-model', async (c) => {
    const designId = c.req.param('designId');
    const usecase = c.get('usecases').designs;
    const userId = c.get('md').userId;
    try {
      const asset = await usecase.getEditedModel(userId, designId);
      const body = Uint8Array.from(asset.data).buffer;
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': asset.mime,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  router.put('/:designId/edited-model', async (c) => {
    const designId = c.req.param('designId');
    const usecase = c.get('usecases').designs;
    const userId = c.get('md').userId;
    try {
      const body = new Uint8Array(await c.req.arrayBuffer());
      await usecase.saveEditedModel(userId, designId, body);
      return c.body(null, 204);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  router.delete('/:designId/edited-model', async (c) => {
    const designId = c.req.param('designId');
    const usecase = c.get('usecases').designs;
    const userId = c.get('md').userId;
    try {
      await usecase.clearEditedModel(userId, designId);
      return c.body(null, 204);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  router.post(
    '/:designId/render-failures',
    zValidator('param', GetDesignParams),
    zValidator('json', reportDesignRenderFailureBodySchema),
    async (c) => {
      const { designId } = c.req.valid('param');
      const { errorMessage } = c.req.valid('json');
      const usecase = c.get('usecases').designs;
      const userId = c.get('md').userId;
      try {
        await usecase.reportRenderFailure(userId, designId, errorMessage);
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

  router.patch(
    '/:designId',
    zValidator('param', UpdateDesignParams),
    zValidator('json', updateDesignBodySchema),
    async (c: UpdateDesignContext<AppEnv>) => {
      const { designId } = c.req.valid('param');
      const { displayName } = c.req.valid('json');
      const usecase = c.get('usecases').designs;
      const userId = c.get('md').userId;
      try {
        const data = await usecase.updateMetadata(userId, designId, displayName);
        return c.json(data, 200);
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

  router.delete(
    '/:designId',
    zValidator('param', DeleteDesignParams),
    async (c: DeleteDesignContext<AppEnv>) => {
      const { designId } = c.req.valid('param');
      const usecase = c.get('usecases').designs;
      const userId = c.get('md').userId;
      try {
        await usecase.delete(userId, designId);
        return c.body(null, 204);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  );

  return router;
}
