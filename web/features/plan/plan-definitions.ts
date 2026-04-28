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
    description: 'Try Ascoor with a small monthly credit allowance.',
    price: '$0',
    billing: 'per month',
    priceNote: 'No card required',
    features: [
      '5 monthly credits',
      '1 concurrent pack generation',
    ],
    limitResetNote: '* Credits reset monthly (UTC). 1 completed asset uses 1 credit.',
  },
  hobby: {
    name: 'Hobby',
    description: 'For solo developers who need more monthly generation capacity.',
    price: '$5',
    billing: 'per month',
    priceNote: 'Excl. tax',
    features: [
      '50 monthly credits',
      '2 concurrent pack generations',
    ],
    limitResetNote: '* Credits reset monthly (UTC). 1 completed asset uses 1 credit.',
  },
  pro: {
    name: 'Pro',
    description: 'For heavier asset pack workflows and higher monthly output.',
    price: '$9',
    billing: 'per month',
    priceNote: 'Excl. tax',
    features: [
      '150 monthly credits',
      '3 concurrent pack generations',
    ],
    limitResetNote: '* Credits reset monthly (UTC). 1 completed asset uses 1 credit.',
  },
} satisfies Record<string, SharedPlanDefinition>;
