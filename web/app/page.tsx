import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';

import { LandingFooter } from '@/features/landing/landing-footer';
import { LandingHeader } from '@/features/landing/landing-header';
import { LandingHeaderActionButton } from '@/features/landing/landing-header-actions';
import { HeroMainVisual } from '@/features/landing/hero-main-visual';
import { defaultOgImagePath } from '@shared/constants/seo';
import { paths } from '@shared/constants/paths';

const pageTitle = 'Generate Game Asset Packs in the Browser';
const pageDescription =
  'Ascoor helps you generate cohesive prototype game asset packs in the browser, preview each part, and download reusable GLB assets as a ZIP.';
const heroStudioPreviewPath = '/landing/studio-cyberpunk-pack-preview-main-v20260427-180120.webp';
const studioPreviewVideoPath = '/landing/video/studio-preview-v20260424-194713.mp4';
const themeExamplePickerPath =
  '/landing/screenshots/example-picker-sci-fi-futuristic-v20260427-111531.webp';
const themePickerPath =
  '/landing/screenshots/theme-picker-fantasy-historical-v20260427-160212.webp';
const studioHomeGalleryPath =
  '/landing/screenshots/studio-home-continue-working-v20260427-160132.webp';
const assetCategoryPickerPath =
  '/landing/screenshots/asset-category-picker-transport-transit-v20260427-152254.webp';
const packCompletedPath = '/landing/screenshots/pack-completed-download-zip-v20260427-152127.webp';

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

const visualFrames = [
  {
    eyebrow: 'Studio preview',
    title: 'Live pack preview',
    description: 'Preview each asset before export.',
    mediaType: 'video',
    src: studioPreviewVideoPath,
  },
  {
    eyebrow: 'Start from an example',
    title: 'Preset picker',
    description: 'Start from a ready-made pack.',
    mediaType: 'image',
    src: themeExamplePickerPath,
    alt: 'Ascoor example picker showing fantasy and historical pack presets',
  },
  {
    eyebrow: 'Theme',
    title: 'Theme picker',
    description: 'Choose the right theme from a wide range of styles.',
    mediaType: 'image',
    src: themePickerPath,
    alt: 'Ascoor theme picker showing fantasy and historical themes',
  },
  {
    eyebrow: 'Asset category',
    title: 'Category picker',
    description: 'Choose the kind of asset pack you want to make.',
    mediaType: 'image',
    src: assetCategoryPickerPath,
    alt: 'Ascoor asset category picker showing transport and transit options',
  },
  {
    eyebrow: 'Pack completed',
    title: 'Download ZIP',
    description: 'Download the full pack when it is ready.',
    mediaType: 'image',
    src: packCompletedPath,
    alt: 'Ascoor completed pack panel showing download ZIP and part list',
  },
  {
    eyebrow: 'Studio home',
    title: 'Workspace gallery',
    description: 'Save finished packs and come back anytime.',
    mediaType: 'image',
    src: studioHomeGalleryPath,
    alt: 'Ascoor studio home showing recent workspace cards',
  },
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7fbf7] text-[#233226]">
      <LandingHeader />

      <section className="overflow-hidden px-4 pb-18 pt-28 sm:pb-20 md:pt-32">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl lg:whitespace-nowrap">
              Full asset packs built around one theme in minutes.
            </h1>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <LandingHeaderActionButton shine />
              <a
                className="inline-flex items-center justify-center rounded-md border border-[#cfe0cf] bg-white px-4 py-2 text-sm font-medium text-[#233226] transition hover:bg-[#f0f6f0]"
                href={paths.pricing}
              >
                View pricing
              </a>
            </div>
          </div>

          <HeroMainVisual
            imageSrc={heroStudioPreviewPath}
            imageAlt="Ascoor studio showing a cyberpunk asset pack preview with a vending machine part selected"
          />
        </div>
      </section>

      <section id="use-cases" className="py-18">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Create cohesive asset packs
              <br />
              for a smoother game workflow.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {visualFrames.map((frame) => (
              <VisualFrameCard key={frame.title} {...frame} />
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="border-t border-[#dce8dc] bg-white py-18">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-lg border border-[#dce8dc] bg-white p-6 shadow-[0_16px_36px_rgba(35,50,38,0.06)] md:p-8">
            <div className="grid gap-6 md:grid-cols-[128px_minmax(0,1fr)] md:items-center">
              <div className="flex justify-center md:justify-start">
                <div className="flex size-24 items-center justify-center md:size-28">
                  <Image
                    src="/favicon.ico"
                    alt="Ascoor logo"
                    width={96}
                    height={96}
                    className="size-16 object-contain md:size-20"
                  />
                </div>
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Start today</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5c6f61] md:text-base">
                  Choose a plan and streamline your game workflow. No credit card is required for
                  the free trial.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <a
                    className="inline-flex items-center justify-center rounded-md bg-[#e7a8b0] px-4 py-2 text-sm font-medium text-[#233226] transition hover:bg-[#de959f]"
                    href={paths.plan}
                  >
                    Start free
                  </a>
                  <a
                    className="inline-flex items-center gap-2 rounded-md border border-[#dce8dc] bg-white px-4 py-2 text-sm font-medium text-[#233226] transition hover:bg-[#f3f7f3]"
                    href={paths.pricing}
                  >
                    See pricing
                    <ArrowRight className="size-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}

function VisualFrameCard({
  eyebrow,
  title,
  description,
  mediaType,
  src,
  alt,
}: {
  eyebrow: string;
  title: string;
  description: string;
  mediaType: 'image' | 'video';
  src: string;
  alt?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#d4e8d5] bg-[#fbfdfb] shadow-[0_14px_30px_rgba(35,50,38,0.05)]">
      <div className="grid lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div className="border-b border-[#dce8dc] bg-white px-5 py-5 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2f7a4b]">
            {eyebrow}
          </p>
          <h3 className="mt-3 text-xl font-semibold text-[#233226]">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-[#5c6f61]">{description}</p>
        </div>
        <div className="flex min-h-[260px] items-center justify-center bg-[#eef8ef] p-4">
          {mediaType === 'video' ? (
            <video
              className="block h-full max-h-[320px] w-full rounded-md bg-[#eef8ef] object-contain"
              src={src}
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
            />
          ) : (
            <Image
              src={src}
              alt={alt ?? title}
              width={1719}
              height={827}
              className="block h-full max-h-[320px] w-full rounded-md bg-[#eef8ef] object-contain object-top"
            />
          )}
        </div>
      </div>
    </div>
  );
}
