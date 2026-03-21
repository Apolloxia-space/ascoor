'use client';

import { SlidersHorizontal, Sparkles } from 'lucide-react';

import { IconTile } from './icon-tile';
import type { RightPanelMode } from '../types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip';

type ActionSidebarProps = {
  rightPanelOpen: boolean;
  activeMode: RightPanelMode;
  onSelectMode?: (mode: RightPanelMode) => void;
};

export function ActionSidebar({ rightPanelOpen, activeMode, onSelectMode }: ActionSidebarProps) {
  return (
    <aside className="relative z-0 hidden w-16 flex-shrink-0 border-l border-border/80 bg-background/70 backdrop-blur md:flex flex-col items-center justify-between py-4">
      <div className="flex flex-col items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconTile
              label="Create"
              active={rightPanelOpen && activeMode === 'create'}
              onClick={() => onSelectMode?.('create')}
            >
              <Sparkles className="size-5" />
            </IconTile>
          </TooltipTrigger>
          <TooltipContent>Create</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconTile
              label="Edit"
              active={rightPanelOpen && activeMode === 'edit'}
              onClick={() => onSelectMode?.('edit')}
            >
              <SlidersHorizontal className="size-5" />
            </IconTile>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
        {/*
        <Tooltip>
          <TooltipTrigger asChild>
            <IconTile label="Edit">
              <SquarePen className="size-5" />
            </IconTile>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
        */}
        {/*
        <Tooltip>
          <TooltipTrigger asChild>
            <IconTile label="Render">
              <Eye className="size-5" />
            </IconTile>
          </TooltipTrigger>
          <TooltipContent>Render</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconTile label="Share">
              <Share2 className="size-5" />
            </IconTile>
          </TooltipTrigger>
          <TooltipContent>Share</TooltipContent>
        </Tooltip>
        */}
      </div>
      <div className="flex flex-col items-center gap-4" />
    </aside>
  );
}
