import type { Metadata } from 'next';
import { SettingsPage } from '@features/settings';

export const metadata: Metadata = {
  title: 'General Settings',
  description: 'General configuration area for authenticated Ascoor users.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsGeneralPage() {
  return <SettingsPage />;
}
