'use client';

import { useMemo, type ReactNode } from 'react';
import { AppHeader } from '@shared/components/layout/app-header';
import { paths } from '@/shared/constants/paths';
import { useStudioStore } from '../stores/use-studio-store';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { signOutUser } from '@/features/auth/use-auth-init';
import { getWorkspaceGenerationStatuses } from '../lib/workspace-generation-status';

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
  const { projectId, projectName, projects, pendingDesigns } = useStudioStore();
  const { user, status } = useAuthStore();
  const projectGenerationStatuses = useMemo(
    () => getWorkspaceGenerationStatuses(pendingDesigns),
    [pendingDesigns],
  );

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
      projectsLoading={projectsLoading}
      projectsRefreshing={projectsRefreshing}
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
