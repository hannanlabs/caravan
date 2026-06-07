'use client';

import { useEffect, useState } from 'react';
import type { WorldData } from '../../lib/spacetimedb-server';
import { MAX_YEAR } from './TopBar';
import { IconReset } from '../icons';

interface FooterProps {
  world: WorldData;
  status: string;
  nationCount: number;
  leader?: { name: string; gdpShort: string };
  onReset: () => void;
  isActive: boolean;
}

export function Footer({ world, status, nationCount, leader, onReset, isActive }: FooterProps) {
  const [now, setNow] = useState<string>('--:--:--');
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().substring(11, 19));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const handleReset = () => {
    if (confirm('Reset the game? All nations + trades + trust will be wiped and the seed bots re-seeded.')) {
      onReset();
    }
  };

  let pillClass = 'pill-off';
  if (isActive) {
    if (status === 'Running') pillClass = 'pill-live';
    else if (status === 'Ended') pillClass = 'pill-ended';
    else pillClass = 'pill-lobby';
  }

  return (
    <div className="footer">
      <span className="f-item">UTC {now}</span>
      <span className="f-sep" />
      <span className="f-item">Year {world.year.toFixed(2)} / {MAX_YEAR}</span>
      <span className={`pill ${pillClass}`} style={{ height: 22 }}><span className="dot" />{status}</span>
      <span className="footer-spacer" />
      <span className="ticker">
        {nationCount} nation{nationCount === 1 ? '' : 's'} playing
        {leader ? ` · ${leader.name} leads at ${leader.gdpShort}` : ''}
      </span>
      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--neg)' }} disabled={!isActive} onClick={handleReset}>
        <IconReset size={15} />Reset
      </button>
    </div>
  );
}
