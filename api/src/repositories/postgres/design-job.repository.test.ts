import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '../../generated/prisma/client';
import { DesignJobRepositoryPostgres } from './design-job.repository';

test('countActiveByUser counts queued, running, and preview-unverified succeeded jobs', async () => {
  let capturedArgs: unknown;

  const prisma = {
    designJob: {
      count: async (args: unknown) => {
        capturedArgs = args;
        return 2;
      },
    },
  } as unknown as PrismaClient;

  const repository = new DesignJobRepositoryPostgres(prisma);
  const count = await repository.countActiveByUser('user-1');

  assert.equal(count, 2);
  assert.deepEqual(capturedArgs, {
    where: {
      userId: 'user-1',
      OR: [
        {
          status: {
            in: ['queued', 'running'],
          },
        },
        {
          status: 'succeeded',
          design: {
            previewStatus: 'unverified',
          },
        },
      ],
    },
  });
});
