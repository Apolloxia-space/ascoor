export const paths = {
  home: '/',
  pricing: '/pricing',
  studio: '/studio',
  plan: '/plans',
  settingsAccount: '/settings/account',
  settingsBilling: '/settings/billing',
  docs: '/docs',
  commerceDisclosure: '/commerce-disclosure',
  terms: '/terms',
  privacy: '/privacy',
} as const;

export type PathKey = keyof typeof paths;
