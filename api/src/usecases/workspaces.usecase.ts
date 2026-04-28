import { NotFoundError, ValidationError } from './errors';
import {
  buildWorkspaceAssetPacks,
  buildWorkspaceThumbnailObjectPath,
  type Workspace,
  type WorkspaceAssetPacks,
} from '../entities/workspace';
import type {
  WorkspaceListCursor,
  WorkspaceRepository,
} from '../repositories/postgres/workspace.repository';
import type { IAssetPackRepository, IGcsRepository } from '../repositories/interfaces';
import type { UsersUsecase } from './users.usecase';
import { DEFAULT_FORM_MAX_CHARS } from '../constants/form-limits';
import { normalizeRequiredFormValue } from '../utils/form';

export interface CreateWorkspaceInput {
  name: string;
  ownerId?: string;
  ownerEmail?: string | null;
  ownerName?: string | null;
}

export interface UpdateWorkspaceInput {
  workspaceId: string;
  name: string;
  ownerId: string;
}

export interface DeleteWorkspaceInput {
  workspaceId: string;
  ownerId: string;
}

export interface ListWorkspacesPaginatedInput {
  ownerId: string;
  limit?: number;
  cursor?: string | null;
  query?: string | null;
}

export interface ListWorkspacesPaginatedOutput {
  data: Array<Workspace>;
  nextCursor: string | null;
}

export interface EnsureDefaultWorkspaceInput {
  ownerId: string;
  ownerEmail?: string | null;
  ownerName?: string | null;
}

const PROJECTS_PAGE_LIMIT_DEFAULT = 20;
const PROJECTS_PAGE_LIMIT_MAX = 50;
const PROJECTS_CURSOR_SEPARATOR = '|';
const DEFAULT_PROJECT_NAME = 'default';
const MAX_PROJECT_THUMBNAIL_BYTES = 2 * 1024 * 1024;

const encodeWorkspacesCursor = (cursor: WorkspaceListCursor): string =>
  `${cursor.updatedAt.toISOString()}${PROJECTS_CURSOR_SEPARATOR}${cursor.id}`;

const decodeWorkspacesCursor = (value: string): WorkspaceListCursor => {
  const separatorIndex = value.indexOf(PROJECTS_CURSOR_SEPARATOR);
  if (separatorIndex <= 0) {
    throw new ValidationError('Invalid workspaces cursor.');
  }

  const updatedAtRaw = value.slice(0, separatorIndex);
  const id = value.slice(separatorIndex + 1);
  if (!id) {
    throw new ValidationError('Invalid workspaces cursor.');
  }

  const updatedAt = new Date(updatedAtRaw);
  if (Number.isNaN(updatedAt.getTime())) {
    throw new ValidationError('Invalid workspaces cursor.');
  }

  return { updatedAt, id };
};

