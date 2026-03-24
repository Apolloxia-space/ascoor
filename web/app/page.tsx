import type { Metadata } from 'next';
import { FolderKanban, Printer, SlidersHorizontal, Sparkles } from 'lucide-react';
import { HeroSignupCard } from '@/features/landing/hero-signup-card';
import { PlanCTAButton } from '@/features/landing/plan-cta-button';
import { LandingFooter } from '@/features/landing/landing-footer';
import { LandingHeader } from '@/features/landing/landing-header';
import { XPostEmbed } from '@/features/landing/x-post-embed';
import { PlanInclusions } from '@/features/plan/components/plan-inclusions';
import { planDefinitions } from '@/features/plan/plan-definitions';
import { defaultDescription, defaultOgImagePath } from '@shared/constants/seo';
import { paths } from '@shared/constants/paths';

export const metadata: Metadata = {
  title: 'AI 3D Design For Fast Print Prototypes',
  description: defaultDescription,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'AI 3D Design For Fast Print Prototypes',
    description: defaultDescription,
    url: '/',
    images: [{ url: defaultOgImagePath, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 3D Design For Fast Print Prototypes',
    description: defaultDescription,
    images: [defaultOgImagePath],
  },
};

const features = [
  {
    icon: Sparkles,
    title: 'Fast first drafts from prompts',
    description:
      'Turn plain-language ideas into printable starting points when you need a stand, organizer, holder, or small fixture.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Browser edits before reprint',
    description:
      'Adjust transforms, inspect the structure tree, and fix obvious print issues without leaving the studio.',
  },
  {
    icon: Printer,
    title: 'STL export built in',
    description:
      'Export STL for slicers and printers, then keep GLB and JavaScript outputs for the rest of your 3D workflow.',
  },
  {
    icon: FolderKanban,
    title: 'Project history for fast iteration',
    description:
      'Keep each print draft, revision, and retry organized so the next fix starts from the last usable model.',
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
                <div className="relative h-full w-full overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(52,73,94,0.18),transparent_22%),radial-gradient(circle_at_76%_24%,rgba(218,154,157,0.24),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.56),rgba(255,255,255,0.14))]" />
                  <div className="absolute inset-x-4 top-18 grid gap-3 sm:inset-x-6 sm:top-20 md:inset-x-10 md:grid-cols-[1.15fr_0.85fr] md:gap-4 lg:inset-x-14">
                    <div className="overflow-hidden rounded-[28px] border border-white/35 bg-white/68 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur-[14px]">
                      <div className="flex items-center justify-between border-b border-[#8ca2b6]/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#34495e]/72 sm:px-5">
                        <span>Printed Result</span>
                        <span>Ring Stand</span>
                      </div>
                      <div className="relative h-[220px] bg-[radial-gradient(circle_at_50%_16%,rgba(255,255,255,0.98),rgba(240,245,249,0.96)_38%,rgba(228,235,241,0.92))] sm:h-[290px]">
                        <div className="absolute inset-x-8 bottom-6 h-10 rounded-full bg-[radial-gradient(circle,rgba(52,73,94,0.18),rgba(52,73,94,0.02)_62%,transparent_72%)] blur-xl" />
                        <div className="absolute bottom-10 left-1/2 h-26 w-26 -translate-x-1/2 rounded-full border-[10px] border-[#f4d7ba] bg-[#fff4e7] shadow-[0_18px_28px_rgba(36,53,69,0.10)] sm:h-34 sm:w-34 sm:border-[12px]" />
                        <div className="absolute bottom-30 left-1/2 h-22 w-4 -translate-x-1/2 rounded-full bg-[#8b5e3c] shadow-[0_8px_16px_rgba(36,53,69,0.12)] sm:bottom-36 sm:h-28" />
                        <div className="absolute bottom-46 left-1/2 h-16 w-4 -translate-x-[34px] rotate-[-24deg] rounded-full bg-[#8b5e3c] sm:bottom-58 sm:h-20" />
                        <div className="absolute bottom-46 left-1/2 h-16 w-4 translate-x-[30px] rotate-[24deg] rounded-full bg-[#8b5e3c] sm:bottom-58 sm:h-20" />
                        <div className="absolute bottom-50 left-1/2 h-15 w-4 -translate-x-[14px] rotate-[-10deg] rounded-full bg-[#8b5e3c] sm:bottom-62 sm:h-18" />
                        <div className="absolute bottom-50 left-1/2 h-15 w-4 translate-x-[10px] rotate-[10deg] rounded-full bg-[#8b5e3c] sm:bottom-62 sm:h-18" />
                        {[[-54, 88], [-24, 102], [0, 112], [26, 102], [54, 88]].map(
                          ([x, y], index) => (
                            <div
                              key={`${x}-${y}-${index}`}
                              className="absolute left-1/2 h-9 w-9 rounded-full border-[6px] border-[#f1c9d2] bg-[#fff7fa] shadow-[0_6px_12px_rgba(36,53,69,0.10)] sm:h-11 sm:w-11 sm:border-[7px]"
                              style={{
                                transform: `translateX(${x}px)`,
                                bottom: `${y}px`,
                              }}
                            />
                          ),
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 md:gap-4">
                      <div className="overflow-hidden rounded-[28px] border border-white/35 bg-white/72 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-[14px]">
                        <div className="flex items-center justify-between border-b border-[#8ca2b6]/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#34495e]/72">
                          <span>Ascoor Editor</span>
                          <span>Base Fix</span>
                        </div>
                        <div className="p-4">
                          <div className="rounded-[22px] border border-[#8ca2b6]/30 bg-[#f8fbfd] p-3">
                            <div className="flex gap-2">
                              <div className="h-2.5 w-2.5 rounded-full bg-[#da9a9d]" />
                              <div className="h-2.5 w-2.5 rounded-full bg-[#c8d7e3]" />
                              <div className="h-2.5 w-2.5 rounded-full bg-[#95a5a6]" />
                            </div>
                            <div className="mt-3 grid grid-cols-[76px_1fr] gap-3">
                              <div className="space-y-2">
                                <div className="h-10 rounded-2xl bg-white" />
                                <div className="h-10 rounded-2xl bg-white" />
                                <div className="h-10 rounded-2xl bg-white" />
                              </div>
                              <div className="relative min-h-[130px] rounded-[22px] bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.96),rgba(232,238,243,0.96)_56%,rgba(214,223,231,0.92))]">
                                <div className="absolute left-1/2 top-5 h-20 w-20 -translate-x-1/2 rounded-full border-4 border-dashed border-[#da9a9d] bg-white/60" />
                                <div className="absolute inset-x-8 bottom-7 h-2 rounded-full bg-[#34495e]/12" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="overflow-hidden rounded-[24px] border border-white/35 bg-white/72 shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-[14px]">
                          <div className="border-b border-[#8ca2b6]/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#34495e]/72">
                            Parts
                          </div>
                          <div className="grid h-[110px] place-items-center bg-[linear-gradient(180deg,rgba(248,251,253,0.98),rgba(234,240,245,0.95))]">
                            <div className="flex gap-2">
                              <div className="h-10 w-10 rounded-2xl bg-white shadow-sm" />
                              <div className="h-14 w-4 rounded-full bg-[#8b5e3c]" />
                              <div className="h-10 w-10 rounded-2xl bg-white shadow-sm" />
                            </div>
                          </div>
                        </div>
                        <div className="overflow-hidden rounded-[24px] border border-white/35 bg-[#34495e] text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                          <div className="border-b border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">
                            Output
                          </div>
                          <div className="flex h-[110px] flex-col justify-end bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))] p-4">
                            <div className="inline-flex w-fit rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
                              STL
                            </div>
                            <p className="mt-3 text-sm font-medium leading-relaxed">
                              Export and test the next revision.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 min-h-[560px] text-center md:min-h-[680px] lg:min-h-[760px]">
                <div className="absolute inset-x-0 bottom-0 flex justify-center px-4 pb-2 sm:px-8 sm:pb-4 lg:px-14 lg:pb-6">
                  <HeroSignupCard overlay className="w-full max-w-md" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="generative-design" className="py-20">
        <div className="mx-auto w-full max-w-5xl px-4">
          <div className="space-y-6 text-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Built For Iteration
              </p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
                What matters for print retries
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                The current studio is best when you want to get an idea out fast, inspect the
                model, fix a few key surfaces, and try another print.
              </p>
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

      <section className="bg-muted/40 py-20">
        <div className="mx-auto w-full max-w-5xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Printed With Ascoor
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
              From Prompt to Print
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              Drafted from a prompt, adjusted in the browser, and printed as a real object.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <XPostEmbed />
          </div>
        </div>
      </section>

      <section id="plans" className="py-20">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Pricing</p>
            <h2 className="text-3xl font-semibold md:text-4xl">
              One plan for prompt-to-print work
            </h2>
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
