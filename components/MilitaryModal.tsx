'use client';

import { AssetShopModal } from './AssetShopModal';
import { IconShield } from './icons';

export interface ShopModalProps {
  open: boolean;
  onClose: () => void;
  isActive: boolean;
  hasNation: boolean;
  money: number;
  stock: Record<string, number>;
  ownedCounts: Record<string, number>;
  onBuild: (typeKey: string) => void;
}

export function MilitaryModal(props: ShopModalProps) {
  return (
    <AssetShopModal
      {...props}
      category="military"
      title="Military"
      sub="Build forces — lasting defense and GDP"
      icon={<IconShield />}
    />
  );
}
