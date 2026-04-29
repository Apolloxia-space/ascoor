import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type {
  DeleteUserContext,
  UpdateUserContext,
} from '../../generated/endpoints/users/users.context';
import type { AppEnv } from '../../entities/app-env';
import { NotFoundError } from '../../usecases/errors';
import { updateUserBodySchema } from './request-schemas';

export function createUsersRoutes() {
  const router = new Hono<AppEnv>();

  router.post('/bootstrap', async (c) => {
    const md = c.get('md');
    const workspacesUsecase = c.get('usecases').workspaces;
    await workspacesUsecase.ensureUser({
      ownerId: md.userId,
      ownerEmail: md.userEmail ?? null,
      ownerName: md.userName ?? null,
    });
    return c.body(null, 204);
  });

  router.patch(
    '/me',
    zValidator('json', updateUserBodySchema),
    async (c: UpdateUserContext<AppEnv>) => {
    const { displayName } = c.req.valid('json');
    const userId = c.get('md').userId;
    const usersUsecase = c.get('usecases').users;

    try {
      const data = await usersUsecase.updateDisplayName(userId, displayName);
      return c.json(data, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
    },
  );

  router.delete('/me', async (c: DeleteUserContext<AppEnv>) => {
    const userId = c.get('md').userId;
    const usersUsecase = c.get('usecases').users;
    try {
      await usersUsecase.deleteAccount(userId);
      return c.body(null, 204);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  return router;
}
