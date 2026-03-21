export interface StripeConfig {
  secretKey: string | null;
  webhookSecret: string | null;
}

export function loadStripeConfig(): StripeConfig {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY ?? null,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? null,
  };
}
