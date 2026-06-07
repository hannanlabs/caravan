'use client';

import type { WorldData } from '../../lib/spacetimedb-server';
import { BrandMark } from '../BrandMark';

export const MAX_YEAR = 100;

interface TopBarProps {
  world: WorldData;
  status: string;
  nationCount: number;
  isActive: boolean;
}

export function TopBar({ world, status, nationCount, isActive }: TopBarProps) {
  let pillClass = 'pill-off';
  let pillText = 'Offline';
  if (isActive) {
    if (status === 'Running') { pillClass = 'pill-live'; pillText = 'Live'; }
    else if (status === 'Ended') { pillClass = 'pill-ended'; pillText = 'Ended'; }
    else { pillClass = 'pill-lobby'; pillText = 'Lobby'; }
  }

  return (
    <div className="topbar">
      <span aria-hidden />
      <div className="brand">
        <BrandMark priority size={38} />
        <span className="brand-title">Caravan</span>
      </div>
      <div className="world-meta">
        <div className="wm-item">
          <span className="wm-label">Game year</span>
          <span className="wm-value tnum">{world.year.toFixed(2)} / {MAX_YEAR}</span>
        </div>
        <div className="v-sep" />
        <div className="wm-item">
          <span className="wm-label">Nations</span>
          <span className="wm-value tnum">{nationCount}</span>
        </div>
        <span className={`pill ${pillClass}`}><span className="dot" />{pillText}</span>
      </div>
    </div>
  );
}
