'use client';

import { AssetShopModal } from './AssetShopModal';
import { IconCpu } from './icons';
import type { ShopModalProps } from './MilitaryModal';

export function TechnologyModal(props: ShopModalProps) {
  return (
    <AssetShopModal
      {...props}
      category="technology"
      title="Technology"
      sub="Build R&D — development and efficiency"
      icon={<IconCpu />}
    />
  );
}
