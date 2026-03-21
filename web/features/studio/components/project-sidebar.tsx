'use client';

import { File, Settings } from 'lucide-react';

import { IconTile } from './icon-tile';
import { Button } from '@shared/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shared/components/ui/tooltip';
import { cn } from '@shared/lib/utils';
import { paths } from '@shared/constants/paths';

type ProjectSidebarProps = {
  open: boolean;
  onToggle: () => void;
};

export function ProjectSidebar({ open, onToggle }: ProjectSidebarProps) {
  return (
    <aside
      className={cn(
        'hidden w-16 flex-shrink-0 border-r border-border/80 bg-background/70 backdrop-blur md:flex flex-col items-center justify-between py-4',
        open ? 'opacity-100' : 'opacity-70',
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconTile label="Designs" active={open} onClick={onToggle}>
              <File className="size-5" />
            </IconTile>
          </TooltipTrigger>
          <TooltipContent>Designs Panel</TooltipContent>
        </Tooltip>
        {/*
        <Tooltip>
          <TooltipTrigger asChild>
            <IconTile label="Search">
              <Search className="size-5" />
            </IconTile>
          </TooltipTrigger>
          <TooltipContent>Search</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconTile label="Version Control">
              <GitBranch className="size-5" />
            </IconTile>
          </TooltipTrigger>
          <TooltipContent>Version Control</TooltipContent>
        </Tooltip>
        */}
      </div>
      <div className="flex flex-col items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="rounded-lg text-muted-foreground hover:bg-muted"
              size="icon-lg"
              aria-label="Settings"
            >
              <Settings className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="center" className="w-52 space-y-2 p-2">
            <div className="px-2 pt-1 text-xs font-semibold text-muted-foreground">Settings</div>
            <div className="space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                <a href={paths.settingsAccount}>Account</a>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                <a href={paths.settingsBilling}>Billing</a>
              </Button>
            </div>
            <div className="border-t border-border/60 pt-2">
              <Button size="sm" className="w-full justify-center" asChild>
                <a href={paths.plan}>Upgrade</a>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
}
