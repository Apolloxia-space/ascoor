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
import { defaultOgImagePath } from '@shared/constants/seo';
import { paths } from '@shared/constants/paths';

const pageTitle = 'Japanese Garden Stone Lantern Workflow for X Marketing';
const pageDescription =
  'See how Ascoor takes a Japanese Garden Stone Lantern from prompt to browser refinement and export, then uses the result as an X marketing proof point.';

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: '/',
    images: [{ url: defaultOgImagePath, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
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
    title: 'Generate the first Japanese stone lantern draft in minutes',
    description:
      'This landing page is built around one concrete example: a Japanese Garden Stone Lantern model used as the core visual for X marketing.',
    points: [
      'Start from a prompt and get to a recognizable garden lantern form without opening a heavyweight desktop workflow first.',
      'Keep each pass in project history so the version used in X marketing is traceable back to the initial draft.',
    ],
    visual: 'draft',
  },
  {
    id: 'editing',
    eyebrow: 'Refine In Browser',
    title: 'Refine silhouette and structure before you publish it',
    description:
      'The value is not just generation. The browser editor gives you a lightweight clean-up pass before the model becomes a public-facing marketing asset.',
    points: [
      'Inspect the structure tree to understand what was generated and what still needs adjustment.',
      'Fix transforms and obvious shape issues before the lantern is shown in the X post.',
    ],
    visual: 'edit',
  },
  {
    id: 'exports',
    eyebrow: 'Ship The Right Format',
    title: 'Export the same lantern into demo, handoff, and print workflows',
    description:
      'The same Japanese Garden Stone Lantern model can move from social proof to production handoff without rebuilding it in another tool.',
    points: [
      'JavaScript export for generated scene output.',
      'GLB export for portable previews and edited model handoff.',
      'STL export for rapid print prototypes after the marketing pass.',
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
                Japanese Garden Stone Lantern
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
                Turn one lantern prompt into a model you can market on X.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                This page packages the exact workflow behind our Japanese Garden Stone Lantern
                example: generate the first draft, refine the parts that matter in-browser, and
                export the result for X, GLB handoff, or STL prototyping.
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
                        Prompt → Refine → Market On X
                      </p>
                    </div>
                  </div>
                </div>
              <p className="mt-3 px-2 text-center text-xs leading-relaxed text-muted-foreground">
                Top demo shows the broader create-edit-export flow. The sections below focus on the
                Japanese Garden Stone Lantern example used for X marketing.
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
              One model, multiple outputs after the X post
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              The point of this example is not only the post itself. It shows how one generated
              model can keep working after marketing, instead of being a throwaway asset.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
            <UseCaseCard
              icon={Braces}
              title="Social + Web Demo"
              description="Use the lantern as the visual proof point in X, then keep the same asset moving into browser demos and lightweight scene work."
              tags={['X marketing', 'Generated JavaScript', 'GLB']}
            />
            <UseCaseCard
              icon={Printer}
              title="3D Print"
              description="Take the same refined lantern, fix obvious issues, and send STL into the next physical prototype instead of remodeling it from scratch."
              tags={['STL', 'Prototype', 'Physical mock']}
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
              The X post used to market the lantern workflow
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              This embedded post is the public-facing proof point. It lets visitors connect the
              marketing result back to the same draft-edit-export flow shown above.
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
              One plan for shipping campaign-ready 3D examples faster
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
