import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowRight, Braces, Printer } from 'lucide-react';
import { HeroSignupCard } from '@/features/landing/hero-signup-card';
import { LandingFooter } from '@/features/landing/landing-footer';
import { LandingGlbPreview } from '@/features/landing/landing-glb-preview';
import { LandingHeader } from '@/features/landing/landing-header';
import { XPostEmbed } from '@/features/landing/x-post-embed';
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

const heroDemoVideoPath = '/hero/demo-v20260325.mp4';
const draftFirstModelImagePath = '/landing/draft-first-model-v20260325.webp';
const refineLanternImagePath = '/landing/refine-lantan-v20260325.webp';
const stoneLanternGlbPath = '/landing/Japanese Garden Stone Lantern Model-v20260325.glb';

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
      'JavaScript export for generated designs.',
      'GLB export for portable assets and edited model handoff.',
      'STL export for rapid print prototypes.',
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
                off generated JavaScript, edited GLB, or STL into the workflow you already run.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-md">
              <HeroSignupCard />
            </div>

            <div className="mx-auto mt-10 max-w-[56rem]">
              <div className="relative overflow-hidden rounded-[24px]">
                  <video
                    className="h-full min-h-[250px] w-full object-cover md:min-h-[330px] lg:min-h-[430px]"
                    src={heroDemoVideoPath}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label="Ascoor create, edit, and export workflow demo"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(15,23,42,0),rgba(15,23,42,0.72))] px-5 pb-5 pt-16 sm:px-6 sm:pb-6">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/64">
                        Create → Edit → Export
                      </p>
                    </div>
                  </div>
                </div>
              <p className="mt-3 px-2 text-center text-xs leading-relaxed text-muted-foreground">
                Demo edited for presentation. Actual product experience and generation results may
                vary.
              </p>
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
              Built for web scenes and print prototypes
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              The strongest use cases are the ones where getting a draft fast, fixing it lightly,
              and exporting cleanly saves real production time.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
            <UseCaseCard
              icon={Braces}
              title="Web 3D"
              description="Prototype assets for three.js and browser-based scenes, then hand off generated JavaScript or GLB without spending the first hour modeling by hand."
              tags={['Generated JavaScript', 'GLB', 'three.js']}
            />
            <UseCaseCard
              icon={Printer}
              title="3D Print"
              description="Create rough printable concepts, fix obvious issues, and send STL into the next physical iteration."
              tags={['STL', 'Prototype', 'Print retry']}
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
      <div className="overflow-hidden rounded-[32px] bg-[#0c1324] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <Image
          src={draftFirstModelImagePath}
          alt="Ascoor showing a first generated 3D model draft in the browser"
          width={1344}
          height={1008}
          className="block h-full w-full object-cover"
        />
      </div>
    );
  }

  if (kind === 'edit') {
    return (
      <div className="overflow-hidden rounded-[32px] border border-border/60 bg-[#0c1324] shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <Image
          src={refineLanternImagePath}
          alt="Ascoor editor showing a refined 3D model in browser edit mode"
          width={1344}
          height={1008}
          className="block h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-[#23324d]/70 bg-[radial-gradient(circle_at_50%_18%,rgba(37,60,102,0.46),rgba(11,18,36,0.96)_56%,rgba(6,10,22,1))] shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
      <LandingGlbPreview
        className="h-[320px] w-full md:h-[380px]"
        src={stoneLanternGlbPath}
      />
    </div>
  );
}