export class WorkspacesUsecase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly assetPackRepository: IAssetPackRepository,
    private readonly gcsRepository: IGcsRepository,
    private readonly usersUsecase: UsersUsecase,
  ) {}

  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    if (!input.ownerId) throw new NotFoundError('userId is required');
    const name = normalizeRequiredFormValue(input.name, {
      field: 'name',
      maxChars: DEFAULT_FORM_MAX_CHARS,
      errorFactory: (message) => new ValidationError(message),
    });
    await this.ensureOwnerExists({
      ownerId: input.ownerId,
      ownerEmail: input.ownerEmail,
      ownerName: input.ownerName,
    });
    return this.workspaceRepository.create({
      ownerId: input.ownerId,
      name,
    });
  }

  async ensureDefaultWorkspace(input: EnsureDefaultWorkspaceInput): Promise<void> {
    const existingUser = await this.usersUsecase.get(input.ownerId);
    if (existingUser) {
      return;
    }

    await this.usersUsecase.create({
      id: input.ownerId,
      email: input.ownerEmail,
      displayName: input.ownerName,
    });

    await this.workspaceRepository.create({
      ownerId: input.ownerId,
      name: DEFAULT_PROJECT_NAME,
    });
  }

  async ensureWorkspace(workspaceId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.get(workspaceId);
    if (!workspace) throw new NotFoundError('workspace not found');
    return workspace;
  }

  async list(ownerId: string): Promise<Array<Workspace>> {
    return this.workspaceRepository.listByOwner(ownerId);
  }

  async listPaginated(input: ListWorkspacesPaginatedInput): Promise<ListWorkspacesPaginatedOutput> {
    const limit = input.limit ?? PROJECTS_PAGE_LIMIT_DEFAULT;
    if (!Number.isInteger(limit) || limit < 1 || limit > PROJECTS_PAGE_LIMIT_MAX) {
      throw new ValidationError(
        `limit must be an integer between 1 and ${PROJECTS_PAGE_LIMIT_MAX}.`,
      );
    }

    const cursor = input.cursor ? decodeWorkspacesCursor(input.cursor) : null;
    const query = input.query?.trim() ?? '';

    const page = await this.workspaceRepository.listByOwnerPage({
      ownerId: input.ownerId,
      limit,
      cursor,
      query: query.length > 0 ? query : null,
    });

    return {
      data: page.items,
      nextCursor: page.nextCursor ? encodeWorkspacesCursor(page.nextCursor) : null,
    };
  }

  async listAssetPacks(workspaceId: string, ownerId: string): Promise<WorkspaceAssetPacks> {
    const workspace = await this.workspaceRepository.getOwned(workspaceId, ownerId);
    if (!workspace) throw new NotFoundError('workspace not found');
    const assetPacks = await this.assetPackRepository.list(workspaceId);

    return buildWorkspaceAssetPacks({
      workspaceId: workspace.id,
      assetPacks,
    });
  }

  async updateName(input: UpdateWorkspaceInput): Promise<Workspace> {
    const name = normalizeRequiredFormValue(input.name, {
      field: 'name',
      maxChars: DEFAULT_FORM_MAX_CHARS,
      errorFactory: (message) => new ValidationError(message),
    });
    const owned = await this.workspaceRepository.getOwned(input.workspaceId, input.ownerId);
    if (!owned) throw new NotFoundError('workspace not found');
    return this.workspaceRepository.updateName({
      workspaceId: input.workspaceId,
      name,
    });
  }

  async delete(input: DeleteWorkspaceInput): Promise<Workspace> {
    const owned = await this.workspaceRepository.getOwned(input.workspaceId, input.ownerId);
    if (!owned) throw new NotFoundError('workspace not found');
    return this.workspaceRepository.delete(input.workspaceId);
  }

  async saveThumbnail(input: {
    ownerId: string;
    workspaceId: string;
    content: Uint8Array;
    contentType: string;
  }): Promise<Workspace> {
    const workspace = await this.workspaceRepository.getOwned(input.workspaceId, input.ownerId);
    if (!workspace) throw new NotFoundError('workspace not found');
    if (input.content.byteLength === 0) {
      throw new ValidationError('Thumbnail content is empty.');
    }
    if (input.content.byteLength > MAX_PROJECT_THUMBNAIL_BYTES) {
      throw new ValidationError('Thumbnail must be 2 MB or smaller.');
    }
    if (input.contentType !== 'image/webp') {
      throw new ValidationError('Thumbnail must be image/webp.');
    }

    const objectPath = buildWorkspaceThumbnailObjectPath({
      ownerId: input.ownerId,
      workspaceId: input.workspaceId,
    });
    const uploaded = await this.gcsRepository.uploadBinary({
      content: input.content,
      contentType: input.contentType,
      objectPath,
      metadata: {
        workspaceId: input.workspaceId,
        ownerId: input.ownerId,
        source: 'workspace-thumbnail',
      },
    });

    return this.workspaceRepository.updateThumbnailAssetUri({
      workspaceId: input.workspaceId,
      thumbnailAssetUri: uploaded.gcsUri,
    });
  }

  async getThumbnail(input: { ownerId: string; workspaceId: string }) {
    const workspace = await this.workspaceRepository.getOwned(input.workspaceId, input.ownerId);
    if (!workspace) throw new NotFoundError('workspace not found');
    if (!workspace.thumbnailAssetUri) {
      throw new NotFoundError('thumbnail not found');
    }

    const data = await this.gcsRepository.downloadBinary({ uri: workspace.thumbnailAssetUri });
    if (!data) {
      throw new NotFoundError('thumbnail not found');
    }

    return {
      mime: 'image/webp',
      data,
    };
  }

  private async ensureOwnerExists(input: EnsureDefaultWorkspaceInput): Promise<void> {
    const existingUser = await this.usersUsecase.get(input.ownerId);
    if (existingUser) {
      return;
    }
    await this.usersUsecase.create({
      id: input.ownerId,
      email: input.ownerEmail,
      displayName: input.ownerName,
    });
  }
}
