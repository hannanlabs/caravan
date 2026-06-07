'use client';

import { useEffect, useState } from 'react';
import type { WorldData } from '../../lib/spacetimedb-server';

interface FooterProps {
  world: WorldData;
  status: string;
  nationCount: number;
  onReset: () => void;
  isActive: boolean;
}

export function Footer({ world, status, nationCount, onReset, isActive }: FooterProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleReset = () => {
    if (confirm('Reset the game? All nations + trades + trust will be wiped and the seed bots re-seeded.')) {
      onReset();
    }
  };

  return (
    <div className="dash-footer">
      <span>UTC {now.toISOString().substring(11, 19)}</span>
      <span>Game Year {world.year.toFixed(2)} / 100</span>
      <span className={`status-pill ${status.toLowerCase()}`}>{status}</span>
      <span className="breaking">LIVE</span>
      <span className="ticker">
        {nationCount} nation{nationCount === 1 ? '' : 's'} playing · Caravan
      </span>
      <button
        onClick={handleReset}
        disabled={!isActive}
        style={{
          background: 'transparent',
          border: '1px solid #2a3550',
          borderRadius: 4,
          padding: '4px 10px',
          color: '#ff4757',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        Reset
      </button>
    </div>
  );
}
