'use client';

import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Empty } from './shared';
import { assetsForCategory, canBuildAsset, COMMODITIES, type AssetCategory } from '../spacetimedb/src/market';

export interface AssetShopModalProps {
  open: boolean;
  onClose: () => void;
  isActive: boolean;
  hasNation: boolean;
  category: AssetCategory;
  title: string;
  sub: string;
  icon: ReactNode;
  money: number;
  stock: Record<string, number>;
  ownedCounts: Record<string, number>;
  onBuild: (typeKey: string) => void;
}

export function AssetShopModal(props: AssetShopModalProps) {
  const { open, onClose, isActive, hasNation, category, title, sub, icon, money, stock, ownedCounts, onBuild } = props;
  if (!open) return null;

  if (!hasNation) {
    return (
      <Modal open={open} onClose={onClose} icon={icon} title={title} width={520}>
        <Empty>Claim a nation first.</Empty>
      </Modal>
    );
  }

  const assets = assetsForCategory(category);

  return (
    <Modal open={open} onClose={onClose} icon={icon} title={title} sub={sub} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {assets.map((a) => {
          const check = canBuildAsset(money, stock, a);
          const owned = ownedCounts[a.key] ?? 0;
          return (
            <div className="asset-card" key={a.key}>
              <div className="a-icon">{icon}</div>
              <div className="asset-main">
                <div className="asset-label">
                  {a.label}
                  {owned > 0 && <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}> · owned {owned}</span>}
                </div>
                <div className="asset-meta">
                  +${a.gdpTailwindPerYear}M GDP/yr · +{(a.statBoostPerYear * 100).toFixed(1)} {category}/yr · upkeep ${a.upkeepPerYear}M
                </div>
                <div className="asset-cost">
                  <span className={check.missing === 'money' ? 'lack' : ''}>${a.costMoney}M</span>
                  {a.costs.map((c) => (
                    <span key={c.commodity} className={check.missing === c.commodity ? 'lack' : ''}>
                      {' · '}{c.amount} {COMMODITIES[c.commodity].label}
                    </span>
                  ))}
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                disabled={!isActive || !check.ok}
                onClick={() => onBuild(a.key)}
              >
                Build
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
