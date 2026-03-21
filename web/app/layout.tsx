import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppProviders } from '@/app/providers';
import { defaultDescription, defaultOgImagePath, siteName, siteUrl } from '@shared/constants/seo';
import { cn } from '@shared/lib/utils';
import { Toaster } from '@shared/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  applicationName: siteName,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName,
    title: siteName,
    description: defaultDescription,
    images: [
      {
        url: defaultOgImagePath,
        width: 1200,
        height: 630,
        alt: `${siteName} preview image`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: defaultDescription,
    images: [defaultOgImagePath],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={cn('dark antialiased bg-background text-foreground')}>
        <AppProviders>
          {children}
          <Toaster position="top-center" />
        </AppProviders>
      </body>
    </html>
  );
}
