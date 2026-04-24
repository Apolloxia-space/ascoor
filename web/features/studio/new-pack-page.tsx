'use client';

import { ArrowLeft, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { signOutUser } from '@/features/auth/use-auth-init';
import { NewPackForm } from './components/new-pack-form';
import { AppHeader } from '@/shared/components/layout/app-header';
import { Button } from '@/shared/components/ui/button';
import { paths } from '@/shared/constants/paths';

export function NewPackPage() {
  const router = useRouter();
  const { user, status } = useAuthStore();

  if (status !== 'authenticated') {
    return <div className="min-h-screen bg-[color:var(--background-base)]" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--background-base)]">
      <AppHeader
        projectMenuOpen={false}
        onProjectMenuChange={() => {}}
        projects={[]}
        onSelectProject={() => {}}
        onCloseProject={() => router.push(paths.studio)}
        showProjectMenu={false}
        showBrand
        brandHref={paths.studio}
        projectMenuRightSlot={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg"
            onClick={() => router.push(paths.studio)}
          >
            <ArrowLeft className="size-4" />
            Studio
          </Button>
        }
        userMenuLeftSlot={
          <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex">
            <a href={paths.settingsAccount} aria-label="Settings">
              <Settings className="size-5" />
            </a>
          </Button>
        }
        user={user}
        authStatus={status}
        showSignIn={false}
        onSignOut={signOutUser}
      />
      <main className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-6 md:px-6 md:py-8">
        <div className="flex w-full max-w-6xl min-h-0 flex-col gap-6 md:gap-8">
          <section className="px-1 py-1">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
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
