'use client';

import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { nationNameForGeo } from '../lib/countries';
import type { NationData } from '../lib/spacetimedb-server';

const geoUrl =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const COLOR_SELF = '#3742fa';
const COLOR_ALLY = '#2ed573';
const COLOR_RIVAL = '#ff4757';
const COLOR_NEUTRAL = '#ffc107';
const COLOR_BOT = '#7a8aa8';
const COLOR_UNCLAIMED = '#1f2940';

interface WorldMapProps {
  myNation?: NationData;
  nations: readonly NationData[];
  trustOut: Map<string, number>;
}

export function WorldMap({ myNation, nations, trustOut }: WorldMapProps) {
  const myName = myNation?.name;
  const nationByName = new Map(nations.map((n) => [n.name, n]));

  function colorForGeo(geoName: string): string {
    const nationName = nationNameForGeo(geoName);
    if (!nationName) return COLOR_UNCLAIMED;
    const nation = nationByName.get(nationName);
    if (!nation) return COLOR_UNCLAIMED;

    if (myName && nationName === myName) return COLOR_SELF;
    if (!myName) return COLOR_BOT;

    const trust = trustOut.get(nation.owner.toHexString());
    if (trust === undefined) return COLOR_BOT;
    if (trust > 60) return COLOR_ALLY;
    if (trust < 40) return COLOR_RIVAL;
    return COLOR_NEUTRAL;
  }

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 130 }}
        style={{ width: '100%', height: 'auto', background: '#0a0e1a' }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }: { geographies: Array<{ rsmKey: string; properties: { name: string } }> }) =>
            geographies.map((geo) => {
              const fill = colorForGeo(geo.properties.name);
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#0a0e1a"
                  strokeWidth={0.4}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#ffffff20', outline: 'none', cursor: 'pointer' },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      <Legend />
    </div>
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    [COLOR_SELF, 'You'],
    [COLOR_ALLY, 'Allies'],
    [COLOR_RIVAL, 'Rivals'],
    [COLOR_NEUTRAL, 'Neutral'],
    [COLOR_BOT, 'Other nations'],
    [COLOR_UNCLAIMED, 'Unclaimed'],
  ];
  return (
    <div style={{
      display: 'flex',
      gap: 16,
      justifyContent: 'center',
      paddingTop: 8,
      fontSize: 11,
      color: '#8b96b0',
      flexWrap: 'wrap',
    }}>
      {items.map(([color, label]) => (
        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: 'inline-block' }} />
          {label}
        </span>
      ))}
    </div>
  );
}
