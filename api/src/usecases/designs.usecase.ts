import type { IDesignRepository, IGcsRepository } from '../repositories/interfaces';
import type { ProjectRepository } from '../repositories/postgres/project.repository';
import type { DesignJobRepositoryPostgres } from '../repositories/postgres/design-job.repository';
import { NotFoundError, ValidationError } from './errors';
import {
  buildEditedModelObjectPath,
  getEditedModelSnapshot,
  type Design,
  type CreateDesignInput,
} from '../entities/design';
import { DEFAULT_FORM_MAX_CHARS } from '../constants/form-limits';
import { normalizeRequiredFormValue } from '../utils/form';

const MAX_RENDER_FAILURE_MESSAGE_CHARS = 2000;

export class DesignsUsecase {
  constructor(
    private readonly designRepository: IDesignRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly gcsRepository: IGcsRepository,
    private readonly designJobRepository: DesignJobRepositoryPostgres,
  ) {}

  async get(userId: string, designId: string) {
    const design = await this.designRepository.getOwned(userId, designId);
    if (!design) {
      throw new NotFoundError('asset not found');
    }

    const latestDesignJob = await this.designJobRepository.findLatestByDesignOwned({
      userId,
      designId,
    });
    const editedSnapshot = getEditedModelSnapshot(design);

    return {
      design: {
        ...editedSnapshot,
        id: design.id,
        projectId: design.projectId,
        displayName: design.displayName,
        assetUriTs: design.assetUriTs ?? null,
        previewStatus: design.previewStatus,
        previewError: design.previewError ?? null,
        editedAssetUpdatedAt: editedSnapshot.editedAssetUpdatedAt?.toISOString() ?? null,
        createdAt: design.createdAt.toISOString(),
        updatedAt: design.updatedAt.toISOString(),
      },
      latestDesignJob: latestDesignJob
        ? {
            designJobId: latestDesignJob.id,
            status: latestDesignJob.status,
            userPrompt: latestDesignJob.userPrompt,
            message: latestDesignJob.message ?? null,
            title: latestDesignJob.title ?? null,
            createdAt: latestDesignJob.createdAt.toISOString(),
            updatedAt: latestDesignJob.updatedAt.toISOString(),
          }
        : null,
    };
  }

  async getAssetContent(userId: string, designId: string, type: 'ts') {
    const design = await this.designRepository.getOwned(userId, designId);
    if (!design) {
      throw new NotFoundError('asset not found');
    }

    const assetUri = this.resolveAssetUri(design, type);
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

  async getEditedModel(userId: string, designId: string) {
    const design = await this.designRepository.getOwned(userId, designId);
    if (!design) {
      throw new NotFoundError('asset not found');
    }
    const { editedAssetUriGlb } = getEditedModelSnapshot(design);
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

  async saveEditedModel(userId: string, designId: string, content: Uint8Array) {
    const design = await this.designRepository.getOwned(userId, designId);
    if (!design) {
      throw new NotFoundError('design not found');
    }

    const objectPath = buildEditedModelObjectPath({ designId, userId });
    const uploaded = await this.gcsRepository.uploadBinary({
      content,
      contentType: 'model/gltf-binary',
      objectPath,
      metadata: {
        designId,
        userId,
        source: 'studio-edited-model',
      },
    });

    return this.designRepository.updateEditedAsset({
      designId,
      editedAssetUriGlb: uploaded.gcsUri,
      editedAssetUpdatedAt: new Date(),
    });
  }

  async clearEditedModel(userId: string, designId: string) {
    const design = await this.designRepository.getOwned(userId, designId);
    if (!design) {
      throw new NotFoundError('design not found');
    }

    const objectPath = buildEditedModelObjectPath({ designId, userId });
    await this.gcsRepository.deleteByPrefix({ prefix: objectPath });

    return this.designRepository.updateEditedAsset({
      designId,
      editedAssetUriGlb: null,
      editedAssetUpdatedAt: null,
    });
  }

  async updateMetadata(userId: string, designId: string, displayName: string) {
    const normalizedName = normalizeRequiredFormValue(displayName, {
      field: 'displayName',
      maxChars: DEFAULT_FORM_MAX_CHARS,
      errorFactory: (message) => new ValidationError(message),
    });

    const design = await this.designRepository.getOwned(userId, designId);
    if (!design) {
      throw new NotFoundError('design not found');
    }

    const updated = await this.designRepository.updateDisplayName({
      designId,
      displayName: normalizedName,
    });
    return updated;
  }

  async reportPreviewResult(
    userId: string,
    designId: string,
    input: {
      status: 'succeeded' | 'failed';
      errorMessage?: string;
    },
  ) {
    const design = await this.designRepository.getOwned(userId, designId);
    if (!design) {
      throw new NotFoundError('design not found');
    }

    const latestDesignJob = await this.designJobRepository.findLatestByDesignOwned({
      userId,
      designId,
    });
    if (!latestDesignJob || latestDesignJob.status !== 'succeeded') {
      return;
    }

    if (input.status === 'succeeded') {
      await this.designRepository.updatePreview({
        designId,
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

    await this.designRepository.updatePreview({
      designId,
      previewStatus: 'failed',
      previewError: normalizedErrorMessage,
    });
  }

  async delete(userId: string, designId: string) {
    const design = await this.designRepository.getOwned(userId, designId);
    if (!design) {
      throw new NotFoundError('design not found');
    }
    await this.designRepository.delete(designId);
  }

  async create(input: CreateDesignInput): Promise<Design> {
    const displayName = normalizeRequiredFormValue(input.displayName, {
      field: 'displayName',
      maxChars: DEFAULT_FORM_MAX_CHARS,
      errorFactory: (message) => new ValidationError(message),
    });
    const project = await this.projectRepository.getOwned(
      input.projectId,
      input.ownerId ?? 'default',
    );
    if (!project) {
      throw new NotFoundError('project not found');
    }

    const created = await this.designRepository.create({
      projectId: input.projectId,
      displayName,
    });

    return created;
  }

  private resolveAssetUri(design: { assetUriTs?: string | null }, type: 'ts') {
    switch (type) {
      case 'ts':
        return design.assetUriTs ?? null;
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
