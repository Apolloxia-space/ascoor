import type { Metadata } from 'next';
import Image from 'next/image';
import {
  ArrowRight,
  Boxes,
  Download,
  FolderKanban,
  Printer,
  SlidersHorizontal,
  Sparkles,
  View,
} from 'lucide-react';
import { HeroSignupCard } from '@/features/landing/hero-signup-card';
import { HeroAstronautViewer } from '@/features/landing/hero-astronaut-viewer';
import { PlanCTAButton } from '@/features/landing/plan-cta-button';
import { LandingFooter } from '@/features/landing/landing-footer';
import { LandingHeader } from '@/features/landing/landing-header';
import { PlanInclusions } from '@/features/plan/components/plan-inclusions';
import { planDefinitions } from '@/features/plan/plan-definitions';
import { defaultDescription, defaultOgImagePath } from '@shared/constants/seo';
import { paths } from '@shared/constants/paths';

export const metadata: Metadata = {
  title: '3D Design Studio',
  description: defaultDescription,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '3D Design Studio',
    description: defaultDescription,
    url: '/',
    images: [{ url: defaultOgImagePath, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '3D Design Studio',
    description: defaultDescription,
    images: [defaultOgImagePath],
  },
};

const workflowSteps = [
  {
    step: '01',
    icon: Sparkles,
    eyebrow: 'Create',
    title: 'Generate the astronaut from a prompt',
    description: '',
    sampleLabel: 'Create Result',
    sample:
      'You start in Create mode with a prompt for a floating astronaut. The first draft comes out with the head rotated 90 degrees.',
    viewerRotationOffset: -0.48 + Math.PI / 6,
    headYawOffset: Math.PI / 2,
  },
  {
    step: '02',
    icon: SlidersHorizontal,
    eyebrow: 'Edit',
    title: 'Fix the head orientation in Edit mode',
    description: '',
    sampleLabel: 'Edit Action',
    sample:
      'You move into Edit mode, select the head section, and rotate it back into the correct forward-facing pose.',
    viewerRotationOffset: 0.08,
    headYawOffset: 0,
  },
  {
    step: '03',
    icon: Download,
    eyebrow: 'Export',
    title: 'Save and export the corrected model',
    description: '',
    sampleLabel: 'Final Output',
    sample:
      'With the head fixed, you save the edited astronaut and export the corrected model for downstream use.',
    viewerRotationOffset: 0.62,
    headYawOffset: 0,
  },
];

const features = [
  {
    icon: FolderKanban,
    title: 'Project-based workflow',
    description: 'Switch between projects, manage design history, and keep generated drafts organized.',
  },
  {
    icon: Boxes,
    title: 'Structure-aware editing',
    description:
      'Inspect the hierarchy, focus the full model or a single node, and adjust transforms from Edit mode.',
  },
  {
    icon: View,
    title: 'Browser viewer with multiple modes',
    description:
      'Review the model in Solid, Shaded, Wireframe, Translucent, and X-Ray modes without leaving the studio.',
  },
  {
    icon: Download,
    title: 'Exportable outputs',
    description:
      'Download GLB, STL, and JavaScript assets for downstream 3D workflows after generation or editing.',
  },
];

type LandingPlan = {
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

const plans: Array<LandingPlan> = [
  {
    ...planDefinitions.pro,
    cta: 'Get Pro',
    highlight: true,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-[-200px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[color:var(--brand-500-60)] blur-[140px]" />
        <div className="pointer-events-none absolute right-[-120px] top-[120px] h-[360px] w-[360px] rounded-full bg-[color:var(--accent-purple)]/20 blur-[140px]" />
        <LandingHeader />

        <section className="w-full">
          <div className="relative isolate overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.16)),radial-gradient(circle_at_top,rgba(218,154,157,0.24),transparent_48%)]">
            <div className="relative min-h-[560px] md:min-h-[680px] lg:min-h-[760px]">
              <div className="absolute inset-0">
                <div className="relative h-full w-full">
                  <HeroAstronautViewer className="absolute inset-0" />
                </div>
              </div>
              <div className="relative z-10 min-h-[560px] text-center md:min-h-[680px] lg:min-h-[760px]">
                <div className="absolute inset-x-0 bottom-0 flex justify-center px-4 pb-2 sm:px-8 sm:pb-4 lg:px-14 lg:pb-6">
                  <HeroSignupCard overlay className="w-full max-w-sm" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="workflow" className="bg-muted/40 py-20">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              How It Works
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
              How Ascoor builds this astronaut
            </h2>
          </div>
          <div className="mt-10 overflow-hidden rounded-[36px] border border-border/60 bg-card/75 shadow-[var(--shadow-card)]">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)_72px_minmax(0,1fr)]">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                const isExportStep = step.step === '03';
                return (
                  <div key={step.step} className="contents">
                    {index > 0 ? (
                      <div className="hidden items-center justify-center lg:flex">
                        <div className="flex size-11 items-center justify-center rounded-full border border-border/60 bg-background/85 text-primary shadow-sm">
                          <ArrowRight className="size-4" />
                        </div>
                      </div>
                    ) : null}
                    <article
                      className={`relative isolate flex min-h-[480px] h-full flex-col justify-end overflow-hidden p-6 md:min-h-[540px] md:p-8 ${
                        index > 0 ? 'border-t border-border/60 lg:border-t-0' : ''
                      }`}
                    >
                      <div className="absolute inset-0">
                        {isExportStep ? (
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,rgba(52,73,94,0.16),transparent_22%),radial-gradient(circle_at_74%_34%,rgba(218,154,157,0.22),transparent_24%),linear-gradient(180deg,rgba(242,246,249,0.96),rgba(229,236,242,0.92))]">
                            <div className="absolute inset-x-4 top-8 bottom-40 sm:inset-x-6 sm:top-10 sm:bottom-36 md:inset-x-8 md:top-12 md:bottom-40">
                              <div className="flex h-full items-start justify-center pt-2 md:pt-4">
                                <div className="w-full max-w-[320px]">
                                  <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[#34495e]/72">
                                    Example downstream tools
                                  </p>
                                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    {[
                                      {
                                        label: 'Blender',
                                        icon: Boxes,
                                        logoSrc: '/logos/icons8-blender-3d.svg',
                                      },
                                      { label: '3D Print', icon: Printer },
                                    ].map((destination) => {
                                      const DestinationIcon = destination.icon;
                                      return (
                                        <div
                                          key={destination.label}
                                          className="rounded-[26px] border border-[#8ca2b6]/55 bg-white/96 px-3 py-4 shadow-[0_20px_40px_rgba(15,23,42,0.10)] sm:px-4 sm:py-5"
                                        >
                                          <div className="flex flex-col items-center text-center">
                                            <div className="flex size-10 items-center justify-center rounded-full bg-[#34495e]/10 text-[#243545] sm:size-12">
                                              {destination.logoSrc ? (
                                                <Image
                                                  src={destination.logoSrc}
                                                  alt=""
                                                  width={24}
                                                  height={24}
                                                  className="size-6 object-contain"
                                                />
                                              ) : (
                                                <DestinationIcon className="size-5" />
                                              )}
                                            </div>
                                            <p className="mt-2 text-[13px] font-semibold leading-snug text-[#243545] sm:mt-3 sm:text-sm">
                                              {destination.label}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <HeroAstronautViewer
                              className="absolute inset-0"
                              variant="compact"
                              autoRotate={false}
                              rotationOffset={step.viewerRotationOffset}
                              headYawOffset={step.headYawOffset}
                            />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.38),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.68),rgba(255,255,255,0.14)_42%,rgba(255,255,255,0.88))]" />
                          </>
                        )}
                      </div>
                      <div className="relative z-10 flex justify-center">
                        <div className="max-w-sm rounded-[28px] border border-white/45 bg-background/68 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-[12px]">
                          <div className="flex items-center gap-4">
                            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                              <Icon className="size-5" />
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                              {step.eyebrow}
                            </p>
                          </div>
                          <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                          {step.description ? (
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                              {step.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="generative-design" className="py-20">
        <div className="mx-auto w-full max-w-5xl px-4">
          <div className="space-y-6 text-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Inside The Studio
              </p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
                What the app supports today
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-border/60 bg-card/70 p-4 text-left transition hover:shadow-[var(--shadow-card-active)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{feature.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="plans" className="py-20">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Pricing</p>
            <h2 className="text-3xl font-semibold md:text-4xl">One plan, full Studio access</h2>
            <a className="text-sm text-primary hover:underline" href={paths.pricing}>
              View full pricing page
            </a>
          </div>
          <div className="mx-auto mt-12 grid max-w-xl gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex h-full flex-col rounded-3xl border border-border/60 bg-card/80 p-6 ${
                  plan.highlight ? 'shadow-[var(--shadow-card-active)]' : ''
                }`}
              >
                <h3 className="text-xl font-semibold">{plan.name}</h3>
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
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Monthly subscriptions. Excl. tax.
          </p>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
