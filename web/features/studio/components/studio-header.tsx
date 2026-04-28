'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { AppHeader } from '@shared/components/layout/app-header';
import { paths } from '@/shared/constants/paths';
import { useStudioStore } from '../stores/use-studio-store';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { signOutUser } from '@/features/auth/use-auth-init';
import { getWorkspaceGenerationStatuses } from '../lib/workspace-generation-status';
import { useListProjects } from '@/shared/api/generated/client';

type StudioHeaderProps = {
  projectMenuOpen: boolean;
  onProjectMenuChange: (open: boolean) => void;
  onSelectProject: (id: string, name: string) => void;
  onCloseProject: () => void;
  onOpenProjectManager?: () => void;
  projectsLoading?: boolean;
  projectsRefreshing?: boolean;
  projectMenuRightSlot?: ReactNode;
  userMenuLeftSlot?: ReactNode;
  hideProjectMenuOnMobile?: boolean;
  projectNameOverride?: string | null;
  showBrand?: boolean;
  showProjectMenu?: boolean;
};

export function StudioHeader({
  projectMenuOpen,
  onProjectMenuChange,
  onSelectProject,
  onCloseProject,
  onOpenProjectManager,
  projectsLoading,
  projectsRefreshing,
  projectMenuRightSlot,
  userMenuLeftSlot,
  hideProjectMenuOnMobile,
  projectNameOverride,
  showBrand = false,
  showProjectMenu = true,
}: StudioHeaderProps) {
  const { projectId, projectName, projects, pendingDesigns, setProjects, setProject, clearProject } =
    useStudioStore();
  const { user, status } = useAuthStore();
  const projectsQuery = useListProjects(
    { limit: 20 },
    {
      query: {
        enabled: status === 'authenticated',
        staleTime: 60_000,
      },
    },
  );
  const projectItems = projectsQuery.data?.status === 200 ? projectsQuery.data.data.items : [];
  const projectGenerationStatuses = useMemo(
    () => getWorkspaceGenerationStatuses(pendingDesigns),
    [pendingDesigns],
  );
  const resolvedProjectsLoading =
    projectsLoading ?? (status === 'authenticated' && projectsQuery.isPending);
  const resolvedProjectsRefreshing =
    projectsRefreshing ??
    (status === 'authenticated' && projectsQuery.isFetching && !projectsQuery.isPending);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!projectsQuery.isSuccess) return;

    const nextProjects = projectItems.map((project) => ({ id: project.id, name: project.name }));
    const sameProjects =
      nextProjects.length === projects.length &&
      nextProjects.every(
        (project, index) =>
          projects[index]?.id === project.id && projects[index]?.name === project.name,
      );

    if (!sameProjects) {
      setProjects(nextProjects);
    }

    if (projectItems.length === 0) {
      if (projectId || projectName) {
        clearProject();
      }
      return;
    }

    if (!projectId) return;

    const current = projectItems.find((project) => project.id === projectId) ?? null;
    if (current && projectName !== current.name) {
      setProject(current.id, current.name);
    }
  }, [
    status,
    projectsQuery.isSuccess,
    projectItems,
    projects,
    projectId,
    projectName,
    setProjects,
    setProject,
    clearProject,
  ]);

  return (
    <AppHeader
      projectMenuOpen={projectMenuOpen}
      onProjectMenuChange={onProjectMenuChange}
      projectName={projectNameOverride ?? projectName}
      projectId={projectId}
      projects={projects}
      projectGenerationStatuses={projectGenerationStatuses}
      onSelectProject={onSelectProject}
      onCloseProject={onCloseProject}
      onOpenProjectManager={onOpenProjectManager}
      projectsLoading={resolvedProjectsLoading}
      projectsRefreshing={resolvedProjectsRefreshing}
      hideProjectMenuOnMobile={hideProjectMenuOnMobile}
      showBrand={showBrand}
      brandHref={paths.studio}
      showProjectMenu={showProjectMenu}
      projectMenuRightSlot={projectMenuRightSlot}
      userMenuLeftSlot={userMenuLeftSlot}
      user={user}
      authStatus={status}
      showSignIn={false}
      onSignOut={signOutUser}
    />
  );
}
