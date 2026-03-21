import type { Metadata } from 'next';
import { SettingsPage } from '@features/settings';

export const metadata: Metadata = {
  title: 'Account Settings',
  description: 'Update your Ascoor account profile and account actions.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsAccountPage() {
  return <SettingsPage />;
}
