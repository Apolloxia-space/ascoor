'use client';

import { useEffect, useId, useState } from 'react';
import { Home, Sparkles } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@shared/components/ui/alert-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@shared/components/ui/dialog';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Progress } from '@shared/components/ui/progress';
import { Skeleton } from '@shared/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { Textarea } from '@shared/components/ui/textarea';
import { DEFAULT_FORM_MAX_CHARS } from '@shared/constants/form-limits';
import { paths } from '@shared/constants/paths';
import {
  getGetBillingUsageQueryKey,
  getGetBillingStatusQueryKey,
  useCancelSubscription,
  useCreateBillingPortalSession,
  useDeleteUser,
  useGetBillingUsage,
  useGetBillingStatus,
  useResumeSubscriptionCancellation,
  useUpdateUser,
} from '@/shared/api/generated/client';
import type { CancellationReason } from '@/shared/api/generated/schemas';
import { firebaseAuth } from '@/shared/firebase/client';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { signOutUser } from '@/features/auth/use-auth-init';
import { useStudioStore } from '@/features/studio/stores/use-studio-store';
import { StudioHeader } from '@/features/studio/components/studio-header';
import { ProjectListDialog } from '@/features/studio/components/dialogs/project-list-dialog';
import { buildStudioNewPath, buildStudioPath } from '@/features/studio/lib/paths';

const settingsTabs = [
  { value: 'account', label: 'Account' },
  { value: 'billing', label: 'Billing' },
] as const;

type SettingsTabValue = (typeof settingsTabs)[number]['value'];

const settingsTabRoutes: Record<SettingsTabValue, string> = {
  account: paths.settingsAccount,
  billing: paths.settingsBilling,
};

const settingsTabAliases: Record<string, SettingsTabValue> = {
  account: 'account',
  billing: 'billing',
};

const formatBillingDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed);
};

const formatBillingAmount = (amount?: number, currency?: string) => {
  if (amount == null || !currency) return null;
  try {
    const normalizedCurrency = currency.toUpperCase();
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
    });
    const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 0;
    const normalizedAmount = amount / 10 ** fractionDigits;
    return `${formatter.format(normalizedAmount)} excl. tax`;
  } catch {
    return null;
  }
};

const formatBillingInterval = (interval?: string, intervalCount?: number) => {
  if (!interval) return null;
  const normalizedCount = intervalCount && intervalCount > 1 ? intervalCount : 1;
  if (interval === 'month') {
    return normalizedCount === 1 ? 'Monthly' : `Every ${normalizedCount} months`;
  }
  if (interval === 'year') {
    return normalizedCount === 1 ? 'Yearly' : `Every ${normalizedCount} years`;
  }
  return null;
};

const formatUsageValue = (value: number) => value.toLocaleString('en-US');

