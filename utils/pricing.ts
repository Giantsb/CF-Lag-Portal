export type PlanCategory = 'unlimited' | 'limited' | 'weekend';

export interface PricingPlan {
  id: string;
  category: PlanCategory;
  categoryLabel: string;
  duration: string;
  price: string;
  perMonth?: string;
  save?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'unlimited-1m',
    category: 'unlimited',
    categoryLabel: 'Unlimited',
    duration: '1 Month',
    price: '₦35,000',
    perMonth: '₦35,000/mo',
  },
  {
    id: 'unlimited-3m',
    category: 'unlimited',
    categoryLabel: 'Unlimited',
    duration: '3 Months',
    price: '₦96,000',
    perMonth: '₦32,000/mo',
    save: 'Save ₦9,000',
  },
  {
    id: 'unlimited-6m',
    category: 'unlimited',
    categoryLabel: 'Unlimited',
    duration: '6 Months',
    price: '₦192,000',
    perMonth: '₦32,000/mo',
    save: 'Save ₦18,000',
  },
  {
    id: 'unlimited-12m',
    category: 'unlimited',
    categoryLabel: 'Unlimited',
    duration: '12 Months',
    price: '₦384,000',
    perMonth: '₦32,000/mo',
    save: 'Save ₦36,000',
  },
  {
    id: 'limited-1m',
    category: 'limited',
    categoryLabel: 'Limited (3x/week)',
    duration: '1 Month',
    price: '₦30,000',
    perMonth: '₦30,000/mo',
  },
  {
    id: 'limited-3m',
    category: 'limited',
    categoryLabel: 'Limited (3x/week)',
    duration: '3 Months',
    price: '₦87,000',
    perMonth: '₦29,000/mo',
    save: 'Save ₦3,000',
  },
  {
    id: 'limited-6m',
    category: 'limited',
    categoryLabel: 'Limited (3x/week)',
    duration: '6 Months',
    price: '₦162,000',
    perMonth: '₦27,000/mo',
    save: 'Save ₦18,000',
  },
  {
    id: 'limited-12m',
    category: 'limited',
    categoryLabel: 'Limited (3x/week)',
    duration: '12 Months',
    price: '₦324,000',
    perMonth: '₦27,000/mo',
    save: 'Save ₦36,000',
  },
  {
    id: 'weekend-1m',
    category: 'weekend',
    categoryLabel: 'Weekend (2x/week)',
    duration: '1 Month',
    price: '₦25,000',
  },
];

export const findMatchingPlan = (
  packageStr?: string,
  durationStr?: string
): PricingPlan | null => {
  if (!packageStr) return null;
  const pkgLower = packageStr.toLowerCase();
  const durLower = (durationStr || '').toLowerCase();

  let matchedCategory: PlanCategory | null = null;
  if (pkgLower.includes('unlimited')) matchedCategory = 'unlimited';
  else if (pkgLower.includes('limited') || pkgLower.includes('3x')) matchedCategory = 'limited';
  else if (pkgLower.includes('weekend')) matchedCategory = 'weekend';

  if (!matchedCategory) return null;

  const categoryPlans = PRICING_PLANS.filter((p) => p.category === matchedCategory);

  if (matchedCategory === 'weekend') {
    return categoryPlans[0] || null;
  }

  const combined = `${pkgLower} ${durLower}`;
  if (combined.includes('12') || combined.includes('year') || combined.includes('annual')) {
    return categoryPlans.find((p) => p.duration.startsWith('12')) || null;
  }
  if (combined.includes('6')) {
    return categoryPlans.find((p) => p.duration.startsWith('6')) || null;
  }
  if (combined.includes('3') && !combined.includes('3x')) {
    return categoryPlans.find((p) => p.duration.startsWith('3')) || null;
  }
  if (combined.includes('1') || combined.includes('month') || combined.includes('30')) {
    return categoryPlans.find((p) => p.duration.startsWith('1 ')) || null;
  }

  return categoryPlans[0] || null;
};
