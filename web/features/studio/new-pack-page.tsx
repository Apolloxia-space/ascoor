'use client';

import { useState } from 'react';
import { Home, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { NewPackForm } from './components/new-pack-form';
import { paths } from '@/shared/constants/paths';
import { useStudioStore } from './stores/use-studio-store';
import { StudioHeader } from './components/studio-header';
import { WorkspaceListDialog } from './components/dialogs/workspace-list-dialog';
import { Button } from '@/shared/components/ui/button';
import { buildStudioPath } from './lib/paths';

export function NewPackPage() {
  const router = useRouter();
  const { status } = useAuthStore();
  const workspaceMenuOpen = useStudioStore((state) => state.workspaceMenuOpen);
  const setWorkspaceMenuOpen = useStudioStore((state) => state.setWorkspaceMenuOpen);
  const setWorkspace = useStudioStore((state) => state.setWorkspace);
  const clearWorkspace = useStudioStore((state) => state.clearWorkspace);
  const [workspaceListDialogOpen, setWorkspaceListDialogOpen] = useState(false);

  const handleSelectWorkspace = (id: string, name: string) => {
    setWorkspace(id, name);
    router.push(buildStudioPath(id));
  };

  const handleCloseWorkspace = () => {
    clearWorkspace();
    router.push(paths.studio);
  };

  if (status !== 'authenticated') {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <WorkspaceListDialog
        open={workspaceListDialogOpen}
        onOpenChange={setWorkspaceListDialogOpen}
        onSelectWorkspace={handleSelectWorkspace}
        onDeleteCurrentWorkspace={handleCloseWorkspace}
      />
      <StudioHeader
        workspaceMenuOpen={workspaceMenuOpen}
        onWorkspaceMenuChange={setWorkspaceMenuOpen}
        onSelectWorkspace={handleSelectWorkspace}
        onCloseWorkspace={handleCloseWorkspace}
        onOpenWorkspaceManager={() => setWorkspaceListDialogOpen(true)}
        showBrand
        workspaceMenuRightSlot={
          <Button asChild type="button" variant="ghost" size="icon">
            <a href={paths.studio} aria-label="Studio home">
              <Home className="size-5" />
            </a>
          </Button>
        }
        userMenuLeftSlot={
          <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex">
            <a href={paths.settingsAccount} aria-label="Settings">
              <Settings className="size-5" />
            </a>
          </Button>
        }
      />
      <main className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-6 md:px-6 md:py-8">
        <div className="flex min-h-0 w-full max-w-6xl flex-col gap-6 md:gap-8">
          <section className="px-1 py-1">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Create asset pack
              </h1>
            </div>
          </section>
          <div className="flex min-h-0 flex-1">
            <NewPackForm layout="page" />
          </div>
        </div>
      </main>
    </div>
  );
}
