'use client';

import { flagFor } from '../../lib/countries';
import { formatGdpShort, rankSuffix } from '../../lib/format';
import type { NationData } from '../../lib/spacetimedb-server';

interface LeaderboardProps {
  nations: readonly NationData[]; // expected pre-sorted by GDP, descending
  identity?: { toHexString(): string };
  trustOut?: Map<string, number>;
  winnerHex?: string;
  atWar?: Set<string>;
}

export function RelationshipCards({ nations, identity, winnerHex, atWar }: LeaderboardProps) {
  const myHex = identity?.toHexString();

  return (
    <div className="card card-pad">
      <div className="card-title" style={{ marginBottom: 12 }}>
        <span className="ct-label">Leaderboard</span>
        <span className="rh-count">{nations.length}</span>
      </div>

      {nations.length === 0 ? (
        <div className="empty">No nations yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {nations.map((n, i) => {
            const hex = n.owner.toHexString();
            const rank = i + 1;
            const me = hex === myHex;
            return (
              <div className={`lb-row${me ? ' me' : ''}`} key={hex}>
                <span className={`lb-rank${rank <= 3 ? ` r${rank}` : ''}`}>
                  {rank}<sup>{rankSuffix(rank)}</sup>
                </span>
                <span className="nrow-flag">{flagFor(n.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="nrow-name">
                    {winnerHex === hex && '🏆 '}{atWar?.has(hex) && '⚔ '}{n.name}{me && ' · you'}
                  </div>
                  <div className="nrow-gdp">GDP {formatGdpShort(n.gdp)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
