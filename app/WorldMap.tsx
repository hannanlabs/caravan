'use client';

import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { nationNameForGeo } from '../lib/countries';
import type { NationData } from '../lib/spacetimedb-server';

const geoUrl =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Light-fintech map palette: light land, colour reserved for meaningful relations.
const COLOR_SELF = '#3257e5';      // accent
const COLOR_ALLY = '#11814b';      // pos
const COLOR_RIVAL = '#cf3b2a';     // neg
const COLOR_NEUTRAL = '#9a6b00';   // warn
const COLOR_BOT = '#aab2c0';       // ink-4 — other nations
const COLOR_UNCLAIMED = '#dde3ec'; // light land

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
    <>
      <div className="map-wrap">
        <div className="map-grid-bg" />
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 165 }}
          width={820}
          height={360}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', display: 'block' }}
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
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: 'rgba(50,87,229,0.18)', outline: 'none', cursor: 'pointer' },
                      pressed: { outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
      <Legend />
    </>
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
    <div className="map-legend">
      {items.map(([color, label]) => (
        <span key={label}>
          <i style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}
