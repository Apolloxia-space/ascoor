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

type NewProjectDialogProps = {
  open: boolean;
  projectName: string;
  onOpenChange: (open: boolean) => void;
  onChangeName: (value: string) => void;
  onCreate: () => void;
};

export function NewProjectDialog({
  open,
  projectName,
  onOpenChange,
  onChangeName,
  onCreate,
}: NewProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
          <DialogDescription>Enter a project name.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pb-2">
          <Input
            autoFocus
            placeholder="Enter a project name"
            value={projectName}
            onChange={(event) => onChangeName(event.target.value)}
            maxLength={DEFAULT_FORM_MAX_CHARS}
          />
          <p className="text-right text-xs text-muted-foreground">
            {projectName.length}/{DEFAULT_FORM_MAX_CHARS}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
