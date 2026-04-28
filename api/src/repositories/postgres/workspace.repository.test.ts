import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '../../generated/prisma/client';
import { WorkspaceRepositoryPostgres } from './workspace.repository';

test('delete removes pack generation jobs before deleting workspace', async () => {
  const callOrder: Array<string> = [];
  const args: Record<string, unknown> = {};

  const tx = {
    packGenerationJob: {
      deleteMany: async (input: unknown) => {
        callOrder.push('packGenerationJob.deleteMany');
        args.packGenerationJobDeleteMany = input;
      },
    },
    assetPack: {
      deleteMany: async (input: unknown) => {
        callOrder.push('assetPack.deleteMany');
        args.assetPackDeleteMany = input;
      },
    },
    workspace: {
      delete: async (input: unknown) => {
        callOrder.push('workspace.delete');
        args.workspaceDelete = input;
        return { id: 'proj-1', ownerId: 'user-1', name: 'n' };
      },
    },
  };

  const prisma = {
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx),
  } as unknown as PrismaClient;

  const repository = new WorkspaceRepositoryPostgres(prisma);
  const deleted = await repository.delete('proj-1');

  assert.equal(deleted.id, 'proj-1');
  assert.deepEqual(callOrder, ['packGenerationJob.deleteMany', 'assetPack.deleteMany', 'workspace.delete']);
  assert.deepEqual(args.packGenerationJobDeleteMany, { where: { workspaceId: 'proj-1' } });
  assert.deepEqual(args.assetPackDeleteMany, { where: { workspaceId: 'proj-1' } });
  assert.deepEqual(args.workspaceDelete, { where: { id: 'proj-1' } });
});
