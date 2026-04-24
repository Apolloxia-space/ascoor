import { Suspense } from 'react';
import { NewPackPage } from '@features/studio/new-pack-page';
import { studioMetadata } from '../metadata';

export const metadata = studioMetadata;

export default function StudioNewRoutePage() {
  return (
    <Suspense fallback={null}>
      <NewPackPage />
    </Suspense>
  );
}
