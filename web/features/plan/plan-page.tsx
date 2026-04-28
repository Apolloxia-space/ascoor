'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { PlanInclusions } from '@/features/plan/components/plan-inclusions';
import { planDefinitions } from '@/features/plan/plan-definitions';
import { useCreateCheckoutSession, useGetBillingStatus } from '@/shared/api/generated/client';
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
  freePlan?: boolean;
  planKey?: 'hobby' | 'pro';
};

const planGroup: { subtitle: string; plans: Array<PlanCard>; footnote?: string } = {
  subtitle: 'Create cohesive asset packs for a smoother game workflow.',
  footnote: 'Credits reset monthly. Paid plans renew monthly.',
  plans: [
    {
      ...planDefinitions.free,
      cta: 'Current free plan',
      freePlan: true,
    },
    {
      ...planDefinitions.hobby,
      cta: 'Upgrade to Hobby',
      highlight: true,
      planKey: 'hobby',
    },
    {
      ...planDefinitions.pro,
      cta: 'Upgrade to Pro',
      planKey: 'pro',
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
      toast.success('Checkout completed.');
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

  const handleUpgrade = async (planKey?: 'hobby' | 'pro') => {
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
    checkoutMutation.mutate({ data: planKey ? { planKey } : {} });
  };

  if (authStatus !== 'authenticated') {
    return <div className="min-h-screen bg-[color:var(--background-base)]" />;
  }

  return (
    <div className="min-h-screen bg-[#f7fbf7] text-[#233226]">
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
              <AlertDialogAction onClick={() => setCheckoutDialogMode(null)}>OK</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <header className="mx-auto w-full max-w-6xl px-6 pt-8">
          <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Back">
            <ArrowLeft className="size-5" />
          </Button>

          <div className="mt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#5c6f61]">
              Pricing
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              Full asset packs built around one theme in minutes.
            </h1>
            <p className="mt-4 text-sm text-[#5c6f61] md:text-base">{planGroup.subtitle}</p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {planGroup.plans.map((plan) => {
              const isCurrentPlan = plan.name === planDefinitions.pro.name && isCurrentProPlan;
              const ctaLabel = checkoutMutation.isPending
                ? 'Redirecting...'
                : billingQuery.isLoading
                  ? 'Loading...'
                  : plan.freePlan
                    ? plan.cta
                    : hasOngoingSubscription
                      ? 'Manage subscription'
                      : plan.cta;

              return (
                <article
                  key={plan.name}
                  className={cn(
                    'relative flex h-full flex-col rounded-lg border bg-white p-6',
                    plan.highlight &&
                      'border-[#b7d8bd] shadow-[0_16px_36px_rgba(35,50,38,0.06)]',
                    !plan.highlight && 'border-[#dce8dc]',
                  )}
                >
                  {(isCurrentPlan || plan.badge) && (
                    <span className="absolute right-5 top-5 rounded-full bg-[#f6dde1] px-3 py-1 text-[11px] font-semibold text-[#9f5964]">
                      {isCurrentPlan ? 'Current Plan' : plan.badge}
                    </span>
                  )}

                  <div>
                    <h2 className="text-lg font-semibold text-[#233226]">{plan.name}</h2>
                    <p className="mt-1 text-xs text-[#5c6f61]">{plan.description}</p>
                  </div>

                  <div className="mt-8 space-y-1">
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-semibold text-[#233226]">{plan.price}</span>
                      {plan.billing && (
                        <span className="text-sm text-[#5c6f61]">{plan.billing}</span>
                      )}
                    </div>
                    {plan.priceNote && <p className="text-xs text-[#5c6f61]">{plan.priceNote}</p>}
                  </div>

                  <Button
                    type="button"
                    disabled={plan.freePlan || checkoutMutation.isPending || billingQuery.isLoading}
                    onClick={() => {
                      if (plan.freePlan) return;
                      void handleUpgrade(plan.planKey);
                    }}
                    className={cn(
                      'mt-6 h-11 rounded-md text-sm font-semibold',
                      plan.highlight
                        ? 'bg-[#e7a8b0] text-[#233226] hover:bg-[#de959f]'
                        : 'border border-[#dce8dc] bg-white text-[#233226] hover:bg-[#f3f7f3]',
                    )}
                  >
                    {isCurrentPlan ? 'Manage subscription' : ctaLabel}
                  </Button>

                  <PlanInclusions
                    className="mt-8 border-t border-[#dce8dc] pt-6"
                    titleClassName="text-xs font-semibold uppercase tracking-[0.24em] text-[#5c6f61]"
                    listClassName="mt-4 space-y-3 text-sm text-[#5c6f61]"
                    itemClassName="flex items-start gap-3"
                    iconClassName="mt-0.5 text-[#2f7a4b]"
                    noteClassName="mt-4 text-xs text-[#5c6f61]"
                    features={plan.features}
                    limitResetNote={plan.limitResetNote}
                  />
                </article>
              );
            })}
          </div>

          {planGroup.footnote && (
            <div className="mt-8 space-y-3 text-center text-xs text-[#5c6f61]">
              <p>{planGroup.footnote}</p>
              <a
                className="text-[#233226] underline-offset-4 hover:underline"
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
