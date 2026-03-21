import { NotFoundError, ValidationError } from './errors';
import { buildProjectDesigns, type Project, type ProjectDesigns } from '../entities/project';
import type {
  ProjectListCursor,
  ProjectRepository,
} from '../repositories/postgres/project.repository';
import type { IDesignRepository } from '../repositories/interfaces';
import type { UsersUsecase } from './users.usecase';
import { DEFAULT_FORM_MAX_CHARS } from '../constants/form-limits';
import { normalizeRequiredFormValue } from '../utils/form';

export interface CreateProjectInput {
  name: string;
  ownerId?: string;
  ownerEmail?: string | null;
  ownerName?: string | null;
}

export interface UpdateProjectInput {
  projectId: string;
  name: string;
  ownerId: string;
}

export interface DeleteProjectInput {
  projectId: string;
  ownerId: string;
}

export interface ListProjectsPaginatedInput {
  ownerId: string;
  limit?: number;
  cursor?: string | null;
  query?: string | null;
}

export interface ListProjectsPaginatedOutput {
  data: Array<Project>;
  nextCursor: string | null;
}

export interface EnsureDefaultProjectInput {
  ownerId: string;
  ownerEmail?: string | null;
  ownerName?: string | null;
}

const PROJECTS_PAGE_LIMIT_DEFAULT = 20;
const PROJECTS_PAGE_LIMIT_MAX = 50;
const PROJECTS_CURSOR_SEPARATOR = '|';
const DEFAULT_PROJECT_NAME = 'default';

const encodeProjectsCursor = (cursor: ProjectListCursor): string =>
  `${cursor.updatedAt.toISOString()}${PROJECTS_CURSOR_SEPARATOR}${cursor.id}`;

const decodeProjectsCursor = (value: string): ProjectListCursor => {
  const separatorIndex = value.indexOf(PROJECTS_CURSOR_SEPARATOR);
  if (separatorIndex <= 0) {
    throw new ValidationError('Invalid projects cursor.');
  }

  const updatedAtRaw = value.slice(0, separatorIndex);
  const id = value.slice(separatorIndex + 1);
  if (!id) {
    throw new ValidationError('Invalid projects cursor.');
  }

  const updatedAt = new Date(updatedAtRaw);
  if (Number.isNaN(updatedAt.getTime())) {
    throw new ValidationError('Invalid projects cursor.');
  }

  return { updatedAt, id };
};

export class ProjectsUsecase {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly designRepository: IDesignRepository,
    private readonly usersUsecase: UsersUsecase,
  ) {}

  async create(input: CreateProjectInput): Promise<Project> {
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
    return this.projectRepository.create({
      ownerId: input.ownerId,
      name,
    });
  }

  async ensureDefaultProject(input: EnsureDefaultProjectInput): Promise<void> {
    const existingUser = await this.usersUsecase.get(input.ownerId);
    if (existingUser) {
      return;
    }

    await this.usersUsecase.create({
      id: input.ownerId,
      email: input.ownerEmail,
      displayName: input.ownerName,
    });

    await this.projectRepository.create({
      ownerId: input.ownerId,
      name: DEFAULT_PROJECT_NAME,
    });
  }

  async ensureProject(projectId: string): Promise<Project> {
    const project = await this.projectRepository.get(projectId);
    if (!project) throw new NotFoundError('project not found');
    return project;
  }

  async list(ownerId: string): Promise<Array<Project>> {
    return this.projectRepository.listByOwner(ownerId);
  }

  async listPaginated(input: ListProjectsPaginatedInput): Promise<ListProjectsPaginatedOutput> {
    const limit = input.limit ?? PROJECTS_PAGE_LIMIT_DEFAULT;
    if (!Number.isInteger(limit) || limit < 1 || limit > PROJECTS_PAGE_LIMIT_MAX) {
      throw new ValidationError(
        `limit must be an integer between 1 and ${PROJECTS_PAGE_LIMIT_MAX}.`,
      );
    }

    const cursor = input.cursor ? decodeProjectsCursor(input.cursor) : null;
    const query = input.query?.trim() ?? '';

    const page = await this.projectRepository.listByOwnerPage({
      ownerId: input.ownerId,
      limit,
      cursor,
      query: query.length > 0 ? query : null,
    });

    return {
      data: page.items,
      nextCursor: page.nextCursor ? encodeProjectsCursor(page.nextCursor) : null,
    };
  }

  async listDesigns(projectId: string, ownerId: string): Promise<ProjectDesigns> {
    const project = await this.projectRepository.getOwned(projectId, ownerId);
    if (!project) throw new NotFoundError('project not found');
    const designs = await this.designRepository.list(projectId);

    return buildProjectDesigns({
      projectId: project.id,
      designs,
    });
  }

  async updateName(input: UpdateProjectInput): Promise<Project> {
    const name = normalizeRequiredFormValue(input.name, {
      field: 'name',
      maxChars: DEFAULT_FORM_MAX_CHARS,
      errorFactory: (message) => new ValidationError(message),
    });
    const owned = await this.projectRepository.getOwned(input.projectId, input.ownerId);
    if (!owned) throw new NotFoundError('project not found');
    return this.projectRepository.updateName({
      projectId: input.projectId,
      name,
    });
  }

  async delete(input: DeleteProjectInput): Promise<Project> {
    const owned = await this.projectRepository.getOwned(input.projectId, input.ownerId);
    if (!owned) throw new NotFoundError('project not found');
    return this.projectRepository.delete(input.projectId);
  }

  private async ensureOwnerExists(input: EnsureDefaultProjectInput): Promise<void> {
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
