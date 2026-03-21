'use client';

import { Button } from '@shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Input } from '@shared/components/ui/input';
import { DEFAULT_FORM_MAX_CHARS } from '@/shared/constants/form-limits';

type NewFileDialogProps = {
  open: boolean;
  designName: string;
  onOpenChange: (open: boolean) => void;
  onChangeName: (value: string) => void;
  onCreate: () => void;
};

export function NewDesignDialog({
  open,
  designName,
  onOpenChange,
  onChangeName,
  onCreate,
}: NewFileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new design</DialogTitle>
          <DialogDescription>Enter a design name.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pb-2">
          <Input
            autoFocus
            placeholder="mechanical_arm_base.js"
            value={designName}
            onChange={(event) => onChangeName(event.target.value)}
            maxLength={DEFAULT_FORM_MAX_CHARS}
          />
          <p className="text-right text-xs text-muted-foreground">
            {designName.length}/{DEFAULT_FORM_MAX_CHARS}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={!designName.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
