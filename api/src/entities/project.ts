import type { Project as PrismaProject } from '../generated/prisma/client';
import { getEditedModelSnapshot, type Design } from './design';

// Project entity (re-export from Prisma for use in usecases)
export type Project = PrismaProject;

export interface ProjectDesignSummary {
  id: string;
  projectId: string;
  displayName: string;
  previewStatus: Design['previewStatus'];
  assetUriTs: string | null;
  editedAssetUriGlb: string | null;
  previewError: string | null;
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
    previewStatus: design.previewStatus,
    assetUriTs: design.assetUriTs ?? null,
    previewError: design.previewError ?? null,
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
  }));

  return {
    projectId: params.projectId,
    designs: designSummaries,
  };
}
