'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useChatConversationApi } from '../hooks/use-chat-api';
import { Button } from '@shared/components/ui/button';
import { Textarea } from '@shared/components/ui/textarea';
import { useGetBillingStatus } from '@/shared/api/generated/client';
import { buildTraceId, type ApiError } from '@/shared/api/fetcher';
import { useStudioStore } from '../stores/use-studio-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { paths } from '@/shared/constants/paths';
import { CREATE_FORM_MAX_CHARS } from '@/shared/constants/form-limits';
import { DESIGN_FAILED_MESSAGE, DESIGN_FAILED_TITLE } from '../messages';
import { StudioSidePanel } from './studio-side-panel';

type ChatPanelProps = {
  open: boolean;
  variant?: 'desktop' | 'mobile';
  onToggle?: () => void;
};

export function ChatPanel({ open, variant = 'desktop', onToggle }: ChatPanelProps) {
  const { projectId } = useStudioStore();

  return (
    <StudioSidePanel
      open={open}
      variant={variant}
      resizeAriaLabel="Resize create panel"
      title="Create"
      description="Generate a design from a prompt."
      onToggle={onToggle}
    >
      <CreatePanelContent open={open} projectId={projectId} />
    </StudioSidePanel>
  );
}

type CreatePanelContentProps = {
  open: boolean;
  projectId: string | null;
};

export function CreatePanelContent({ open, projectId }: CreatePanelContentProps) {
  const router = useRouter();
  const [messageInput, setMessageInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isSendingRef = useRef(false);
  const [upgradeDialogMode, setUpgradeDialogMode] = useState<'required' | 'limit' | null>(null);
  const [designErrorDialogOpen, setDesignErrorDialogOpen] = useState(false);
  const addPendingDesign = useStudioStore((state) => state.addPendingDesign);
  const { createDesign, invalidateProjectDesigns } = useChatConversationApi(projectId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isBusy = isSending || isGenerating;

  const billingQuery = useGetBillingStatus({
    query: {
      enabled: open,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  });
  const billingStatus = billingQuery.data?.status === 200 ? billingQuery.data.data : undefined;
  const isProPlan = billingStatus?.status === 'active' || billingStatus?.status === 'trialing';
  const showUpgrade = !isProPlan;

  useEffect(() => {
    if (!open) {
      setMessageInput('');
      setIsSending(false);
      setIsGenerating(false);
      setUpgradeDialogMode(null);
      setDesignErrorDialogOpen(false);
      isSendingRef.current = false;
      return;
    }
  }, [open]);

  const handleSend = async () => {
    if (isSendingRef.current) return;
    if (!messageInput.trim()) return;
    if (!projectId) return;
    if (!billingQuery.isLoading && !isProPlan) {
      setUpgradeDialogMode('required');
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);

    const userPrompt = messageInput;
    setDesignErrorDialogOpen(false);
    setUpgradeDialogMode(null);

    try {
      setIsGenerating(true);
      const traceId = buildTraceId();
      const gen = await createDesign.mutateAsync({
        data: {
          projectId,
          userPrompt,
        },
        traceId,
      });
      addPendingDesign({
        designId: gen.designJobId,
        projectId,
        traceId,
        promptPreview: userPrompt,
        userPrompt,
      });
      invalidateProjectDesigns(projectId);
      setMessageInput('');
    } catch (error) {
      const apiError = error as ApiError<{ error?: string; code?: string }>;
      const errorMessage =
        apiError?.body && typeof apiError.body === 'object'
          ? (apiError.body as { error?: string }).error
          : undefined;
      const errorCode =
        apiError?.body && typeof apiError.body === 'object'
          ? (apiError.body as { code?: string }).code
          : undefined;
      const isLimitError =
        apiError?.status === 429 ||
        errorCode === 'design_limit_exceeded' ||
        (typeof errorMessage === 'string' &&
          (errorMessage.includes('Monthly generated design limit') ||
            errorMessage.includes('Monthly generated file limit')));
      const isSubscriptionRequiredError =
        apiError?.status === 402 || errorCode === 'pro_subscription_required';
      if (isSubscriptionRequiredError) {
        setUpgradeDialogMode('required');
      } else if (isLimitError) {
        setUpgradeDialogMode('limit');
      } else {
        setDesignErrorDialogOpen(true);
      }
    } finally {
      setIsGenerating(false);
      setIsSending(false);
      isSendingRef.current = false;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3">
        <div className="relative rounded-md border border-input bg-transparent px-3 py-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <Textarea
            placeholder="Describe what you want to create..."
            className="min-h-[240px] max-h-[440px] resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            value={messageInput}
            onChange={(event) =>
              setMessageInput(event.target.value.slice(0, CREATE_FORM_MAX_CHARS))
            }
            disabled={isBusy}
            maxLength={CREATE_FORM_MAX_CHARS}
            ref={textareaRef}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {messageInput.length}/{CREATE_FORM_MAX_CHARS}
            </p>
            <Button
              size="icon"
              className="h-9 w-9 rounded-lg"
              disabled={!projectId || !messageInput.trim() || isBusy || createDesign.isPending}
              onClick={handleSend}
              aria-label="Send message"
            >
              {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
      <Dialog
        open={upgradeDialogMode !== null}
        onOpenChange={(open) => !open && setUpgradeDialogMode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {upgradeDialogMode === 'required'
                ? 'Pro subscription required'
                : 'Design limit reached'}
            </DialogTitle>
            <DialogDescription>
              {upgradeDialogMode === 'required'
                ? 'An active Pro subscription is required to create designs.'
                : 'You have reached your generated design limit for this month. Please wait for the next reset.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {showUpgrade || upgradeDialogMode === 'required' ? (
              <Button onClick={() => router.push(paths.plan)}>Upgrade to Pro</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={designErrorDialogOpen} onOpenChange={setDesignErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{DESIGN_FAILED_TITLE}</DialogTitle>
            <DialogDescription>{DESIGN_FAILED_MESSAGE}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDesignErrorDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
