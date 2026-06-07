'use client';

import { useEffect, useState } from 'react';
import { flagFor } from '../../lib/countries';
import { relativeTime } from '../../lib/format';
import type { Infer } from 'spacetimedb';
import WorldEventRow from '../../src/module_bindings/world_event_table';

type WorldEventData = Infer<typeof WorldEventRow>;

export function WorldEventsCard({ events }: { events: readonly WorldEventData[] }) {
  // Tick once per second so relative times update on screen.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const recent = [...events].sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 8);

  return (
    <div className="card" style={{ maxHeight: 220, overflow: 'hidden' }}>
      <div className="card-title">World Events ({events.length})</div>
      {recent.length === 0 ? (
        <div className="card-empty" style={{ padding: '12px 0', fontSize: 12 }}>
          Nothing's happened yet. Claim, start, trade…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', minHeight: 0 }}>
          {recent.map((e) => (
            <EventRow key={e.id.toString()} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: WorldEventData }) {
  const flag = event.actorName === 'System' ? '⚙' : flagFor(event.actorName);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0' }}>
      <span style={{ fontSize: 14, lineHeight: 1.2, flex: '0 0 auto' }}>{flag}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#e5eaf2', lineHeight: 1.3 }}>{event.text}</div>
        <div style={{ fontSize: 9, color: '#5a6580', letterSpacing: 0.04 }}>
          Year {event.year.toFixed(2)} · {relativeTime(event.createdAt)}
        </div>
      </div>
    </div>
  );
}
