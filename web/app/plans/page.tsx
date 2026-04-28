import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PlanPage } from '@features/plan';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Manage your Ascoor subscription and checkout flow.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PlanPage />
    </Suspense>
  );
}
