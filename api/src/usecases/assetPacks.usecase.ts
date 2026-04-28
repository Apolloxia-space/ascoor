import type { IAssetPackRepository, IGcsRepository } from '../repositories/interfaces';
import type { WorkspaceRepository } from '../repositories/postgres/workspace.repository';
import type { PackGenerationJobRepositoryPostgres } from '../repositories/postgres/assetPack-job.repository';
import { NotFoundError, ValidationError } from './errors';
import {
  buildEditedModelObjectPath,
  getEditedModelSnapshot,
  type AssetPack,
  type CreateAssetPackInput,
} from '../entities/assetPack';
import { DEFAULT_FORM_MAX_CHARS } from '../constants/form-limits';
import { normalizeRequiredFormValue } from '../utils/form';

const MAX_RENDER_FAILURE_MESSAGE_CHARS = 2000;

export class AssetPacksUsecase {
  constructor(
    private readonly assetPackRepository: IAssetPackRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly gcsRepository: IGcsRepository,
    private readonly packGenerationJobRepository: PackGenerationJobRepositoryPostgres,
  ) {}

  async get(userId: string, assetPackId: string) {
    const assetPack = await this.assetPackRepository.getOwned(userId, assetPackId);
    if (!assetPack) {
      throw new NotFoundError('asset not found');
    }

    const latestPackGenerationJob = await this.packGenerationJobRepository.findLatestByAssetPackOwned({
      userId,
      assetPackId,
    });
    const parts =
      typeof this.assetPackRepository.listParts === 'function'
        ? await this.assetPackRepository.listParts(assetPack.id)
        : [];
    const editedSnapshot = getEditedModelSnapshot(assetPack);

    return {
      assetPack: {
        ...editedSnapshot,
        id: assetPack.id,
        workspaceId: assetPack.workspaceId,
        displayName: assetPack.displayName,
        assetUriTs: assetPack.assetUriTs ?? null,
        packPlan: assetPack.packPlan ?? null,
        parts: parts.map((part) => ({
          id: part.id,
          assetPackId: part.assetPackId,
          slug: part.slug,
          displayName: part.displayName,
          description: part.description,
          prompt: part.prompt,
          status: part.status,
          assetUriTs: part.assetUriTs,
          errorMessage: part.errorMessage,
          sortOrder: part.sortOrder,
          createdAt: part.createdAt.toISOString(),
          updatedAt: part.updatedAt.toISOString(),
        })),
        previewStatus: assetPack.previewStatus,
        previewError: assetPack.previewError ?? null,
        editedAssetUpdatedAt: editedSnapshot.editedAssetUpdatedAt?.toISOString() ?? null,
        createdAt: assetPack.createdAt.toISOString(),
        updatedAt: assetPack.updatedAt.toISOString(),
      },
      latestPackGenerationJob: latestPackGenerationJob
        ? {
            packGenerationJobId: latestPackGenerationJob.id,
            status: latestPackGenerationJob.status,
            userPrompt: latestPackGenerationJob.userPrompt,
            message: latestPackGenerationJob.message ?? null,
            title: latestPackGenerationJob.title ?? null,
            createdAt: latestPackGenerationJob.createdAt.toISOString(),
            updatedAt: latestPackGenerationJob.updatedAt.toISOString(),
          }
        : null,
    };
  }

  async getAssetContent(userId: string, assetPackId: string, type: 'ts') {
    const assetPack = await this.assetPackRepository.getOwned(userId, assetPackId);
    if (!assetPack) {
      throw new NotFoundError('asset not found');
    }

    const assetUri = this.resolveAssetUri(assetPack, type);
    if (!assetUri) {
      throw new NotFoundError('asset not found');
    }

    const data = await this.gcsRepository.downloadBinary({ uri: assetUri });
    if (!data) {
      throw new NotFoundError('asset not found');
    }

    return {
      mime: this.typeToMime(type),
      data,
    };
  }

  async getEditedModel(userId: string, assetPackId: string) {
    const assetPack = await this.assetPackRepository.getOwned(userId, assetPackId);
    if (!assetPack) {
      throw new NotFoundError('asset not found');
    }
    const { editedAssetUriGlb } = getEditedModelSnapshot(assetPack);
    if (!editedAssetUriGlb) {
      throw new NotFoundError('edited model not found');
    }

    const data = await this.gcsRepository.downloadBinary({ uri: editedAssetUriGlb });
    if (!data) {
      throw new NotFoundError('edited model not found');
    }

    return {
      mime: 'model/gltf-binary',
      data,
    };
  }

