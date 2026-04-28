import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { LocalStorageRepository } from './local-storage.repository';

test('LocalStorageRepository stores text with gs URI compatibility', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'ascoor-local-storage-'));
  try {
    const repository = new LocalStorageRepository({ bucket: 'local-bucket', rootDir });
    const uploaded = await repository.upload({
      objectPath: 'users/user-1/assetPacks/assetPack-1.ts',
      content: 'const result = new THREE.Group();',
      contentType: 'text/javascript',
    });

    assert.equal(uploaded.gcsUri, 'gs://local-bucket/users/user-1/assetPacks/assetPack-1.ts');
    assert.equal(
      await repository.download({ uri: uploaded.gcsUri }),
      'const result = new THREE.Group();',
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('LocalStorageRepository stores binary content', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'ascoor-local-storage-'));
  try {
    const repository = new LocalStorageRepository({ bucket: 'local-bucket', rootDir });
    const uploaded = await repository.uploadBinary({
      objectPath: 'users/user-1/assetPacks/assetPack-1/model.glb',
      content: new Uint8Array([1, 2, 3]),
      contentType: 'model/gltf-binary',
    });

    assert.deepEqual(await repository.downloadBinary({ uri: uploaded.gcsUri }), new Uint8Array([1, 2, 3]));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
