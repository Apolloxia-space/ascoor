import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  GetAssetPackParams,
  GetAssetPackAssetContentParams,
  GetAssetPackAssetContentQueryParams,
  UpdateAssetPackParams,
  DeleteAssetPackParams,
} from '../../generated/endpoints/assetPacks/assetPacks.zod';
import type {
  GetAssetPackContext,
  CreateAssetPackContext,
  UpdateAssetPackContext,
  DeleteAssetPackContext,
} from '../../generated/endpoints/assetPacks/assetPacks.context';
import type { AppEnv } from '../../entities/app-env';
import { NotFoundError, ValidationError } from '../../usecases/errors';
import {
  createAssetPackBodySchema,
  reportAssetPackPreviewResultBodySchema,
  updateAssetPackBodySchema,
} from './request-schemas';

export function createAssetPacksRoutes() {
  const router = new Hono<AppEnv>();

  router.post(
    '/',
    zValidator('json', createAssetPackBodySchema),
    async (c: CreateAssetPackContext<AppEnv>) => {
      const { workspaceId, displayName } = c.req.valid('json');
      const userId = c.get('md').userId;
      const assetPacksUsecase = c.get('usecases').assetPacks;
    try {
      const created = await assetPacksUsecase.create({
        workspaceId,
        displayName,
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
    '/:assetPackId',
    zValidator('param', GetAssetPackParams),
    async (c: GetAssetPackContext<AppEnv>) => {
      const { assetPackId } = c.req.valid('param');
      const usecase = c.get('usecases').assetPacks;
      const userId = c.get('md').userId;
      try {
        const data = await usecase.get(userId, assetPackId);
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
    '/:assetPackId/assets/content',
    zValidator('param', GetAssetPackAssetContentParams),
    zValidator('query', GetAssetPackAssetContentQueryParams),
    async (c) => {
      const { assetPackId } = c.req.valid('param');
      const { type } = c.req.valid('query');
      const usecase = c.get('usecases').assetPacks;
      const userId = c.get('md').userId;
      try {
        const asset = await usecase.getAssetContent(userId, assetPackId, type);
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

  router.get('/:assetPackId/edited-model', async (c) => {
    const assetPackId = c.req.param('assetPackId');
    const usecase = c.get('usecases').assetPacks;
    const userId = c.get('md').userId;
    try {
      const asset = await usecase.getEditedModel(userId, assetPackId);
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

  router.put('/:assetPackId/edited-model', async (c) => {
    const assetPackId = c.req.param('assetPackId');
    const usecase = c.get('usecases').assetPacks;
    const userId = c.get('md').userId;
    try {
      const body = new Uint8Array(await c.req.arrayBuffer());
      await usecase.saveEditedModel(userId, assetPackId, body);
      return c.body(null, 204);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  router.delete('/:assetPackId/edited-model', async (c) => {
    const assetPackId = c.req.param('assetPackId');
    const usecase = c.get('usecases').assetPacks;
    const userId = c.get('md').userId;
    try {
      await usecase.clearEditedModel(userId, assetPackId);
      return c.body(null, 204);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  router.post(
    '/:assetPackId/preview-results',
    zValidator('param', GetAssetPackParams),
    zValidator('json', reportAssetPackPreviewResultBodySchema),
    async (c) => {
      const { assetPackId } = c.req.valid('param');
      const { status, errorMessage } = c.req.valid('json');
      const usecase = c.get('usecases').assetPacks;
      const userId = c.get('md').userId;
      try {
        await usecase.reportPreviewResult(userId, assetPackId, { status, errorMessage });
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
    '/:assetPackId',
    zValidator('param', UpdateAssetPackParams),
    zValidator('json', updateAssetPackBodySchema),
    async (c: UpdateAssetPackContext<AppEnv>) => {
      const { assetPackId } = c.req.valid('param');
      const { displayName } = c.req.valid('json');
      const usecase = c.get('usecases').assetPacks;
      const userId = c.get('md').userId;
      try {
        const data = await usecase.updateMetadata(userId, assetPackId, displayName);
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
    '/:assetPackId',
    zValidator('param', DeleteAssetPackParams),
    async (c: DeleteAssetPackContext<AppEnv>) => {
      const { assetPackId } = c.req.valid('param');
      const usecase = c.get('usecases').assetPacks;
      const userId = c.get('md').userId;
      try {
        await usecase.delete(userId, assetPackId);
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
