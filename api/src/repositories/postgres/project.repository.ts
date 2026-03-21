import type { Prisma, PrismaClient, Project } from '../../generated/prisma/client';

export type ProjectListCursor = {
  updatedAt: Date;
  id: string;
};

export type ListByOwnerPageParams = {
  ownerId: string;
  limit: number;
  cursor?: ProjectListCursor | null;
  query?: string | null;
};

export type ListByOwnerPageResult = {
  items: Array<Project>;
  nextCursor: ProjectListCursor | null;
};

export interface ProjectRepository {
  get(id: string): Promise<Project | null>;
  listByOwner(ownerId: string): Promise<Array<Project>>;
  listByOwnerPage(params: ListByOwnerPageParams): Promise<ListByOwnerPageResult>;
  getOwned(projectId: string, ownerId: string): Promise<Project | null>;
  updateName(params: { projectId: string; name: string }): Promise<Project>;
  delete(projectId: string): Promise<Project>;
  create(params: { ownerId: string; name: string }): Promise<Project>;
}

export class ProjectRepositoryPostgres implements ProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  get(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  listByOwner(ownerId: string): Promise<Array<Project>> {
    return this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listByOwnerPage(params: ListByOwnerPageParams): Promise<ListByOwnerPageResult> {
    const { ownerId, limit, cursor, query } = params;
    const normalizedQuery = query?.trim() ?? '';
    const baseWhere: Prisma.ProjectWhereInput = {
      ownerId,
      ...(normalizedQuery
        ? {
            name: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const paginationWhere: Prisma.ProjectWhereInput | undefined = cursor
      ? {
          OR: [
            {
              updatedAt: {
                lt: cursor.updatedAt,
              },
            },
            {
              updatedAt: cursor.updatedAt,
              id: {
                lt: cursor.id,
              },
            },
          ],
        }
      : undefined;

    const where: Prisma.ProjectWhereInput = paginationWhere
      ? {
          AND: [baseWhere, paginationWhere],
        }
      : baseWhere;

    const rows = await this.prisma.project.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items.at(-1) ?? null;

    return {
      items,
      nextCursor: hasMore && last ? { updatedAt: last.updatedAt, id: last.id } : null,
    };
  }

  getOwned(projectId: string, ownerId: string): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: { id: projectId, ownerId },
    });
  }

  create(params: { ownerId: string; name: string }): Promise<Project> {
    return this.prisma.project.create({
      data: {
        ownerId: params.ownerId,
        name: params.name,
      },
    });
  }

  updateName(params: { projectId: string; name: string }): Promise<Project> {
    return this.prisma.project.update({
      where: { id: params.projectId },
      data: { name: params.name },
    });
  }

  delete(projectId: string): Promise<Project> {
    return this.prisma.$transaction(async (tx) => {
      await tx.designJob.deleteMany({ where: { projectId } });
      await tx.design.deleteMany({ where: { projectId } });
      return tx.project.delete({ where: { id: projectId } });
    });
  }
}
