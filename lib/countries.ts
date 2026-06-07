// Maps nation names to ISO codes, flag emoji, government type label,
// and the property name used by the world-atlas topojson for map matching.

export interface CountryMeta {
  iso2: string;          // ISO 3166-1 alpha-2
  geoName: string;       // matches properties.name in world-atlas countries-110m.json
  flag: string;          // emoji flag
  govType: string;       // descriptor under the nation name in the header
}

const REGISTRY: Record<string, CountryMeta> = {
  USA:              { iso2: 'US', geoName: 'United States of America', flag: '🇺🇸', govType: 'Global Superpower · Democracy' },
  China:            { iso2: 'CN', geoName: 'China',                    flag: '🇨🇳', govType: "People's Republic" },
  Japan:            { iso2: 'JP', geoName: 'Japan',                    flag: '🇯🇵', govType: 'Constitutional Monarchy' },
  'United Kingdom': { iso2: 'GB', geoName: 'United Kingdom',           flag: '🇬🇧', govType: 'Parliamentary Democracy' },
  India:            { iso2: 'IN', geoName: 'India',                    flag: '🇮🇳', govType: 'Federal Republic' },
  Brazil:           { iso2: 'BR', geoName: 'Brazil',                   flag: '🇧🇷', govType: 'Federal Republic' },
  // Optional extras for future seeds:
  Germany:          { iso2: 'DE', geoName: 'Germany',                  flag: '🇩🇪', govType: 'Federal Republic' },
  France:           { iso2: 'FR', geoName: 'France',                   flag: '🇫🇷', govType: 'Republic' },
  Canada:           { iso2: 'CA', geoName: 'Canada',                   flag: '🇨🇦', govType: 'Parliamentary Democracy' },
  Russia:           { iso2: 'RU', geoName: 'Russia',                   flag: '🇷🇺', govType: 'Federal Republic' },
  Australia:        { iso2: 'AU', geoName: 'Australia',                flag: '🇦🇺', govType: 'Federal Democracy' },
};

const UNKNOWN: CountryMeta = { iso2: '', geoName: '', flag: '🏳', govType: 'Independent State' };

export function metaFor(name: string): CountryMeta {
  return REGISTRY[name] ?? UNKNOWN;
}

export function flagFor(name: string): string {
  return metaFor(name).flag;
}

// Reverse lookup: given a world-atlas geo name, find the matching seeded nation.
export function nationNameForGeo(geoName: string): string | null {
  for (const [name, meta] of Object.entries(REGISTRY)) {
    if (meta.geoName === geoName) return name;
  }
  return null;
}
