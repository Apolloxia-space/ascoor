import type { Metadata } from 'next';

import { LandingFooter } from '@/features/landing/landing-footer';
import { LandingHeader } from '@/features/landing/landing-header';
import { PlanCTAButton } from '@/features/landing/plan-cta-button';
import { PlanInclusions } from '@/features/plan/components/plan-inclusions';
import { planDefinitions } from '@/features/plan/plan-definitions';
import { paths } from '@shared/constants/paths';
import { defaultOgImagePath } from '@shared/constants/seo';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Compare Ascoor plans for prototype game asset workflows.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Pricing',
    description: 'Compare Ascoor plans for prototype game asset workflows.',
    url: '/pricing',
    images: [{ url: defaultOgImagePath, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing',
    description: 'Compare Ascoor plans for prototype game asset workflows.',
    images: [defaultOgImagePath],
  },
};

type PricingPlan = {
  name: string;
  price: string;
  billing: string;
  priceNote: string;
  description: string;
  features: Array<string>;
  limitResetNote: string;
  cta: string;
  highlight?: boolean;
};

const pricingPlans: Array<PricingPlan> = [
  {
    ...planDefinitions.free,
    cta: 'Start free',
  },
  {
    ...planDefinitions.hobby,
    cta: 'Upgrade to Hobby',
    highlight: true,
  },
  {
    ...planDefinitions.pro,
    cta: 'Upgrade to Pro',
  },
];

export default function PricingLandingPage() {
  return (
    <main className="min-h-screen bg-[#f7fbf7] text-[#233226]">
      <LandingHeader />
      <section className="mx-auto w-full max-w-5xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Full asset packs built around one theme in minutes.
          </h1>
          <p className="mt-4 text-sm text-[#5c6f61] md:text-base">
            Create cohesive asset packs for a smoother game workflow.
          </p>
        </div>

        <div className="mx-auto mt-12 grid gap-4 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={`flex h-full flex-col rounded-lg border bg-white p-6 ${
                plan.highlight ? 'border-[#b7d8bd] shadow-[0_16px_36px_rgba(35,50,38,0.06)]' : 'border-[#dce8dc]'
              }`}
            >
              <h2 className="text-xl font-semibold text-[#233226]">{plan.name}</h2>
              <div className="mt-3 flex items-end gap-2">
                <div className="text-3xl font-semibold text-[#233226]">{plan.price}</div>
                {plan.billing && (
                  <span className="text-sm text-[#5c6f61]">{plan.billing}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-[#5c6f61]">{plan.priceNote}</p>
              {plan.description ? (
                <p className="mt-2 text-sm text-[#5c6f61]">{plan.description}</p>
              ) : null}
              <PlanInclusions
                className="mt-6"
                listClassName="space-y-3 text-sm text-[#5c6f61]"
                itemClassName="flex items-center gap-2 text-[#233226]"
                noteClassName="mt-4 text-xs text-[#5c6f61]"
                features={plan.features}
                limitResetNote={plan.limitResetNote}
              />
              <div className="mt-6 md:mt-auto md:pt-6">
                <PlanCTAButton
                  label={plan.cta}
                  authedPath={paths.plan}
                  className={`w-full rounded-md px-4 py-2 text-sm font-semibold ${
                    plan.highlight
                      ? 'bg-[#e7a8b0] text-[#233226] hover:bg-[#de959f]'
                      : 'border border-[#dce8dc] bg-white text-[#233226] hover:bg-[#f3f7f3]'
                  }`}
                />
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-[#5c6f61]">
          Credits reset monthly. Paid plans renew monthly. Taxes may apply.
        </p>
      </section>
      <LandingFooter />
    </main>
  );
}
