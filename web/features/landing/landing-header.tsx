import { paths } from '@shared/constants/paths';
import { LandingHeaderActions } from './landing-header-actions';

export function LandingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#dce8dc]/80 bg-[#f7fbf7]/88 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <a
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[#233226]"
          href={paths.home}
        >
          <span>Ascoor</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-[#5c6f61] md:flex">
          <a className="transition hover:text-[#233226]" href={`${paths.home}#use-cases`}>
            Product
          </a>
          <a className="transition hover:text-[#233226]" href={paths.pricing}>
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
