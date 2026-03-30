import type { viewModes } from '@/mock/studio';

export type ViewMode = (typeof viewModes)[number];

export type RightPanelMode = 'create' | 'edit' | 'appearance';
