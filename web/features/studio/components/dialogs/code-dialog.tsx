'use client';

import { Copy } from 'lucide-react';

import { Button } from '@shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';

type CodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedCode: string;
};

export function CodeDialog({ open, onOpenChange, generatedCode }: CodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="border-b border-border/60 px-4 pb-2 pt-4">
          <DialogTitle>Generated JavaScript Code</DialogTitle>
          <DialogDescription>Copy-ready three.js snippet.</DialogDescription>
        </DialogHeader>
        <div className="relative m-4 rounded-lg bg-[color:var(--background-panel)] p-4 text-xs text-[color:var(--text-primary)]">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-3 h-8 px-2 text-xs text-[color:var(--text-secondary)]"
            onClick={() => navigator.clipboard?.writeText(generatedCode)}
          >
            <Copy className="size-3.5" /> Copy
          </Button>
          <pre className="whitespace-pre-wrap font-mono leading-5 text-[color:var(--text-primary)]">
            {generatedCode}
          </pre>
        </div>
        <DialogFooter className="border-t border-border/60">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
