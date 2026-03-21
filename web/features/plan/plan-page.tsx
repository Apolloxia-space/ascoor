'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { PlanInclusions } from '@/features/plan/components/plan-inclusions';
import { planDefinitions } from '@/features/plan/plan-definitions';
import {
  useCreateCheckoutSession,
  useGetBillingStatus,
} from '@/shared/api/generated/client';
import type { ApiError } from '@/shared/api/fetcher';
import { paths } from '@shared/constants/paths';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/components/ui/alert-dialog';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/lib/utils';

const ongoingSubscriptionStatuses = new Set([
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'paused',
]);

type CheckoutDialogMode = 'alreadySubscribed' | 'checkoutError' | 'paymentFailed';

type PlanCard = {
  name: string;
  description: string;
  limitResetNote: string;
  price: string;
  priceNote?: string;
  billing?: string;
  cta: string;
  highlight?: boolean;
  badge?: string;
  features: Array<string>;
  icon: typeof Sparkles;
};

const planGroup: { subtitle: string; plans: Array<PlanCard>; footnote?: string } = {
  subtitle: 'Subscribe to Pro to unlock Ascoor design generation.',
  footnote: 'Subscriptions renew monthly. Cancel anytime from Billing settings.',
  plans: [
    {
      ...planDefinitions.pro,
      cta: 'Upgrade to Pro',
      highlight: true,
      badge: 'Most Popular',
      icon: Sparkles,
    },
  ],
};

