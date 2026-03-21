import type { Metadata } from 'next';
import { LandingFooter } from '@/features/landing/landing-footer';
import { LandingHeader } from '@/features/landing/landing-header';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Review the terms and conditions for using Ascoor.',
  alternates: {
    canonical: '/terms',
  },
};

const sections = [
  {
    title: '1. Agreement',
    body: [
      'These Terms of Service ("Terms") govern your access to and use of Ascoor ("Service"). By using the Service, you agree to these Terms.',
      'Ascoor is operated by an individual (sole proprietor).',
    ],
  },
  {
    title: '2. Eligibility & Account',
    body: [
      'You must be able to form a binding contract to use the Service.',
      'You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.',
    ],
  },
  {
    title: '3. Subscription & Billing',
    body: [
      'The Pro plan is billed on a recurring monthly basis until canceled.',
      'You may cancel anytime. Your access remains active until the next renewal date.',
      'Refunds are not provided.',
    ],
  },
  {
    title: '4. Cancellation & Termination',
    body: [
      'You can cancel your subscription at any time from the billing page within the Service.',
      'Proper cancellation is your responsibility. Requests to cancel by email or phone are not considered a cancellation.',
      'Cancellation stops future renewals; access remains active until the end of the current billing period.',
      'You may delete your account from the account settings. Deleting your account is irreversible and ends access immediately. If you have an active subscription, deleting your account immediately cancels it.',
      'The operator may suspend or terminate access if you violate these Terms or if required by law.',
    ],
  },
  {
    title: '5. Acceptable Use',
    body: [
      'You agree not to misuse the Service, attempt to access it without authorization, or interfere with its operation.',
      'You are responsible for ensuring that your inputs and outputs comply with applicable laws and third-party rights.',
    ],
  },
  {
    title: '6. 3D Design/AI Outputs & Responsibility',
    body: [
      'The Service generates 3D design-related outputs based on your inputs. You are responsible for reviewing outputs for accuracy, safety, and suitability before use.',
      'Output design may fail or be incomplete, and the Service does not guarantee successful design or suitability for any particular purpose.',
      'Prompts, 3D design instructions, attachments, and generated outputs may be used to operate, maintain, and improve AI-related features (including quality improvement, safety measures, evaluation, and model training) as described in the Privacy Policy.',
      'Ascoor does not provide professional engineering or safety certifications.',
    ],
  },
  {
    title: '7. Copyright & Content Ownership',
    body: [
      'All content posted to the Service must comply with Japanese copyright law.',
      'The operator does not claim intellectual property rights over materials you provide. Uploaded materials remain yours to the extent you hold such rights.',
      'By submitting content (including prompts, 3D design instructions, attachments, and outputs), you grant the operator and its service providers a non-exclusive, worldwide, royalty-free license to host, store, reproduce, adapt, process, and use that content solely to provide, secure, maintain, and improve the Service, including AI/ML development and operation.',
      'The operator does not pre-screen content but reserves the right (without obligation) to refuse or remove content at its discretion.',
      'The look and feel of the Service is © Akira Nishida. All rights reserved. No portion of the HTML, CSS, JavaScript, or visual design may be copied, reproduced, or reused without written permission.',
    ],
  },
  {
    title: '8. API Terms',
    body: [
      'If you access the Service via API or automated means, you must follow any technical documentation, rate limits, and security requirements.',
      'You must not attempt to circumvent usage limits or access data you are not authorized to access.',
    ],
  },
  {
    title: '9. Third-Party Services',
    body: [
      'Payments are processed by Stripe. Your use of payment services is subject to Stripe’s terms and policies.',
      'The Service may use third-party AI and cloud providers to process prompts and design outputs. Use of those components may be subject to the relevant third-party terms and privacy policies.',
    ],
  },
  {
    title: '10. Service & Price Changes',
    body: [
      'The operator may modify, suspend, or discontinue any part of the Service at any time.',
      'The operator may change pricing or plan features. Changes will apply to future billing periods.',
    ],
  },
  {
    title: '11. Availability & Changes',
    body: [
      'The operator may modify, suspend, or discontinue any part of the Service at any time.',
      'The operator may update these Terms from time to time. Continued use of the Service means you accept the updated Terms.',
    ],
  },
  {
    title: '12. Disclaimers & Limitation of Liability',
    body: [
      'The Service is provided "as is" without warranties of any kind.',
      'To the maximum extent permitted by law, Ascoor is not liable for any indirect, incidental, or consequential damages.',
    ],
  },
  {
    title: '13. Governing Law',
    body: [
      'These Terms are governed by the laws of Japan, without regard to conflict of law principles.',
    ],
  },
  {
    title: '14. Contact',
    body: ['For questions about these Terms, contact us at support@apolloxia.com.'],
  },
] as const;

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <div className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Terms of Service
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">Terms of Service</h1>
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
