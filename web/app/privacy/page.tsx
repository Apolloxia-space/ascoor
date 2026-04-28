import type { Metadata } from 'next';
import { LandingFooter } from '@/features/landing/landing-footer';
import { LandingHeader } from '@/features/landing/landing-header';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Read how Ascoor collects, uses, and protects personal information.',
  alternates: {
    canonical: '/privacy',
  },
};

const sections = [
  {
    title: '1. Overview',
    body: [
      'This Privacy Policy explains how Ascoor collects, uses, and shares information when you use the Service.',
      'Ascoor is operated by an individual (sole proprietor).',
    ],
  },
  {
    title: '2. Information Collected',
    body: [
      'Account information (such as name, email address, and authentication identifiers).',
      'Usage data (such as pages visited, features used, and timestamps).',
      'Content you submit (prompts, 3D asset pack instructions, and generated outputs).',
      'Billing details are processed by Stripe. The operator does not store full payment card numbers.',
    ],
  },
  {
    title: '3. How Information Is Used',
    body: [
      'To provide, maintain, and improve the Service.',
      'To develop, train, evaluate, monitor, and improve AI/ML features and models used by the Service (including quality and safety improvements).',
      'To process payments and manage subscriptions.',
      'To communicate with you, including support responses.',
      'To protect the security and integrity of the Service.',
    ],
  },
  {
    title: '4. Sharing of Information',
    body: [
      'The operator shares information with service providers who help operate the Service (for example, payment processing).',
      'The operator may share prompts, 3D asset pack instructions, attachments, and related metadata with AI/cloud service providers strictly for processing, hosting, safety filtering, and model-related improvement of the Service.',
      'The operator may share information to comply with legal obligations, enforce the Terms, or protect rights and safety.',
    ],
  },
  {
    title: '5. Data Retention',
    body: [
      'The operator retains information as long as needed to provide the Service and for legitimate business purposes.',
      'The operator may delete content or data at its discretion, including to comply with legal obligations or maintain the integrity of the Service.',
      'If content has already been used in model training or evaluation pipelines, removing its influence from already-trained model parameters may not always be technically feasible; however, requested deletions are applied to future use where reasonably practicable.',
      'If you delete your account, the operator will delete or anonymize associated personal information within a reasonable period, unless retention is required by law or for legitimate business purposes (such as billing, dispute resolution, or security).',
    ],
  },
  {
    title: '6. Cookies & Analytics',
    body: [
      'The operator may use cookies or similar technologies to keep you signed in and understand usage patterns.',
    ],
  },
  {
    title: '7. Your Choices',
    body: [
      'You can request access, correction, or deletion of your personal information by contacting the operator.',
      'You can request that newly submitted content not be used for future AI model training by contacting the operator. The operator will honor such requests where technically feasible and legally required.',
    ],
  },
  {
    title: '8. International Transfers',
    body: [
      'Your information may be processed outside your country of residence, including in countries where the operator or service providers operate.',
    ],
  },
  {
    title: '9. Security',
    body: [
      'The operator uses administrative, technical, and organizational safeguards designed to protect your information.',
      'Examples may include access controls, encryption in transit, and secure secret handling practices.',
      'No method of transmission or storage is 100% secure, and the operator cannot guarantee absolute security.',
    ],
  },
  {
    title: '10. Changes',
    body: [
      'The operator may update this Privacy Policy from time to time. Updates will be posted on this page.',
    ],
  },
  {
    title: '11. Contact',
    body: ['For privacy-related inquiries, contact us at support@apolloxia.com.'],
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <div className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Privacy Policy
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: 2026-02-12</p>
        </div>

        <div className="mt-10 space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-border/60 bg-card/70 p-5"
            >
              <h2 className="text-base font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {section.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <LandingFooter />
    </main>
  );
}
