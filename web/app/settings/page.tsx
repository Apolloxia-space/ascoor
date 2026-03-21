import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { paths } from '@shared/constants/paths';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage account and billing settings.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsIndexPage() {
  redirect(paths.settingsAccount);
}
