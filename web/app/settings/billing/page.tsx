import type { Metadata } from 'next';
import { SettingsPage } from '@features/settings';

export const metadata: Metadata = {
  title: 'Billing Settings',
  description: 'Manage Ascoor subscription, billing status, and invoices.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsBillingPage() {
  return <SettingsPage />;
}
