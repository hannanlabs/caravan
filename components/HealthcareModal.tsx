'use client';

import { AssetShopModal } from './AssetShopModal';
import { IconPulse } from './icons';
import type { ShopModalProps } from './MilitaryModal';

export function HealthcareModal(props: ShopModalProps) {
  return (
    <AssetShopModal
      {...props}
      category="health"
      title="Healthcare"
      sub="Build facilities — population health"
      icon={<IconPulse />}
    />
  );
}
