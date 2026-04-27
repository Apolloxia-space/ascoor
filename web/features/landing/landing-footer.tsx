import { paths } from '@shared/constants/paths';

export function LandingFooter() {
  return (
    <footer className="border-t border-[#dce8dc] bg-[#f7fbf7] py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="text-lg font-semibold text-[#233226]">Ascoor</div>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-[#5c6f61]">
          <a className="hover:text-[#233226]" href={paths.pricing}>
            Pricing
          </a>
          <a className="hover:text-[#233226]" href={paths.terms}>
            Terms
          </a>
          <a className="hover:text-[#233226]" href={paths.privacy}>
            Privacy
          </a>
          <a className="hover:text-[#233226]" href={paths.commerceDisclosure}>
            Commercial Disclosure
          </a>
        </div>
      </div>
    </footer>
  );
}
