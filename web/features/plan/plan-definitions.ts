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
  free: {
    name: 'Free',
    description: 'Try Ascoor with a small monthly generation allowance.',
    price: '$0',
    billing: 'per month',
    priceNote: 'No card required',
    features: [
      '5 generated assets per month',
      'GLB export',
      '1 project',
      'Low-priority generation queue',
      'Prototype use only',
    ],
    limitResetNote: '* Generated asset limits reset monthly (UTC).',
  },
  hobby: {
    name: 'Hobby',
    description: 'For indie developers making prototype game assets.',
    price: '$5',
    billing: 'per month',
    priceNote: 'Excl. tax',
    features: [
      '50 generated assets per month',
      'GLB and OBJ export',
      'Private projects',
      'Commercial use',
      'Basic browser editing',
    ],
    limitResetNote: '* Generated asset limits reset monthly (UTC).',
  },
  pro: {
    name: 'Pro',
    description: 'For heavier prototype workflows and asset pack production.',
    price: '$9',
    billing: 'per month',
    priceNote: 'Excl. tax',
    features: [
      '150 generated assets per month',
      'GLB and OBJ export',
      'Batch export',
      'Asset pack generation',
      'Priority generation queue',
      'No attribution required',
    ],
    limitResetNote: '* Generated asset limits reset monthly (UTC).',
  },
} satisfies Record<string, SharedPlanDefinition>;
