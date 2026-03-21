import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '../../generated/prisma/client';
import { ProjectRepositoryPostgres } from './project.repository';

test('delete removes design jobs before deleting project', async () => {
  const callOrder: Array<string> = [];
  const args: Record<string, unknown> = {};

  const tx = {
    designJob: {
      deleteMany: async (input: unknown) => {
        callOrder.push('designJob.deleteMany');
        args.designJobDeleteMany = input;
      },
    },
    design: {
      deleteMany: async (input: unknown) => {
        callOrder.push('design.deleteMany');
        args.designDeleteMany = input;
      },
    },
    project: {
      delete: async (input: unknown) => {
        callOrder.push('project.delete');
        args.projectDelete = input;
        return { id: 'proj-1', ownerId: 'user-1', name: 'n' };
      },
    },
  };

  const prisma = {
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx),
  } as unknown as PrismaClient;

  const repository = new ProjectRepositoryPostgres(prisma);
  const deleted = await repository.delete('proj-1');

  assert.equal(deleted.id, 'proj-1');
  assert.deepEqual(callOrder, ['designJob.deleteMany', 'design.deleteMany', 'project.delete']);
  assert.deepEqual(args.designJobDeleteMany, { where: { projectId: 'proj-1' } });
  assert.deepEqual(args.designDeleteMany, { where: { projectId: 'proj-1' } });
  assert.deepEqual(args.projectDelete, { where: { id: 'proj-1' } });
});
