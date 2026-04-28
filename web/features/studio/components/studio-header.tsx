'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { AppHeader } from '@shared/components/layout/app-header';
import { paths } from '@/shared/constants/paths';
import { useStudioStore } from '../stores/use-studio-store';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { signOutUser } from '@/features/auth/use-auth-init';
import { getWorkspaceGenerationStatuses } from '../lib/workspace-generation-status';
import { useListWorkspaces } from '@/shared/api/generated/client';

type StudioHeaderProps = {
  workspaceMenuOpen: boolean;
  onWorkspaceMenuChange: (open: boolean) => void;
  onSelectWorkspace: (id: string, name: string) => void;
  onCloseWorkspace: () => void;
  onOpenWorkspaceManager?: () => void;
  workspacesLoading?: boolean;
  workspacesRefreshing?: boolean;
  workspaceMenuRightSlot?: ReactNode;
  userMenuLeftSlot?: ReactNode;
  hideWorkspaceMenuOnMobile?: boolean;
  workspaceNameOverride?: string | null;
  showBrand?: boolean;
  showWorkspaceMenu?: boolean;
};

export function StudioHeader({
  workspaceMenuOpen,
  onWorkspaceMenuChange,
  onSelectWorkspace,
  onCloseWorkspace,
  onOpenWorkspaceManager,
  workspacesLoading,
  workspacesRefreshing,
  workspaceMenuRightSlot,
  userMenuLeftSlot,
  hideWorkspaceMenuOnMobile,
  workspaceNameOverride,
  showBrand = false,
  showWorkspaceMenu = true,
}: StudioHeaderProps) {
  const { workspaceId, workspaceName, workspaces, pendingPackGenerations, setWorkspaces, setWorkspace, clearWorkspace } =
    useStudioStore();
  const { user, status } = useAuthStore();
  const workspacesQuery = useListWorkspaces(
    { limit: 20 },
    {
      query: {
        enabled: status === 'authenticated',
        staleTime: 60_000,
      },
    },
  );
  const workspaceItems = workspacesQuery.data?.status === 200 ? workspacesQuery.data.data.items : [];
  const workspaceGenerationStatuses = useMemo(
    () => getWorkspaceGenerationStatuses(pendingPackGenerations),
    [pendingPackGenerations],
  );
  const resolvedWorkspacesLoading =
    workspacesLoading ?? (status === 'authenticated' && workspacesQuery.isPending);
  const resolvedWorkspacesRefreshing =
    workspacesRefreshing ??
    (status === 'authenticated' && workspacesQuery.isFetching && !workspacesQuery.isPending);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!workspacesQuery.isSuccess) return;

    const nextWorkspaces = workspaceItems.map((workspace) => ({ id: workspace.id, name: workspace.name }));
    const sameWorkspaces =
      nextWorkspaces.length === workspaces.length &&
      nextWorkspaces.every(
        (workspace, index) =>
          workspaces[index]?.id === workspace.id && workspaces[index]?.name === workspace.name,
      );

    if (!sameWorkspaces) {
      setWorkspaces(nextWorkspaces);
    }

    if (workspaceItems.length === 0) {
      if (workspaceId || workspaceName) {
        clearWorkspace();
      }
      return;
    }

    if (!workspaceId) return;

    const current = workspaceItems.find((workspace) => workspace.id === workspaceId) ?? null;
    if (current && workspaceName !== current.name) {
      setWorkspace(current.id, current.name);
    }
  }, [
    status,
    workspacesQuery.isSuccess,
    workspaceItems,
    workspaces,
    workspaceId,
    workspaceName,
    setWorkspaces,
    setWorkspace,
    clearWorkspace,
  ]);

  return (
    <AppHeader
      workspaceMenuOpen={workspaceMenuOpen}
      onWorkspaceMenuChange={onWorkspaceMenuChange}
      workspaceName={workspaceNameOverride ?? workspaceName}
      workspaceId={workspaceId}
      workspaces={workspaces}
      workspaceGenerationStatuses={workspaceGenerationStatuses}
      onSelectWorkspace={onSelectWorkspace}
      onCloseWorkspace={onCloseWorkspace}
      onOpenWorkspaceManager={onOpenWorkspaceManager}
      workspacesLoading={resolvedWorkspacesLoading}
      workspacesRefreshing={resolvedWorkspacesRefreshing}
      hideWorkspaceMenuOnMobile={hideWorkspaceMenuOnMobile}
      showBrand={showBrand}
      brandHref={paths.studio}
      showWorkspaceMenu={showWorkspaceMenu}
      workspaceMenuRightSlot={workspaceMenuRightSlot}
      userMenuLeftSlot={userMenuLeftSlot}
      user={user}
      authStatus={status}
      showSignIn={false}
      onSignOut={signOutUser}
    />
  );
}
