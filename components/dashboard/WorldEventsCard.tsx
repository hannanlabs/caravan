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

  const recent = [...events].sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 6);

  return (
    <div className="card card-pad">
      <div className="card-title" style={{ marginBottom: 10 }}>
        <span className="ct-label">World events</span>
        <span className="rh-count">{events.length}</span>
      </div>
      {recent.length === 0 ? (
        <div className="empty">Nothing&rsquo;s happened yet. Claim, start, trade…</div>
      ) : (
        recent.map((e) => <EventRow key={e.id.toString()} event={e} />)
      )}
    </div>
  );
}

function EventRow({ event }: { event: WorldEventData }) {
  const flag = event.actorName === 'System' ? '⚙' : flagFor(event.actorName);
  return (
    <div className="event">
      <div className="event-ic">{flag}</div>
      <div className="event-body">
        <div className="event-text">{event.text}</div>
        <div className="event-meta">Year {event.year.toFixed(2)} · {relativeTime(event.createdAt)}</div>
      </div>
    </div>
  );
}
