import assert from 'node:assert/strict';
import test from 'node:test';

import { ProjectsUsecase } from './projects.usecase';
import { NotFoundError } from './errors';
import type { ProjectRepository } from '../repositories/postgres/project.repository';
import type { IDesignRepository, IGcsRepository } from '../repositories/interfaces';
import type { UsersUsecase } from './users.usecase';

test('listDesigns returns designs only for owned project', async () => {
  const gcsRepository = {} as IGcsRepository;
  const projectRepository = {
    get: async () => null,
    listByOwner: async () => [],
    listByOwnerPage: async () => ({ items: [], nextCursor: null }),
    getOwned: async (projectId: string, ownerId: string) => ({
      id: projectId,
      ownerId,
      name: 'owned-project',
    }),
    updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
  } as unknown as ProjectRepository;

  const fileRepository = {
    get: async () => null,
    getOwned: async () => null,
    list: async () => [
      {
        id: 'file-1',
        projectId: 'proj-1',
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
  } as unknown as IDesignRepository;

  const usersUsecase = {
    get: async () => ({ id: 'user-1' }),
    create: async () => ({ id: 'user-1' }),
  } as unknown as UsersUsecase;

  const usecase = new ProjectsUsecase(projectRepository, fileRepository, gcsRepository, usersUsecase);
  const result = await usecase.listDesigns('proj-1', 'user-1');

  assert.equal(result.projectId, 'proj-1');
  assert.equal(result.designs.length, 1);
  assert.equal(result.designs[0]?.id, 'file-1');
});

test('listDesigns throws not found when project is not owned', async () => {
  const gcsRepository = {} as IGcsRepository;
  const projectRepository = {
    get: async () => null,
    listByOwner: async () => [],
    listByOwnerPage: async () => ({ items: [], nextCursor: null }),
    getOwned: async () => null,
    updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
  } as unknown as ProjectRepository;

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
  } as unknown as IDesignRepository;

  const usersUsecase = {
    get: async () => ({ id: 'user-1' }),
    create: async () => ({ id: 'user-1' }),
  } as unknown as UsersUsecase;

  const usecase = new ProjectsUsecase(projectRepository, fileRepository, gcsRepository, usersUsecase);

  await assert.rejects(
    async () => usecase.listDesigns('proj-1', 'user-2'),
    (error: unknown) => error instanceof NotFoundError && error.message === 'project not found',
  );
});

test('ensureDefaultProject creates default project for first login user', async () => {
  const gcsRepository = {} as IGcsRepository;
  let createdProjectName: string | null = null;

  const projectRepository = {
    get: async () => null,
    listByOwner: async () => [],
    listByOwnerPage: async () => ({ items: [], nextCursor: null }),
    getOwned: async () => null,
    updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'n' }),
    create: async ({ ownerId, name }: { ownerId: string; name: string }) => {
      createdProjectName = name;
      return { id: 'proj-default', ownerId, name };
    },
  } as unknown as ProjectRepository;

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
  } as unknown as IDesignRepository;

  let userCreated = false;
  const usersUsecase = {
    get: async () => null,
    create: async () => {
      userCreated = true;
      return { id: 'user-1' };
    },
  } as unknown as UsersUsecase;

  const usecase = new ProjectsUsecase(projectRepository, fileRepository, gcsRepository, usersUsecase);
  await usecase.ensureDefaultProject({
    ownerId: 'user-1',
    ownerEmail: 'user-1@example.com',
    ownerName: 'user-1',
  });

  assert.equal(userCreated, true);
  assert.equal(createdProjectName, 'default');
});

test('ensureDefaultProject does nothing for existing user', async () => {
  const gcsRepository = {} as IGcsRepository;
  let createCalled = false;
  let userCreateCalled = false;
  const projectRepository = {
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
  } as unknown as ProjectRepository;

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
  } as unknown as IDesignRepository;

  const usersUsecase = {
    get: async () => ({ id: 'user-1' }),
    create: async () => {
      userCreateCalled = true;
      return { id: 'user-1' };
    },
  } as unknown as UsersUsecase;

  const usecase = new ProjectsUsecase(projectRepository, fileRepository, gcsRepository, usersUsecase);
  await usecase.ensureDefaultProject({ ownerId: 'user-1' });

  assert.equal(createCalled, false);
  assert.equal(userCreateCalled, false);
});
