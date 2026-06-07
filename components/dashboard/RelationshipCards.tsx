'use client';

import { flagFor } from '../../lib/countries';
import { formatGdpShort } from '../../lib/format';
import type { NationData } from '../../lib/spacetimedb-server';

interface RelationshipCardsProps {
  nations: readonly NationData[];
  identity?: { toHexString(): string };
  trustOut: Map<string, number>;
  winnerHex?: string;
}

export function RelationshipCards({ nations, identity, trustOut, winnerHex }: RelationshipCardsProps) {
  const myHex = identity?.toHexString();
  const others = nations.filter((n) => n.owner.toHexString() !== myHex);

  const allies: NationData[] = [];
  const rivals: NationData[] = [];
  const neutral: NationData[] = [];
  for (const n of others) {
    const t = trustOut.get(n.owner.toHexString());
    if (t === undefined) neutral.push(n);
    else if (t > 60) allies.push(n);
    else if (t < 40) rivals.push(n);
    else neutral.push(n);
  }

  return (
    <>
      <RelCard title="Allies" tone="ally" nations={allies} trustOut={trustOut} winnerHex={winnerHex} />
      <RelCard title="Rivals" tone="rival" nations={rivals} trustOut={trustOut} winnerHex={winnerHex} />
      <RelCard title="Neutral" tone="neutral" nations={neutral} trustOut={trustOut} winnerHex={winnerHex} />
    </>
  );
}

function RelCard({
  title, tone, nations, trustOut, winnerHex,
}: {
  title: string;
  tone: 'ally' | 'rival' | 'neutral';
  nations: NationData[];
  trustOut: Map<string, number>;
  winnerHex?: string;
}) {
  const toneColor = tone === 'ally' ? '#2ed573' : tone === 'rival' ? '#ff4757' : '#ffc107';
  return (
    <div className="card" style={{ minHeight: 0 }}>
      <div className="card-title" style={{ color: toneColor }}>
        {title} ({nations.length})
      </div>
      {nations.length === 0 ? (
        <div className="card-empty" style={{ padding: '6px 0', fontSize: 11 }}>None</div>
      ) : (
        <div className="nation-list" style={{ maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
          {nations.map((n) => {
            const hex = n.owner.toHexString();
            const t = trustOut.get(hex);
            const winner = winnerHex === hex;
            return (
              <div key={hex} className="nation-row" style={winner ? { background: '#2ed57320' } : undefined}>
                <div className="nation-row-flag-emoji">{flagFor(n.name)}</div>
                <div>
                  <div className="nation-row-name">{winner && '🏆 '}{n.name}</div>
                  <div className="nation-row-meta">GDP {formatGdpShort(n.gdp)}</div>
                </div>
                <div className="nation-row-trust" style={{ color: toneColor }}>
                  {t === undefined ? '—' : `Trust: ${t}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
