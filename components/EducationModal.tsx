'use client';

import { AssetShopModal } from './AssetShopModal';
import { IconBook } from './icons';
import type { ShopModalProps } from './MilitaryModal';

export function EducationModal(props: ShopModalProps) {
  return (
    <AssetShopModal
      {...props}
      category="education"
      title="Education"
      sub="Build schools — human capital"
      icon={<IconBook />}
    />
  );
}
