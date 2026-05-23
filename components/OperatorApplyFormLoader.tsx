'use client';

import { useSearchParams } from 'next/navigation';
import { OperatorApplicationForm } from '@/components/OperatorApplicationForm';

export function OperatorApplyFormLoader() {
  const params = useSearchParams();
  const city = params.get('city')?.trim() ?? '';
  const defaultServiceArea = city
    ? `${city.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}, NJ`
    : '';

  return (
    <OperatorApplicationForm
      defaultServiceArea={defaultServiceArea}
      citySlug={city || undefined}
      source={city ? 'city_page_operator_apply' : 'operators_apply_page'}
    />
  );
}
