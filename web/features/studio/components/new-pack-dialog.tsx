'use client';

import { Dialog, DialogContent } from '@shared/components/ui/dialog';
import { NewPackForm } from './new-pack-form';

type NewPackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewPackDialog({ open, onOpenChange }: NewPackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-0 bg-transparent p-0 shadow-none sm:max-w-none">
        <NewPackForm active={open} layout="dialog" onComplete={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
