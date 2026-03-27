import type { Project as PrismaProject } from '../generated/prisma/client';
import { getEditedModelSnapshot, type Design } from './design';

// Project entity (re-export from Prisma for use in usecases)
export type Project = PrismaProject;

export interface ProjectDesignSummary {
  id: string;
  projectId: string;
  displayName: string;
  assetStatus: Design['assetStatus'];
  assetUriTs: string | null;
  editedAssetUriGlb: string | null;
  assetError: string | null;
  editedAssetUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDesigns {
  projectId: string;
  designs: Array<ProjectDesignSummary>;
}

export function buildProjectDesigns(params: {
  projectId: string;
  designs: Array<Design>;
}): ProjectDesigns {
  const designSummaries: Array<ProjectDesignSummary> = params.designs.map((design) => ({
    ...getEditedModelSnapshot(design),
    id: design.id,
    projectId: design.projectId,
    displayName: design.displayName,
    assetStatus: design.assetStatus,
    assetUriTs: design.assetUriTs ?? null,
    assetError: design.assetError ?? null,
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
  }));

  return {
    projectId: params.projectId,
    designs: designSummaries,
  };
}
