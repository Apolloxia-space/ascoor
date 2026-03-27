import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '../../generated/prisma/client';
import { DesignJobRepositoryPostgres } from './design-job.repository';

test('countSucceededByUserInPeriod counts succeeded jobs even when linked design is deleted', async () => {
  let capturedArgs: unknown;

  const prisma = {
    designJob: {
      count: async (args: unknown) => {
        capturedArgs = args;
        return 3;
      },
    },
  } as unknown as PrismaClient;

  const repository = new DesignJobRepositoryPostgres(prisma);
  const count = await repository.countSucceededByUserInPeriod({
    userId: 'user-1',
    periodStart: new Date('2026-03-01T00:00:00.000Z'),
    periodEnd: new Date('2026-04-01T00:00:00.000Z'),
  });

  assert.equal(count, 3);
  assert.deepEqual(capturedArgs, {
    where: {
      userId: 'user-1',
      status: 'succeeded',
      OR: [
        { design: null },
        {
          design: {
            previewStatus: 'succeeded',
          },
        },
      ],
      finishedAt: {
        gte: new Date('2026-03-01T00:00:00.000Z'),
        lt: new Date('2026-04-01T00:00:00.000Z'),
      },
    },
  });
});
