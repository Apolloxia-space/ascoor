import { paths } from '@shared/constants/paths';
import { LandingHeaderActions } from './landing-header-actions';

export function LandingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <a
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          href={paths.home}
        >
          <span>Ascoor</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a className="transition hover:text-foreground" href={`${paths.home}#workflow`}>
            Workflow
          </a>
          <a className="transition hover:text-foreground" href={`${paths.home}#generative-design`}>
            Studio
          </a>
          <a className="transition hover:text-foreground" href={paths.pricing}>
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2 text-sm">
          <LandingHeaderActions />
        </div>
      </div>
    </header>
  );
}