const getUsagePercentage = (used: number, limit: number) => {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return 0;
  const percentage = (used / limit) * 100;
  if (!Number.isFinite(percentage)) return 0;
  return Math.min(100, Math.max(0, percentage));
};

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const setUser = useAuthStore((state) => state.setUser);
  const projectMenuOpen = useStudioStore((state) => state.projectMenuOpen);
  const setProjectMenuOpen = useStudioStore((state) => state.setProjectMenuOpen);
  const setProject = useStudioStore((state) => state.setProject);
  const clearProject = useStudioStore((state) => state.clearProject);
  const usernameInputId = useId();
  const emailInputId = useId();
  const cancelReasonId = useId();
  const cancelDetailsId = useId();
  const deleteConfirmId = useId();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState(user?.displayName ?? '');
  const [cancelReason, setCancelReason] = useState<CancellationReason | undefined>(undefined);
  const [cancelDetails, setCancelDetails] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [projectListDialogOpen, setProjectListDialogOpen] = useState(false);
  const billingQuery = useGetBillingStatus({ query: { enabled: !!user } });
  const usageQuery = useGetBillingUsage({ query: { enabled: !!user } });
  const portalSessionMutation = useCreateBillingPortalSession({
    mutation: {
      onSuccess: (response) => {
        if (response.status !== 200) {
          toast.error('Could not retrieve the billing portal URL.');
          return;
        }
        const url = response.data.url;
        if (!url) {
          toast.error('Could not retrieve the billing portal URL.');
          return;
        }
        window.location.assign(url);
      },
      onError: () => {
        toast.error('Could not open the billing portal.');
      },
    },
  });
  const cancelSubscriptionMutation = useCancelSubscription({
    mutation: {
      onSuccess: () => {
        toast.success('Cancellation request received.');
        queryClient.invalidateQueries({ queryKey: getGetBillingStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBillingUsageQueryKey() });
        setCancelDialogOpen(false);
      },
      onError: () => {
        toast.error('Failed to cancel subscription.');
      },
    },
  });
  const resumeCancellationMutation = useResumeSubscriptionCancellation({
    mutation: {
      onSuccess: () => {
        toast.success('Automatic renewal resumed.');
        queryClient.invalidateQueries({ queryKey: getGetBillingStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBillingUsageQueryKey() });
      },
      onError: () => {
        toast.error('Failed to resume cancellation.');
      },
    },
  });

  const handleCancelReasonChange = (value: string) => {
    setCancelReason(value as CancellationReason);
  };

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace(paths.home);
    }
  }, [authStatus, router]);

  useEffect(() => {
    setUsername(user?.displayName ?? '');
  }, [user?.displayName]);

  const billingStatus = billingQuery.data?.status === 200 ? billingQuery.data.data : undefined;
  const activePlan = billingStatus?.plan ?? null;
  const hasActiveSubscription = [
    'incomplete',
    'trialing',
    'active',
    'past_due',
    'unpaid',
    'paused',
  ].includes(billingStatus?.status ?? '');
  const hasNoSubscription = !billingStatus || billingStatus.status === 'none';
  const planIntervalLabel = formatBillingInterval(activePlan?.interval, activePlan?.intervalCount);
  const planPriceLabel = formatBillingAmount(activePlan?.amount, activePlan?.currency);
  const periodEndDate = formatBillingDate(billingStatus?.currentPeriodEnd);
  const planSummary = activePlan
    ? `${activePlan.name}${planIntervalLabel ? ` - ${planIntervalLabel}` : ''}${planPriceLabel ? ` (${planPriceLabel})` : ''}`
    : hasActiveSubscription
      ? 'Active subscription'
      : 'No active subscription';
  const periodLabel = billingStatus?.cancelAtPeriodEnd
    ? 'Access ends'
    : hasActiveSubscription
      ? 'Next renewal'
      : 'Next reset';
  const periodLabelText = periodEndDate ? `${periodLabel}: ${periodEndDate}` : null;
  const isBillingStatusLoading = !!user && billingQuery.isLoading && !billingQuery.data;
  const isBillingReady = !!user && !billingQuery.isLoading && !billingQuery.isError;
  const canCancel =
    isBillingReady &&
    hasActiveSubscription &&
    billingStatus?.status !== 'canceled' &&
    billingStatus?.status !== 'none' &&
    !billingStatus?.cancelAtPeriodEnd;
  const cancelDialogDescription = periodEndDate
    ? `Canceling will stop recurring billing. You will keep access until ${periodEndDate}.`
    : 'Canceling will stop recurring billing.';
  const shouldWarnBillingOnDelete =
    hasActiveSubscription || billingQuery.isLoading || billingQuery.isError;
  const canOpenPortal =
    !!user &&
    hasActiveSubscription &&
    billingStatus?.status !== 'none' &&
    billingStatus?.status !== 'canceled' &&
    !portalSessionMutation.isPending;
  const canResumeCancellation =
    !!user &&
    hasActiveSubscription &&
    !!billingStatus?.cancelAtPeriodEnd &&
    !resumeCancellationMutation.isPending;
  const activeTab = (() => {
    if (!pathname) return settingsTabs[0]?.value ?? 'account';
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] ?? '';
    return settingsTabAliases[lastSegment] ?? settingsTabs[0]?.value ?? 'account';
  })();

  const handleOpenPortal = () => {
    if (!canOpenPortal) return;
    portalSessionMutation.mutate();
  };

  const normalizedUsername = username.trim();
  const isSaving = updateUserMutation.isPending;
  const hasChanges = normalizedUsername !== (user?.displayName ?? '');

  const handleClose = () => {
    setUsername(user?.displayName ?? '');
  };
  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in.');
      return;
    }
    if (!normalizedUsername) {
      toast.error('Please enter a username.');
      return;
    }
    if (!hasChanges) {
      handleClose();
      return;
    }

    try {
      const currentUser = firebaseAuth.currentUser;
      if (currentUser) {
        await updateProfile(currentUser, { displayName: normalizedUsername });
      }
      await updateUserMutation.mutateAsync({ data: { displayName: normalizedUsername } });
      setUser({ ...user, displayName: normalizedUsername });
      toast.success('Username updated.');
      handleClose();
    } catch (_error) {
      toast.error('Failed to update username.');
    }
  };

  const handleCancelDialogChange = (open: boolean) => {
    setCancelDialogOpen(open);
    if (!open) {
      setCancelReason(undefined);
      setCancelDetails('');
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeleteConfirmText('');
    }
  };

  const handleTabChange = (value: string) => {
    const nextTab = value as SettingsTabValue;
    const nextPath = settingsTabRoutes[nextTab];
    if (!nextPath) return;
    if (pathname !== nextPath) {
      router.push(nextPath);
    }
  };

  const handleCancelSubmit = () => {
    if (!canCancel || cancelSubscriptionMutation.isPending) return;
    const trimmedDetails = cancelDetails.trim();
    cancelSubscriptionMutation.mutate({
      data: {
        reason: cancelReason,
        details: trimmedDetails.length > 0 ? trimmedDetails : undefined,
      },
    });
  };

  const handleResumeCancellation = () => {
    if (!canResumeCancellation) return;
    resumeCancellationMutation.mutate();
  };

  const normalizedDeleteConfirm = deleteConfirmText.trim().toUpperCase();
  const canDeleteAccount =
    !!user && normalizedDeleteConfirm === 'DELETE' && !deleteUserMutation.isPending;

  const handleDeleteAccount = async () => {
    if (!user || !canDeleteAccount) return;
    try {
      await deleteUserMutation.mutateAsync();
      queryClient.clear();
      clearProject();
      setDeleteDialogOpen(false);
      toast.success('Account deleted.');
      await signOutUser();
      router.push(paths.home);
    } catch (_error) {
      toast.error('Failed to delete account.');
    }
  };

  const usageData = usageQuery.data?.status === 200 ? usageQuery.data.data : null;
  const usageItems =
    usageData && usageData.monthlyCredits > 0
      ? [
          {
            id: 'credits',
            label: 'Credits used',
            used: usageData.usedCredits,
            limit: usageData.monthlyCredits,
          },
        ]
      : [];
  const usageResetDate = usageData?.periodEnd ? formatBillingDate(usageData.periodEnd) : null;
  const isUsageLoading = usageQuery.isLoading;

  const handleSelectProject = (id: string, name: string) => {
    setProject(id, name);
    router.push(buildStudioPath(id));
  };

  const handleCloseProject = () => {
    clearProject();
    router.push(paths.studio);
  };

  const handleOpenNewPackPage = () => {
    router.push(buildStudioNewPath());
  };

  if (authStatus !== 'authenticated') {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen">
      <ProjectListDialog
        open={projectListDialogOpen}
        onOpenChange={setProjectListDialogOpen}
        onSelectProject={handleSelectProject}
        onDeleteCurrentProject={handleCloseProject}
      />
      <StudioHeader
        projectMenuOpen={projectMenuOpen}
        onProjectMenuChange={setProjectMenuOpen}
        onSelectProject={handleSelectProject}
        onCloseProject={handleCloseProject}
        onOpenProjectManager={() => setProjectListDialogOpen(true)}
        showBrand
        projectMenuRightSlot={
          <>
            <Button asChild type="button" variant="ghost" size="icon">
              <a href={paths.studio} aria-label="Studio home">
                <Home className="size-5" />
              </a>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Create new pack"
              onClick={handleOpenNewPackPage}
            >
              <Sparkles className="size-5" />
            </Button>
            <Button
              type="button"
              size="sm"
              className="hidden rounded-lg md:inline-flex"
              onClick={handleOpenNewPackPage}
            >
              <Sparkles className="size-4" />
              New Pack
            </Button>
          </>
        }
      />

      <main className="min-h-[calc(100vh-72px)] px-6 py-8">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Settings</h1>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            orientation="vertical"
            className="flex w-full flex-col gap-6 lg:flex-row"
          >
            <TabsList className="flex h-auto w-full !flex-row flex-nowrap items-center justify-start gap-2 overflow-x-auto bg-transparent p-0 lg:w-60 lg:!flex-col lg:flex-nowrap lg:overflow-visible">
              {settingsTabs.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex h-10 !w-auto flex-none justify-start gap-2 px-3 py-2 lg:!w-full"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1">
              <div className="px-0 pb-6 pt-0 md:px-10 md:pb-8 md:pt-0">
                <TabsContent value="account" className="mt-0 space-y-8">
                  <section className="space-y-4">
                    <h2 className="text-lg font-semibold">Profile</h2>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor={usernameInputId}
                          className="text-muted-foreground"
                        >
                          Username
                        </Label>
                        <Input
                          id={usernameInputId}
                          value={username}
                          onChange={(event) =>
                            setUsername(event.target.value.slice(0, DEFAULT_FORM_MAX_CHARS))
                          }
                          disabled={isSaving}
                          maxLength={DEFAULT_FORM_MAX_CHARS}
                        />
                        <p className="text-right text-xs text-muted-foreground">
                          {username.length}/{DEFAULT_FORM_MAX_CHARS}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor={emailInputId}
                          className="text-muted-foreground"
                        >
                          Email
                        </Label>
                        <Input
                          id={emailInputId}
                          type="email"
                          value={user?.email ?? ''}
                          readOnly
                          disabled
                        />
                      </div>
                    </div>
                  </section>

                  <div className="flex flex-wrap justify-end gap-3">
                    <Button variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleSave}
                      disabled={isSaving || !normalizedUsername}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>

                  <section className="space-y-4">
                    <h2 className="text-lg font-semibold">Delete account</h2>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="sm:flex-1" />
                      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={!user || deleteUserMutation.isPending}
                            className="w-auto self-end"
                          >
                            {deleteUserMutation.isPending ? 'Deleting...' : 'Delete account'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {shouldWarnBillingOnDelete
                                ? 'If you have an active subscription, it will be canceled immediately and your remaining access will end.'
                                : 'This action cannot be undone.'}
                              You will not be able to restore your account after deletion.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-2">
                            <Label htmlFor={deleteConfirmId}>Type "DELETE" to confirm.</Label>
                            <Input
                              id={deleteConfirmId}
                              value={deleteConfirmText}
                              onChange={(event) => setDeleteConfirmText(event.target.value)}
                              placeholder="DELETE"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(event) => {
                                event.preventDefault();
                                void handleDeleteAccount();
                              }}
                              variant="outline"
                              disabled={!canDeleteAccount}
                            >
                              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="billing" className="mt-0 space-y-8">
                  <section className="space-y-4">
                    <h2 className="text-lg font-semibold">Current plan</h2>
                    <div className="flex flex-col gap-4 p-6">
                      <div className="space-y-1">
                        {isBillingStatusLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-56 max-w-full" />
                            <Skeleton className="h-4 w-40 max-w-full" />
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{planSummary}</p>
                              {billingStatus?.cancelAtPeriodEnd && (
                                <Badge variant="secondary" className="text-foreground">
                                  Cancellation scheduled
                                </Badge>
                              )}
                            </div>
                            {periodLabelText && (
                              <p className="text-sm text-muted-foreground">{periodLabelText}</p>
                            )}
                            {hasActiveSubscription && !activePlan && (
                              <p className="text-sm text-muted-foreground">
                                Your subscription is active, but the plan details are not mapped
                                yet.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      {!isBillingStatusLoading && hasNoSubscription && (
                        <div>
                          <Button size="sm" onClick={() => router.push(paths.plan)}>
                            View plans
                          </Button>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="space-y-5">
                    <h2 className="text-lg font-semibold">Usage</h2>
                    <div className="space-y-5">
                      {isUsageLoading ? (
                        <Skeleton className="h-4 w-40 max-w-full" />
                      ) : (
                        usageResetDate && (
                          <p className="text-sm text-muted-foreground">
                            Usage resets on {usageResetDate}.
                          </p>
                        )
                      )}
                      {isUsageLoading ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                          <Skeleton className="h-2.5 w-full" />
                        </div>
                      ) : usageItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Choose a plan to unlock more credits.
                        </p>
                      ) : (
                        usageItems.map((item) => {
                          const percentage = getUsagePercentage(item.used, item.limit);
                          return (
                            <div key={item.id} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {item.label}
                                </span>
                                <span className="text-muted-foreground">
                                  {formatUsageValue(item.used)} / {formatUsageValue(item.limit)}
                                </span>
                              </div>
                              <Progress
                                value={percentage}
                                className="h-2.5 bg-muted [&_[data-slot=progress-indicator]]:bg-primary"
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-semibold">Payment method</h2>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="sm:flex-1" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenPortal}
                        disabled={!canOpenPortal}
                      >
                        {portalSessionMutation.isPending ? 'Opening...' : 'Manage'}
                      </Button>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-semibold">Billing history</h2>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="sm:flex-1" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenPortal}
                        disabled={!canOpenPortal}
                      >
                        {portalSessionMutation.isPending ? 'Opening...' : 'View in portal'}
                      </Button>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-lg font-semibold">Cancel</h2>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="sm:flex-1" />
                      {billingStatus?.cancelAtPeriodEnd ? (
                        <Button
                          variant="outline"
                          onClick={handleResumeCancellation}
                          disabled={!canResumeCancellation}
                          className="w-auto self-end"
                        >
                          {resumeCancellationMutation.isPending
                            ? 'Resuming...'
                            : 'Resume cancellation'}
                        </Button>
                      ) : (
                        <Dialog open={cancelDialogOpen} onOpenChange={handleCancelDialogChange}>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              disabled={!canCancel}
                              className="w-auto self-end"
                            >
                              Cancel plan
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                              <DialogTitle>Cancel plan</DialogTitle>
                              <DialogDescription>{cancelDialogDescription}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor={cancelReasonId}>
                                  What is the main reason for canceling?
                                </Label>
                                <Select
                                  value={cancelReason ?? ''}
                                  onValueChange={handleCancelReasonChange}
                                >
                                  <SelectTrigger id={cancelReasonId}>
                                    <SelectValue placeholder="Select a reason" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pricing">Too expensive</SelectItem>
                                    <SelectItem value="features">Missing features</SelectItem>
                                    <SelectItem value="complex">Too hard to use</SelectItem>
                                    <SelectItem value="switch">
                                      Switching to another service
                                    </SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={cancelDetailsId}>
                                  Please briefly describe what led to this decision.
                                </Label>
                                <Textarea
                                  id={cancelDetailsId}
                                  value={cancelDetails}
                                  onChange={(event) =>
                                    setCancelDetails(
                                      event.target.value.slice(0, DEFAULT_FORM_MAX_CHARS),
                                    )
                                  }
                                  maxLength={DEFAULT_FORM_MAX_CHARS}
                                  rows={4}
                                />
                                <p className="text-right text-xs text-muted-foreground">
                                  {cancelDetails.length}/{DEFAULT_FORM_MAX_CHARS}
                                </p>
                              </div>
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Back</Button>
                              </DialogClose>
                              <Button
                                variant="destructive"
                                onClick={handleCancelSubmit}
                                disabled={!canCancel || cancelSubscriptionMutation.isPending}
                              >
                                {cancelSubscriptionMutation.isPending
                                  ? 'Processing...'
                                  : 'Cancel plan'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </section>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
