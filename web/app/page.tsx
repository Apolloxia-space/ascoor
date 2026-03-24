import type { Metadata } from 'next';
import {
  ArrowRight,
  Box,
  Braces,
  Layers3,
  Printer,
  Sparkles,
} from 'lucide-react';
import { HeroSignupCard } from '@/features/landing/hero-signup-card';
import { LandingFooter } from '@/features/landing/landing-footer';
import { LandingHeader } from '@/features/landing/landing-header';
import { XPostEmbed } from '@/features/landing/x-post-embed';
import { HeroAstronautViewer } from '@/features/landing/hero-astronaut-viewer';
import { PlanInclusions } from '@/features/plan/components/plan-inclusions';
import { planDefinitions } from '@/features/plan/plan-definitions';
import { defaultDescription, defaultOgImagePath } from '@shared/constants/seo';
import { paths } from '@shared/constants/paths';

export const metadata: Metadata = {
  title: 'Generate, Edit, and Export 3D in the Browser',
  description: defaultDescription,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Generate, Edit, and Export 3D in the Browser',
    description: defaultDescription,
    url: '/',
    images: [{ url: defaultOgImagePath, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Generate, Edit, and Export 3D in the Browser',
    description: defaultDescription,
    images: [defaultOgImagePath],
  },
};

const workflowPillars = [
  {
    icon: Sparkles,
    title: 'Generate the first draft',
    description: 'Start from a prompt when you need shape, not a blank file.',
  },
  {
    icon: Layers3,
    title: 'Edit in the browser',
    description: 'Inspect structure and fix the parts that matter before handoff.',
  },
  {
    icon: Braces,
    title: 'Export for the next tool',
    description: 'Move into JavaScript, GLB, or STL without rebuilding from zero.',
  },
];

const workflowTags = [
  'three.js',
  'JavaScript export',
  'GLB handoff',
  'STL output',
  'Browser editing',
  'Blender prep',
];

type StoryVisualKind = 'draft' | 'edit' | 'export';

type StorySection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  points: Array<string>;
  visual: StoryVisualKind;
};