export function PlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const lastStatusRef = useRef<string | null>(null);
  const [checkoutDialogMode, setCheckoutDialogMode] = useState<CheckoutDialogMode | null>(null);

  const billingQuery = useGetBillingStatus({
    query: {
      enabled: authStatus === 'authenticated' && !!user,
      refetchOnWindowFocus: false,
    },
  });
  const billingStatus = billingQuery.data?.status === 200 ? billingQuery.data.data : undefined;
  const hasOngoingSubscription = ongoingSubscriptionStatuses.has(billingStatus?.status ?? '');
  const isCurrentProPlan =
    hasOngoingSubscription && billingStatus?.plan?.name === planDefinitions.pro.name;
  const canNavigateBilling = authStatus === 'authenticated' && !!user;

  const checkoutMutation = useCreateCheckoutSession<ApiError<{ error?: string }>>({
    mutation: {
      onSuccess: (response) => {
        if (response.status !== 200) {
          setCheckoutDialogMode('checkoutError');
          return;
        }
        const url = response.data.url;
        if (!url) {
          toast.error('Checkout URL is missing.');
          return;
        }
        window.location.assign(url);
      },
      onError: (error) => {
        const errorMessage =
          error?.body && typeof error.body === 'object'
            ? (error.body as { error?: string }).error
            : undefined;
        if (error?.status === 409 || errorMessage === 'subscription_already_active') {
          setCheckoutDialogMode('alreadySubscribed');
          return;
        }
        setCheckoutDialogMode('checkoutError');
      },
    },
  });

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace(paths.home);
    }
  }, [authStatus, router]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (!status) return;
    if (lastStatusRef.current === status) return;
    lastStatusRef.current = status;

    if (status === 'success') {
      toast.success('Subscription activated.');
      router.replace(paths.settingsBilling);
      return;
    }
    if (status === 'cancel') {
      toast('Checkout was canceled.');
      return;
    }
    if (status === 'failed') {
      setCheckoutDialogMode('paymentFailed');
    }
  }, [searchParams, router]);

  const handleBack = () => {
    router.push(paths.studio);
  };

  const handleUpgrade = async () => {
    if (checkoutMutation.isPending) return;
    if (authStatus === 'loading') {
      toast('Checking your session...');
      return;
    }
    if (!user) {
      router.replace(paths.home);
      return;
    }
    if (hasOngoingSubscription) {
      router.push(paths.settingsBilling);
      return;
    }
    checkoutMutation.mutate({ data: {} });
  };

  if (authStatus !== 'authenticated') {
    return <div className="min-h-screen bg-[color:var(--background-base)]" />;
  }

  return (
    <div className="min-h-screen bg-[color:var(--background-base)] text-foreground">
      <AlertDialog
        open={checkoutDialogMode !== null}
        onOpenChange={(open) => {
          if (!open) setCheckoutDialogMode(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {checkoutDialogMode === 'alreadySubscribed'
                ? 'Your plan is already active'
                : checkoutDialogMode === 'paymentFailed'
                  ? 'Payment could not be completed'
                  : 'Unable to continue checkout'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {checkoutDialogMode === 'alreadySubscribed'
                ? 'You already have an active plan. You can review or update billing from your Billing settings.'
                : checkoutDialogMode === 'paymentFailed'
                  ? 'Your payment did not complete. Please check your payment details and try again.'
                  : 'Something went wrong while starting checkout. Please try again in a moment.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {checkoutDialogMode === 'alreadySubscribed' && canNavigateBilling ? (
              <>
                <AlertDialogCancel>Close</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setCheckoutDialogMode(null);
                    router.push(paths.settingsBilling);
                  }}
                >
                  Open Billing settings
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={() => setCheckoutDialogMode(null)}>
                OK
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-[-220px] top-[-200px] h-[420px] w-[420px] rounded-full bg-[color:var(--accent-purple)]/30 blur-[160px]" />
        <div className="pointer-events-none absolute right-[-120px] top-[120px] h-[360px] w-[360px] rounded-full bg-[color:var(--brand-500-60)]/40 blur-[140px]" />

        <header className="mx-auto w-full max-w-6xl px-6 pt-8">
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back">
            <ArrowLeft className="size-5" />
          </Button>

          <div className="mt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
              Pricing
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
              One plan, full access
            </h1>
            <p className="mt-2 text-sm text-white/60 md:text-base">{planGroup.subtitle}</p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
          <div className="mx-auto grid max-w-xl gap-6">
            {planGroup.plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = isCurrentProPlan;
              const ctaLabel = checkoutMutation.isPending
                ? 'Redirecting...'
                : billingQuery.isLoading
                  ? 'Loading...'
                  : hasOngoingSubscription
                    ? 'Manage subscription'
                    : plan.cta;

              return (
                <article
                  key={plan.name}
                  className={cn(
                    'relative flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 text-white/90 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.7)] backdrop-blur',
                    plan.highlight &&
                      'border-[color:var(--brand-500)]/60 bg-gradient-to-b from-white/10 via-white/5 to-transparent shadow-[0_0_0_1px_rgba(218,154,157,0.45),0_35px_80px_-50px_rgba(218,154,157,0.75)]',
                  )}
                >
                  {(isCurrentPlan || plan.badge) && (
                    <span className="absolute right-5 top-5 rounded-full bg-[color:var(--brand-500)]/20 px-3 py-1 text-[11px] font-semibold text-[color:var(--brand-500)]">
                      {isCurrentPlan ? 'Current Plan' : plan.badge}
                    </span>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
                        <Icon className="size-5 text-white/80" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
                        <p className="text-xs text-white/50">{plan.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-1">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-semibold text-white">{plan.price}</span>
                      {plan.billing && (
                        <span className="text-sm text-white/60">{plan.billing}</span>
                      )}
                    </div>
                    {plan.priceNote && <p className="text-xs text-white/45">{plan.priceNote}</p>}
                  </div>

                  <Button
                    type="button"
                    disabled={checkoutMutation.isPending || billingQuery.isLoading}
                    onClick={handleUpgrade}
                    className={cn(
                      'mt-6 h-11 rounded-full text-sm font-semibold',
                      plan.highlight
                        ? 'bg-white text-[#1f2328] hover:bg-white/90'
                        : 'bg-white/10 text-white hover:bg-white/15',
                    )}
                  >
                    {isCurrentPlan ? 'Manage subscription' : ctaLabel}
                  </Button>

                  <PlanInclusions
                    className="mt-8 border-t border-white/10 pt-6"
                    title="What's included"
                    titleClassName="text-xs font-semibold uppercase tracking-[0.24em] text-white/40"
                    listClassName="mt-4 space-y-3 text-sm text-white/70"
                    itemClassName="flex items-start gap-3"
                    iconClassName="mt-0.5 text-[color:var(--brand-500)]"
                    noteClassName="mt-4 text-xs text-white/45"
                    features={plan.features}
                    limitResetNote={plan.limitResetNote}
                  />
                </article>
              );
            })}
          </div>

          {planGroup.footnote && (
            <div className="mt-8 space-y-3 text-center text-xs text-white/40">
              <p>{planGroup.footnote}</p>
              <a
                className="text-white/70 underline-offset-4 hover:underline"
                href={paths.commerceDisclosure}
              >
                Commercial Disclosure
              </a>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