  async saveEditedModel(userId: string, assetPackId: string, content: Uint8Array) {
    const assetPack = await this.assetPackRepository.getOwned(userId, assetPackId);
    if (!assetPack) {
      throw new NotFoundError('Asset pack not found');
    }

    const objectPath = buildEditedModelObjectPath({ assetPackId, userId });
    const uploaded = await this.gcsRepository.uploadBinary({
      content,
      contentType: 'model/gltf-binary',
      objectPath,
      metadata: {
        assetPackId,
        userId,
        source: 'studio-edited-model',
      },
    });

    return this.assetPackRepository.updateEditedAsset({
      assetPackId,
      editedAssetUriGlb: uploaded.gcsUri,
      editedAssetUpdatedAt: new Date(),
    });
  }

  async clearEditedModel(userId: string, assetPackId: string) {
    const assetPack = await this.assetPackRepository.getOwned(userId, assetPackId);
    if (!assetPack) {
      throw new NotFoundError('Asset pack not found');
    }

    const objectPath = buildEditedModelObjectPath({ assetPackId, userId });
    await this.gcsRepository.deleteByPrefix({ prefix: objectPath });

    return this.assetPackRepository.updateEditedAsset({
      assetPackId,
      editedAssetUriGlb: null,
      editedAssetUpdatedAt: null,
    });
  }

  async updateMetadata(userId: string, assetPackId: string, displayName: string) {
    const normalizedName = normalizeRequiredFormValue(displayName, {
      field: 'displayName',
      maxChars: DEFAULT_FORM_MAX_CHARS,
      errorFactory: (message) => new ValidationError(message),
    });

    const assetPack = await this.assetPackRepository.getOwned(userId, assetPackId);
    if (!assetPack) {
      throw new NotFoundError('Asset pack not found');
    }

    const updated = await this.assetPackRepository.updateDisplayName({
      assetPackId,
      displayName: normalizedName,
    });
    return updated;
  }

  async reportPreviewResult(
    userId: string,
    assetPackId: string,
    input: {
      status: 'succeeded' | 'failed';
      errorMessage?: string;
    },
  ) {
    const assetPack = await this.assetPackRepository.getOwned(userId, assetPackId);
    if (!assetPack) {
      throw new NotFoundError('Asset pack not found');
    }

    const latestPackGenerationJob = await this.packGenerationJobRepository.findLatestByAssetPackOwned({
      userId,
      assetPackId,
    });
    if (!latestPackGenerationJob || latestPackGenerationJob.status !== 'succeeded') {
      return;
    }

    if (input.status === 'succeeded') {
      await this.assetPackRepository.updatePreview({
        assetPackId,
        previewStatus: 'succeeded',
        previewError: null,
      });
      return;
    }

    const normalizedErrorMessage = normalizeRequiredFormValue(input.errorMessage ?? '', {
      field: 'errorMessage',
      maxChars: MAX_RENDER_FAILURE_MESSAGE_CHARS,
      errorFactory: (message) => new ValidationError(message),
    });

    await this.assetPackRepository.updatePreview({
      assetPackId,
      previewStatus: 'failed',
      previewError: normalizedErrorMessage,
    });
  }

  async delete(userId: string, assetPackId: string) {
    const assetPack = await this.assetPackRepository.getOwned(userId, assetPackId);
    if (!assetPack) {
      throw new NotFoundError('Asset pack not found');
    }
    await this.assetPackRepository.delete(assetPackId);
  }

  async create(input: CreateAssetPackInput): Promise<AssetPack> {
    const displayName = normalizeRequiredFormValue(input.displayName, {
      field: 'displayName',
      maxChars: DEFAULT_FORM_MAX_CHARS,
      errorFactory: (message) => new ValidationError(message),
    });
    const workspace = await this.workspaceRepository.getOwned(
      input.workspaceId,
      input.ownerId ?? 'default',
    );
    if (!workspace) {
      throw new NotFoundError('workspace not found');
    }

    const created = await this.assetPackRepository.create({
      workspaceId: input.workspaceId,
      displayName,
    });

    return created;
  }

  private resolveAssetUri(assetPack: { assetUriTs?: string | null }, type: 'ts') {
    switch (type) {
      case 'ts':
        return assetPack.assetUriTs ?? null;
      default:
        return null;
    }
  }

  private typeToMime(type: 'ts') {
    switch (type) {
      case 'ts':
        return 'text/javascript';
      default:
        return 'application/octet-stream';
    }
  }
}
