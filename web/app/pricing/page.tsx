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
  description: 'Compare Ascoor plans and choose the best option for your 3D design workflow.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Pricing',
    description: 'Compare Ascoor plans and choose the best option for your 3D design workflow.',
    url: '/pricing',
    images: [{ url: defaultOgImagePath, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing',
    description: 'Compare Ascoor plans and choose the best option for your 3D design workflow.',
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
    ...planDefinitions.pro,
    cta: 'Start free trial',
    highlight: true,
  },
];

export default function PricingLandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Pricing</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-5xl">One plan, full access</h1>
          <p className="mt-4 text-sm text-muted-foreground md:text-base">
            Subscribe to Pro to unlock design generation, editing workflows, exports, and monthly
            usage capacity.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-xl gap-6">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex h-full flex-col rounded-3xl border border-border/60 bg-card/80 p-6 ${
                plan.highlight ? 'shadow-[var(--shadow-card-active)]' : ''
              }`}
            >
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <div className="mt-3 flex items-end gap-2">
                <div className="text-3xl font-semibold">{plan.price}</div>
                {plan.billing && (
                  <span className="text-sm text-muted-foreground">{plan.billing}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{plan.priceNote}</p>
              {plan.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              ) : null}
              <PlanInclusions
                className="mt-6"
                listClassName="space-y-3 text-sm text-muted-foreground"
                itemClassName="flex items-center gap-2 text-foreground"
                noteClassName="mt-4 text-xs text-muted-foreground"
                features={plan.features}
                limitResetNote={plan.limitResetNote}
              />
              <div className="mt-6 md:mt-auto md:pt-6">
                <PlanCTAButton
                  label={plan.cta}
                  authedPath={paths.plan}
                  className={`w-full rounded-full px-4 py-2 text-sm font-semibold ${
                    plan.highlight
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border/60 text-foreground hover:bg-muted/60'
                  }`}
                />
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          7-day free trial with card required. Then renews monthly. Excl. tax.
        </p>
      </section>
      <LandingFooter />
    </main>
  );
}
