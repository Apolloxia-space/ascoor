import assert from 'node:assert/strict';
import test from 'node:test';

import { WorkspacesUsecase } from './workspaces.usecase';
import { NotFoundError } from './errors';
import type { WorkspaceRepository } from '../repositories/postgres/workspace.repository';
import type { IAssetPackRepository, IGcsRepository } from '../repositories/interfaces';
import type { UsersUsecase } from './users.usecase';

test('list asset packs returns asset packs only for owned workspace', async () => {
  const gcsRepository = {} as IGcsRepository;
  const workspaceRepository = {
    get: async () => null,
    listByOwner: async () => [],
    listByOwnerPage: async () => ({ items: [], nextCursor: null }),
    getOwned: async (workspaceId: string, ownerId: string) => ({
      id: workspaceId,
      ownerId,
      name: 'owned-workspace',
    }),
    updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
  } as unknown as WorkspaceRepository;

  const fileRepository = {
    get: async () => null,
    getOwned: async () => null,
    list: async () => [
      {
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'alpha.ts',
        type: 'studio_ts',
        assetStatus: 'queued',
      },
    ],
    update: async () => {
      throw new Error('not used');
    },
    updateDisplayName: async () => {
      throw new Error('not used');
    },
    create: async () => {
      throw new Error('not used');
    },
    updateAsset: async () => {
      throw new Error('not used');
    },
    delete: async () => {
      throw new Error('not used');
    },
  } as unknown as IAssetPackRepository;

  const usersUsecase = {
    get: async () => ({ id: 'user-1' }),
    create: async () => ({ id: 'user-1' }),
  } as unknown as UsersUsecase;

  const usecase = new WorkspacesUsecase(workspaceRepository, fileRepository, gcsRepository, usersUsecase);
  const result = await usecase.listAssetPacks('proj-1', 'user-1');

  assert.equal(result.workspaceId, 'proj-1');
  assert.equal(result.assetPacks.length, 1);
  assert.equal(result.assetPacks[0]?.id, 'file-1');
});

test('list asset packs throws not found when workspace is not owned', async () => {
  const gcsRepository = {} as IGcsRepository;
  const workspaceRepository = {
    get: async () => null,
    listByOwner: async () => [],
    listByOwnerPage: async () => ({ items: [], nextCursor: null }),
    getOwned: async () => null,
    updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
  } as unknown as WorkspaceRepository;

  const fileRepository = {
    get: async () => null,
    getOwned: async () => null,
    list: async () => [],
    update: async () => {
      throw new Error('not used');
    },
    updateDisplayName: async () => {
      throw new Error('not used');
    },
    create: async () => {
      throw new Error('not used');
    },
    updateAsset: async () => {
      throw new Error('not used');
    },
    delete: async () => {
      throw new Error('not used');
    },
  } as unknown as IAssetPackRepository;

  const usersUsecase = {
    get: async () => ({ id: 'user-1' }),
    create: async () => ({ id: 'user-1' }),
  } as unknown as UsersUsecase;

  const usecase = new WorkspacesUsecase(workspaceRepository, fileRepository, gcsRepository, usersUsecase);

  await assert.rejects(
    async () => usecase.listAssetPacks('proj-1', 'user-2'),
    (error: unknown) => error instanceof NotFoundError && error.message === 'workspace not found',
  );
});

test('ensureDefaultWorkspace creates default workspace for first login user', async () => {
  const gcsRepository = {} as IGcsRepository;
  let createdWorkspaceName: string | null = null;

  const workspaceRepository = {
    get: async () => null,
    listByOwner: async () => [],
    listByOwnerPage: async () => ({ items: [], nextCursor: null }),
    getOwned: async () => null,
    updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    create: async ({ ownerId, name }: { ownerId: string; name: string }) => {
      createdWorkspaceName = name;
      return { id: 'proj-default', ownerId, name };
    },
  } as unknown as WorkspaceRepository;

  const fileRepository = {
    get: async () => null,
    getOwned: async () => null,
    list: async () => [],
    update: async () => {
      throw new Error('not used');
    },
    updateDisplayName: async () => {
      throw new Error('not used');
    },
    create: async () => {
      throw new Error('not used');
    },
    updateAsset: async () => {
      throw new Error('not used');
    },
    delete: async () => {
      throw new Error('not used');
    },
  } as unknown as IAssetPackRepository;

  let userCreated = false;
  const usersUsecase = {
    get: async () => null,
    create: async () => {
      userCreated = true;
      return { id: 'user-1' };
    },
  } as unknown as UsersUsecase;

  const usecase = new WorkspacesUsecase(workspaceRepository, fileRepository, gcsRepository, usersUsecase);
  await usecase.ensureDefaultWorkspace({
    ownerId: 'user-1',
    ownerEmail: 'user-1@example.com',
    ownerName: 'user-1',
  });

  assert.equal(userCreated, true);
  assert.equal(createdWorkspaceName, 'default');
});

test('ensureDefaultWorkspace does nothing for existing user', async () => {
  const gcsRepository = {} as IGcsRepository;
  let createCalled = false;
  let userCreateCalled = false;
  const workspaceRepository = {
    get: async () => null,
    listByOwner: async () => [],
    listByOwnerPage: async () => ({ items: [], nextCursor: null }),
    getOwned: async () => null,
    updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    create: async ({ ownerId, name }: { ownerId: string; name: string }) => {
      createCalled = true;
      return { id: 'proj-default', ownerId, name };
    },
  } as unknown as WorkspaceRepository;

  const fileRepository = {
    get: async () => null,
    getOwned: async () => null,
    list: async () => [],
    update: async () => {
      throw new Error('not used');
    },
    updateDisplayName: async () => {
      throw new Error('not used');
    },
    create: async () => {
      throw new Error('not used');
    },
    updateAsset: async () => {
      throw new Error('not used');
    },
    delete: async () => {
      throw new Error('not used');
    },
  } as unknown as IAssetPackRepository;

  const usersUsecase = {
    get: async () => ({ id: 'user-1' }),
    create: async () => {
      userCreateCalled = true;
      return { id: 'user-1' };
    },
  } as unknown as UsersUsecase;

  const usecase = new WorkspacesUsecase(workspaceRepository, fileRepository, gcsRepository, usersUsecase);
  await usecase.ensureDefaultWorkspace({ ownerId: 'user-1' });

  assert.equal(createCalled, false);
  assert.equal(userCreateCalled, false);
});