const storySections: Array<StorySection> = [
  {
    id: 'drafts',
    eyebrow: 'Draft Fast',
    title: 'Get to a usable first model in minutes',
    description:
      'Ascoor is strongest when the goal is speed to first draft. Start from a prompt, inspect the result, and decide what to refine next.',
    points: [
      'Move from idea to 3D form without opening a heavyweight desktop workflow first.',
      'Keep each pass in project history so you can compare iterations instead of overwriting them.',
    ],
    visual: 'draft',
  },
  {
    id: 'editing',
    eyebrow: 'Refine In Browser',
    title: 'Fix structure and transforms before export',
    description:
      'The product is not just about generating assets. It gives you a lightweight edit pass so you can clean up the draft before it hits the next stage.',
    points: [
      'Inspect the structure tree to understand what was generated.',
      'Adjust transforms and obvious problems without leaving the browser.',
    ],
    visual: 'edit',
  },
  {
    id: 'exports',
    eyebrow: 'Ship The Right Format',
    title: 'Export into web, print, or handoff workflows',
    description:
      'The value is in what happens after generation. Use the same draft-to-edit flow, then export the format your workflow already expects.',
    points: [
      'JavaScript for code-first web scenes.',
      'GLB for portable 3D assets and viewer handoff.',
      'STL for rapid print prototypes.',
    ],
    visual: 'export',
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
        <div className="pointer-events-none absolute inset-x-0 top-[-220px] h-[560px] bg-[radial-gradient(circle_at_top,rgba(218,154,157,0.24),transparent_52%)]" />
        <div className="pointer-events-none absolute left-[-80px] top-[220px] h-[340px] w-[340px] rounded-full bg-[color:var(--brand-500-60)] blur-[140px]" />
        <div className="pointer-events-none absolute right-[-120px] top-[120px] h-[360px] w-[360px] rounded-full bg-[color:var(--accent-purple)]/18 blur-[140px]" />
        <LandingHeader />

        <section className="px-4 pb-16 pt-28 sm:pb-20 md:pt-32">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
                Browser-Based 3D Workflow
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
                Generate, refine, and export 3D without leaving the browser.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                Ascoor helps you get to a first 3D draft fast, fix the important parts, and hand
                off JavaScript, GLB, or STL into the workflow you already run.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-md">
              <HeroSignupCard />
            </div>

            <div className="mt-10 overflow-hidden rounded-[36px] border border-white/40 bg-white/70 shadow-[0_28px_90px_rgba(15,23,42,0.14)] backdrop-blur-[18px]">
              <div className="border-b border-[#8ca2b6]/20 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#34495e]/72 sm:px-6">
                Create → Edit → Export
              </div>
              <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="relative min-h-[360px] border-b border-[#8ca2b6]/20 bg-[radial-gradient(circle_at_50%_14%,rgba(255,255,255,0.98),rgba(240,245,249,0.96)_42%,rgba(226,234,241,0.94))] lg:min-h-[520px] lg:border-b-0 lg:border-r">
                  <HeroAstronautViewer className="h-full min-h-[360px] w-full lg:min-h-[520px]" />
                  <div className="pointer-events-none absolute left-5 top-5 rounded-2xl border border-white/60 bg-white/82 px-4 py-3 shadow-[0_14px_40px_rgba(15,23,42,0.10)] backdrop-blur-md">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#34495e]/60">
                      Draft Preview
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#243545]">Prompt-generated shape</p>
                  </div>
                  <div className="pointer-events-none absolute bottom-5 right-5 rounded-2xl border border-[#34495e]/10 bg-[#34495e] px-4 py-3 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/60">
                      Output
                    </p>
                    <p className="mt-2 text-sm font-medium">JavaScript / GLB / STL</p>
                  </div>
                </div>

                <div className="grid gap-4 p-5 sm:p-6">
                  <div className="rounded-[28px] border border-[#8ca2b6]/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,252,0.94))] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#34495e]/62">
                      Why It Works
                    </p>
                    <div className="mt-4 space-y-4">
                      {workflowPillars.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.title} className="flex items-start gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                              <Icon className="size-5" />
                            </div>
                            <div>
                              <h2 className="text-base font-semibold text-[#243545]">{item.title}</h2>
                              <p className="mt-1 text-sm leading-relaxed text-[#34495e]/76">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-[#8ca2b6]/24 bg-white/92 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#34495e]/60">
                        Best For
                      </p>
                      <p className="mt-3 text-lg font-semibold text-[#243545]">Web and prototype work</p>
                      <p className="mt-2 text-sm leading-relaxed text-[#34495e]/76">
                        Especially useful when the next step is three.js, a viewer handoff, or a print retry.
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-[#8ca2b6]/24 bg-[#34495e] p-4 text-white shadow-[0_14px_32px_rgba(15,23,42,0.14)]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/58">
                        Workflow
                      </p>
                      <p className="mt-3 text-lg font-semibold">Prompt → Edit → Export</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/72">
                        Useful when speed to first usable draft matters more than maximum generation volume.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center">
              {workflowTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section id="workflow" className="py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4">
          {storySections.map((section, index) => (
            <div
              key={section.id}
              className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${
                index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                  {section.eyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                  {section.title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {section.description}
                </p>
                <div className="mt-6 space-y-4">
                  {section.points.map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                        <ArrowRight className="size-3.5" />
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
              <StoryVisual kind={section.visual} />
            </div>
          ))}
        </div>
      </section>

      <section id="use-cases" className="bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Use Cases
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Built for web scenes, print prototypes, and Blender handoff
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              The strongest use cases are the ones where getting a draft fast, fixing it lightly,
              and exporting cleanly saves real production time.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <UseCaseCard
              icon={Braces}
              title="Web 3D"
              description="Prototype assets for three.js and browser-based scenes without spending the first hour modeling by hand."
              tags={['JavaScript', 'GLB', 'three.js']}
            />
            <UseCaseCard
              icon={Printer}
              title="3D Print"
              description="Create rough printable concepts, fix obvious issues, and send STL into the next physical iteration."
              tags={['STL', 'Prototype', 'Print retry']}
            />
            <UseCaseCard
              icon={Box}
              title="Blender Prep"
              description="Use Ascoor for the first pass, then continue detail, polish, and finishing work inside Blender."
              tags={['Draft first', 'Handoff', 'Faster start']}
            />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Example Output
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              One real print workflow using the same draft-edit-export loop
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              This is still a useful proof point. It shows the kind of lightweight iteration loop
              the product is designed for, even though the top-of-page message is now broader.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <XPostEmbed />
          </div>
        </div>
      </section>

      <section id="plans" className="pb-20 pt-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Pricing</p>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              One plan for fast 3D draft workflows
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Use the same plan whether the next step is a web scene, a print prototype, or a
              downstream modeling tool.
            </p>
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
                  <a
                    className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    href={paths.plan}
                  >
                    {plan.cta}
                  </a>
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

function UseCaseCard({
  icon: Icon,
  title,
  description,
  tags,
}: {
  icon: typeof Braces;
  title: string;
  description: string;
  tags: Array<string>;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-background/88 p-6 shadow-[var(--shadow-card)]">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs font-medium text-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function StoryVisual({ kind }: { kind: StoryVisualKind }) {
  if (kind === 'draft') {
    return (
      <div className="overflow-hidden rounded-[32px] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,246,249,0.94))] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="rounded-[24px] border border-[#8ca2b6]/20 bg-white/92 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#34495e]/60">
              Prompt
            </p>
            <p className="text-xs text-[#34495e]/56">Display stand for a small product</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[22px] border border-dashed border-[#8ca2b6]/30 bg-[#f7fafc] p-4">
              <div className="space-y-2">
                <div className="h-3 w-3/4 rounded-full bg-[#d7e1ea]" />
                <div className="h-3 w-full rounded-full bg-[#e6edf3]" />
                <div className="h-3 w-5/6 rounded-full bg-[#dfe8ef]" />
              </div>
            </div>
            <div className="relative min-h-[220px] rounded-[24px] bg-[radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.98),rgba(231,238,243,0.96)_58%,rgba(214,223,231,0.92))]">
              <div className="absolute inset-x-10 bottom-6 h-8 rounded-full bg-[radial-gradient(circle,rgba(52,73,94,0.18),rgba(52,73,94,0.02)_62%,transparent_72%)] blur-lg" />
              <div className="absolute bottom-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-[30px] border-[10px] border-[#f4d7ba] bg-[#fff4e7] shadow-[0_18px_28px_rgba(36,53,69,0.10)]" />
              <div className="absolute bottom-26 left-1/2 h-16 w-4 -translate-x-1/2 rounded-full bg-[#8b5e3c]" />
              <div className="absolute bottom-38 left-1/2 h-12 w-4 -translate-x-[24px] rotate-[-24deg] rounded-full bg-[#8b5e3c]" />
              <div className="absolute bottom-38 left-1/2 h-12 w-4 translate-x-[20px] rotate-[24deg] rounded-full bg-[#8b5e3c]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'edit') {
    return (
      <div className="overflow-hidden rounded-[32px] border border-border/60 bg-[#34495e] p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div className="grid gap-4 md:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/56">
              Structure
            </p>
            <div className="mt-4 space-y-3">
              {['root', 'base', 'stem', 'left_support', 'right_support'].map((node) => (
                <div
                  key={node}
                  className="rounded-xl border border-white/8 bg-white/6 px-3 py-2 text-sm text-white/80"
                >
                  {node}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.16),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/56">
                Editor Preview
              </p>
              <p className="text-xs text-white/52">Transform controls</p>
            </div>
            <div className="relative mt-4 min-h-[240px] rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_50%_26%,rgba(255,255,255,0.22),rgba(255,255,255,0.08)_58%,rgba(255,255,255,0.04))]">
              <div className="absolute left-1/2 top-10 h-28 w-28 -translate-x-1/2 rounded-full border-4 border-dashed border-[#da9a9d] bg-white/8" />
              <div className="absolute inset-x-10 bottom-10 h-2 rounded-full bg-white/16" />
              <div className="absolute right-5 top-5 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/66">
                Edit Mode
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,251,0.94))] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="grid gap-4 md:grid-cols-3">
        <ExportCard
          title="JavaScript"
          description="Use a code-first export for web scenes."
          accent="bg-[#34495e] text-white"
        />
        <ExportCard
          title="GLB"
          description="Pass a portable asset into viewers or downstream tools."
          accent="bg-white text-[#243545]"
        />
        <ExportCard
          title="STL"
          description="Send a draft into print prototyping."
          accent="bg-[#da9a9d] text-[#243545]"
        />
      </div>
    </div>
  );
}

function ExportCard({
  title,
  description,
  accent,
}: {
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className={`rounded-[26px] border border-border/60 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.08)] ${accent}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] opacity-70">Export</p>
      <h3 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed opacity-80">{description}</p>
    </div>
  );
}
