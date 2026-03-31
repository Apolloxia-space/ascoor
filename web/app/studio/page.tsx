import { Suspense } from 'react';
import { StudioPage } from '@features/studio';
import { studioMetadata } from './metadata';

export const metadata = studioMetadata;

export default function StudioRoutePage() {
  return (
    <Suspense fallback={null}>
      <StudioPage />
    </Suspense>
  );
}
