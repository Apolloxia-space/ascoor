import { paths } from '@shared/constants/paths';

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 bg-background py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="text-lg font-semibold">Ascoor</div>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <a className="hover:text-foreground" href={paths.pricing}>
            Pricing
          </a>
          <a className="hover:text-foreground" href={paths.terms}>
            Terms
          </a>
          <a className="hover:text-foreground" href={paths.privacy}>
            Privacy
          </a>
          <a className="hover:text-foreground" href={paths.commerceDisclosure}>
            Commercial Disclosure
          </a>
        </div>
      </div>
    </footer>
  );
}
