type SharedPlanDefinition = {
  name: string;
  description: string;
  price: string;
  billing: string;
  priceNote: string;
  features: Array<string>;
  limitResetNote: string;
};

export const planDefinitions = {
  pro: {
    name: 'Pro',
    description: '7-day free trial. Card required. Cancel before renewal to avoid billing.',
    price: '$17',
    billing: 'per month after trial',
    priceNote: 'Excl. tax',
    features: [
      'Generate designs from prompts in Create mode',
      'Edit models with structure tree and transform controls',
      'Export GLB, STL, and JavaScript assets',
      'Save edited models back to the design',
      'Manage project-based design history',
      '30 generated designs per month',
    ],
    limitResetNote: '* Generated design limits reset monthly (UTC).',
  },
} satisfies Record<string, SharedPlanDefinition>;
