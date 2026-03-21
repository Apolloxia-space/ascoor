'use client';

import type { ReactNode } from 'react';
import { AppHeader } from '@shared/components/layout/app-header';
import { useStudioStore } from '../stores/use-studio-store';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { signOutUser } from '@/features/auth/use-auth-init';

type StudioHeaderProps = {
  projectMenuOpen: boolean;
  onProjectMenuChange: (open: boolean) => void;
  onOpenNewProject: () => void;
  onSelectProject: (id: string, name: string) => void;
  onCloseProject: () => void;
  onOpenProjectManager?: () => void;
  projectMenuRightSlot?: ReactNode;
  hideProjectMenuOnMobile?: boolean;
};

export function StudioHeader({
  projectMenuOpen,
  onProjectMenuChange,
  onOpenNewProject,
  onSelectProject,
  onCloseProject,
  onOpenProjectManager,
  projectMenuRightSlot,
  hideProjectMenuOnMobile,
}: StudioHeaderProps) {
  const { projectId, projectName, projects } = useStudioStore();
  const { user, status } = useAuthStore();

  return (
    <AppHeader
      projectMenuOpen={projectMenuOpen}
      onProjectMenuChange={onProjectMenuChange}
      onOpenNewProject={onOpenNewProject}
      projectName={projectName}
      projectId={projectId}
      projects={projects}
      onSelectProject={onSelectProject}
      onCloseProject={onCloseProject}
      onOpenProjectManager={onOpenProjectManager}
      hideProjectMenuOnMobile={hideProjectMenuOnMobile}
      showBrand={false}
      projectMenuRightSlot={projectMenuRightSlot}
      user={user}
      authStatus={status}
      showSignIn={false}
      onSignOut={signOutUser}
    />
  );
}
