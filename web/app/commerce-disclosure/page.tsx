import type { Metadata } from 'next';
import { LandingFooter } from '@/features/landing/landing-footer';
import { LandingHeader } from '@/features/landing/landing-header';

export const metadata: Metadata = {
  title: 'Commercial Disclosure',
  description:
    'Specified Commercial Transactions Act disclosure and seller information for Ascoor subscriptions.',
  alternates: {
    canonical: '/commerce-disclosure',
  },
};

const disclosures = [
  {
    label: '販売事業者名 / Seller',
    value: '請求時に遅滞なく開示 / Will be disclosed without delay upon request.',
  },
  {
    label: '所在地 / Business Address',
    value: '請求時に遅滞なく開示 / Will be disclosed without delay upon request.',
  },
  {
    label: '電話番号 / Phone Number',
    value: '請求時に遅滞なく開示 / Will be disclosed without delay upon request.',
  },
  {
    label: 'メールアドレス / Email Address',
    value: 'support@apolloxia.com',
  },
  {
    label: '対応時間 / Support Hours',
    value:
      'メールは24時間受付。1週間以内を目安に返信します。 / Email accepted 24/7. We aim to reply within one week.',
  },
  {
    label: '運営責任者 / Operator',
    value: '西田瑛',
  },
  {
    label: '販売価格 / Price',
    value:
      'Free: USD 0 / month. Hobby: USD 5 / month. Pro: USD 9 / month（税別 / excl. tax）',
  },
  {
    label: '消費税 / Taxes',
    value:
      '表示価格は税抜。適用される税は決済時に加算。 / Prices exclude tax. Applicable taxes are added at checkout.',
  },
  {
    label: '商品代金以外の必要料金 / Additional Fees',
    value: 'なし / None',
  },
  {
    label: '支払方法 / Payment Methods',
    value: 'クレジットカード（Stripe） / Credit card (Stripe)',
  },
  {
    label: '支払時期 / Payment Timing',
    value: '申込時に課金、以降は毎月自動課金 / Charged at signup, then monthly recurring billing.',
  },
  {
    label: '引渡時期 / Delivery Time',
    value: '決済完了後、即時提供 / Provided immediately after payment.',
  },
  {
    label: '返品・キャンセル / Refunds & Cancellations',
    value:
      '返金はお受けしておりません。解約はいつでも可能で、次回更新日まで利用できます。 / Refunds are not provided. You may cancel anytime, and your access will remain until the next renewal date.',
  },
  {
    label: '動作環境 / System Requirements',
    value: 'Google Chrome（最新バージョン） / Google Chrome (latest version)',
  },
  {
    label: '申込期間 / Application Period',
    value: '常時受付 / Open year-round',
  },
  {
    label: '販売数量の制限 / Quantity Limit',
    value: 'なし / None',
  },
] as const;

export default function CommerceDisclosurePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <div className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Legal Disclosure / Specified Commercial Transactions
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">特定商取引法に基づく表記</h1>
        </div>

        <div className="mt-10 space-y-4">
          {disclosures.map((item) => (
            <div key={item.label} className="rounded-2xl border border-border/60 bg-card/70 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                {item.label}
              </div>
              <p className="mt-2 text-sm text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      <LandingFooter />
    </main>
  );
}
