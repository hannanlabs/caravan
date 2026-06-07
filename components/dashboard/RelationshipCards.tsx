'use client';

import { flagFor } from '../../lib/countries';
import { formatGdpShort } from '../../lib/format';
import type { NationData } from '../../lib/spacetimedb-server';
import { IconUsers } from '../icons';

interface RelationshipCardsProps {
  nations: readonly NationData[];
  identity?: { toHexString(): string };
  trustOut: Map<string, number>;
  winnerHex?: string;
}

type Tone = 'ally' | 'neutral' | 'rival';

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
    <div className="card card-pad">
      <div className="card-title" style={{ marginBottom: 12 }}>
        <span className="ct-label">Relations</span>
        <span style={{ color: 'var(--ink-4)', display: 'inline-flex' }}><IconUsers size={16} /></span>
      </div>
      <RelGroup tone="ally" label="Allies" nations={allies} trustOut={trustOut} winnerHex={winnerHex} />
      <RelGroup tone="neutral" label="Neutral" nations={neutral} trustOut={trustOut} winnerHex={winnerHex} />
      <RelGroup tone="rival" label="Rivals" nations={rivals} trustOut={trustOut} winnerHex={winnerHex} />
      {others.length === 0 && (
        <div className="empty" style={{ marginTop: 4 }}>No other nations yet.</div>
      )}
    </div>
  );
}

function RelGroup({
  tone, label, nations, trustOut, winnerHex,
}: {
  tone: Tone;
  label: string;
  nations: NationData[];
  trustOut: Map<string, number>;
  winnerHex?: string;
}) {
  if (nations.length === 0) return null;
  return (
    <div className="rel-group">
      <div className={`rel-head rel-${tone}`}>
        <span className="rel-dot" />
        <span className="rh-label">{label}</span>
        <span className="rh-count">{nations.length}</span>
      </div>
      {nations.map((n) => {
        const hex = n.owner.toHexString();
        const t = trustOut.get(hex);
        const winner = winnerHex === hex;
        return (
          <div className="nrow" key={hex}>
            <span className="nrow-flag">{flagFor(n.name)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="nrow-name">{winner && '🏆 '}{n.name}</div>
              <div className="nrow-gdp">GDP {formatGdpShort(n.gdp)}</div>
            </div>
            <div className={`nrow-trust rel-${tone}`}>{t === undefined ? '—' : t}</div>
          </div>
        );
      })}
    </div>
  );
}
