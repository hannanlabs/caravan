// Maps nation names to ISO codes, flag emoji, government type label,
// and the property name used by the world-atlas topojson for map matching.

export interface CountryMeta {
  iso2: string;          // ISO 3166-1 alpha-2
  geoName: string;       // matches properties.name in world-atlas countries-110m.json
  flag: string;          // emoji flag
  govType: string;       // descriptor under the nation name in the header
}

const REGISTRY: Record<string, CountryMeta> = {
  // ----- Top 10 economies -----
  USA:              { iso2: 'US', geoName: 'United States of America', flag: '🇺🇸', govType: 'Federal Republic · Democracy' },
  China:            { iso2: 'CN', geoName: 'China',                    flag: '🇨🇳', govType: "People's Republic" },
  Germany:          { iso2: 'DE', geoName: 'Germany',                  flag: '🇩🇪', govType: 'Federal Republic' },
  Japan:            { iso2: 'JP', geoName: 'Japan',                    flag: '🇯🇵', govType: 'Constitutional Monarchy' },
  India:            { iso2: 'IN', geoName: 'India',                    flag: '🇮🇳', govType: 'Federal Republic' },
  'United Kingdom': { iso2: 'GB', geoName: 'United Kingdom',           flag: '🇬🇧', govType: 'Parliamentary Democracy' },
  France:           { iso2: 'FR', geoName: 'France',                   flag: '🇫🇷', govType: 'Republic' },
  Italy:            { iso2: 'IT', geoName: 'Italy',                    flag: '🇮🇹', govType: 'Republic' },
  Brazil:           { iso2: 'BR', geoName: 'Brazil',                   flag: '🇧🇷', govType: 'Federal Republic' },
  Canada:           { iso2: 'CA', geoName: 'Canada',                   flag: '🇨🇦', govType: 'Parliamentary Democracy' },

  // ----- South Asia -----
  Pakistan:         { iso2: 'PK', geoName: 'Pakistan',                 flag: '🇵🇰', govType: 'Islamic Republic' },
  Bangladesh:       { iso2: 'BD', geoName: 'Bangladesh',               flag: '🇧🇩', govType: "People's Republic" },
  'Sri Lanka':      { iso2: 'LK', geoName: 'Sri Lanka',                flag: '🇱🇰', govType: 'Republic' },
  Afghanistan:      { iso2: 'AF', geoName: 'Afghanistan',              flag: '🇦🇫', govType: 'Islamic Emirate' },
  Nepal:            { iso2: 'NP', geoName: 'Nepal',                    flag: '🇳🇵', govType: 'Federal Republic' },

  // ----- East & SE Asia -----
  'South Korea':    { iso2: 'KR', geoName: 'South Korea',              flag: '🇰🇷', govType: 'Republic' },
  Indonesia:        { iso2: 'ID', geoName: 'Indonesia',                flag: '🇮🇩', govType: 'Republic' },
  Vietnam:          { iso2: 'VN', geoName: 'Vietnam',                  flag: '🇻🇳', govType: 'Socialist Republic' },
  Philippines:      { iso2: 'PH', geoName: 'Philippines',              flag: '🇵🇭', govType: 'Republic' },
  Thailand:         { iso2: 'TH', geoName: 'Thailand',                 flag: '🇹🇭', govType: 'Constitutional Monarchy' },
  Malaysia:         { iso2: 'MY', geoName: 'Malaysia',                 flag: '🇲🇾', govType: 'Federal Monarchy' },
  Cambodia:         { iso2: 'KH', geoName: 'Cambodia',                 flag: '🇰🇭', govType: 'Constitutional Monarchy' },
  'North Korea':    { iso2: 'KP', geoName: 'North Korea',              flag: '🇰🇵', govType: 'One-Party Republic' },

  // ----- Middle East / North Africa -----
  Iran:             { iso2: 'IR', geoName: 'Iran',                     flag: '🇮🇷', govType: 'Islamic Republic' },
  Turkey:           { iso2: 'TR', geoName: 'Turkey',                   flag: '🇹🇷', govType: 'Republic' },
  'Saudi Arabia':   { iso2: 'SA', geoName: 'Saudi Arabia',             flag: '🇸🇦', govType: 'Absolute Monarchy' },
  Iraq:             { iso2: 'IQ', geoName: 'Iraq',                     flag: '🇮🇶', govType: 'Federal Republic' },
  Israel:           { iso2: 'IL', geoName: 'Israel',                   flag: '🇮🇱', govType: 'Parliamentary Democracy' },
  'United Arab Emirates': { iso2: 'AE', geoName: 'United Arab Emirates', flag: '🇦🇪', govType: 'Federal Monarchy' },
  Egypt:            { iso2: 'EG', geoName: 'Egypt',                    flag: '🇪🇬', govType: 'Republic' },
  Morocco:          { iso2: 'MA', geoName: 'Morocco',                  flag: '🇲🇦', govType: 'Constitutional Monarchy' },
  Algeria:          { iso2: 'DZ', geoName: 'Algeria',                  flag: '🇩🇿', govType: 'Republic' },
  Yemen:            { iso2: 'YE', geoName: 'Yemen',                    flag: '🇾🇪', govType: 'Republic' },

  // ----- Europe -----
  Russia:           { iso2: 'RU', geoName: 'Russia',                   flag: '🇷🇺', govType: 'Federal Republic' },
  Spain:            { iso2: 'ES', geoName: 'Spain',                    flag: '🇪🇸', govType: 'Constitutional Monarchy' },
  Poland:           { iso2: 'PL', geoName: 'Poland',                   flag: '🇵🇱', govType: 'Republic' },
  Ukraine:          { iso2: 'UA', geoName: 'Ukraine',                  flag: '🇺🇦', govType: 'Republic' },
  Netherlands:      { iso2: 'NL', geoName: 'Netherlands',              flag: '🇳🇱', govType: 'Constitutional Monarchy' },
  Belgium:          { iso2: 'BE', geoName: 'Belgium',                  flag: '🇧🇪', govType: 'Constitutional Monarchy' },
  Sweden:           { iso2: 'SE', geoName: 'Sweden',                   flag: '🇸🇪', govType: 'Constitutional Monarchy' },
  Norway:           { iso2: 'NO', geoName: 'Norway',                   flag: '🇳🇴', govType: 'Constitutional Monarchy' },
  Switzerland:      { iso2: 'CH', geoName: 'Switzerland',              flag: '🇨🇭', govType: 'Federal Republic' },
  Greece:           { iso2: 'GR', geoName: 'Greece',                   flag: '🇬🇷', govType: 'Republic' },
  Portugal:         { iso2: 'PT', geoName: 'Portugal',                 flag: '🇵🇹', govType: 'Republic' },
  Romania:          { iso2: 'RO', geoName: 'Romania',                  flag: '🇷🇴', govType: 'Republic' },
  Ireland:          { iso2: 'IE', geoName: 'Ireland',                  flag: '🇮🇪', govType: 'Republic' },
  Denmark:          { iso2: 'DK', geoName: 'Denmark',                  flag: '🇩🇰', govType: 'Constitutional Monarchy' },
  Finland:          { iso2: 'FI', geoName: 'Finland',                  flag: '🇫🇮', govType: 'Republic' },
  Austria:          { iso2: 'AT', geoName: 'Austria',                  flag: '🇦🇹', govType: 'Federal Republic' },

  // ----- Latin America -----
  Mexico:           { iso2: 'MX', geoName: 'Mexico',                   flag: '🇲🇽', govType: 'Federal Republic' },
  Argentina:        { iso2: 'AR', geoName: 'Argentina',                flag: '🇦🇷', govType: 'Federal Republic' },
  Colombia:         { iso2: 'CO', geoName: 'Colombia',                 flag: '🇨🇴', govType: 'Republic' },
  Chile:            { iso2: 'CL', geoName: 'Chile',                    flag: '🇨🇱', govType: 'Republic' },
  Peru:             { iso2: 'PE', geoName: 'Peru',                     flag: '🇵🇪', govType: 'Republic' },
  Venezuela:        { iso2: 'VE', geoName: 'Venezuela',                flag: '🇻🇪', govType: 'Federal Republic' },

  // ----- Africa -----
  Nigeria:          { iso2: 'NG', geoName: 'Nigeria',                  flag: '🇳🇬', govType: 'Federal Republic' },
  'South Africa':   { iso2: 'ZA', geoName: 'South Africa',             flag: '🇿🇦', govType: 'Parliamentary Republic' },
  Ethiopia:         { iso2: 'ET', geoName: 'Ethiopia',                 flag: '🇪🇹', govType: 'Federal Republic' },
  Kenya:            { iso2: 'KE', geoName: 'Kenya',                    flag: '🇰🇪', govType: 'Republic' },
  Tanzania:         { iso2: 'TZ', geoName: 'Tanzania',                 flag: '🇹🇿', govType: 'Republic' },
  Sudan:            { iso2: 'SD', geoName: 'Sudan',                    flag: '🇸🇩', govType: 'Republic' },
  Angola:           { iso2: 'AO', geoName: 'Angola',                   flag: '🇦🇴', govType: 'Republic' },
  Ghana:            { iso2: 'GH', geoName: 'Ghana',                    flag: '🇬🇭', govType: 'Republic' },

  // ----- Oceania -----
  Australia:        { iso2: 'AU', geoName: 'Australia',                flag: '🇦🇺', govType: 'Federal Democracy' },
  'New Zealand':    { iso2: 'NZ', geoName: 'New Zealand',              flag: '🇳🇿', govType: 'Constitutional Monarchy' },

  // ----- Central Asia / misc -----
  Kazakhstan:       { iso2: 'KZ', geoName: 'Kazakhstan',               flag: '🇰🇿', govType: 'Republic' },
  Uzbekistan:       { iso2: 'UZ', geoName: 'Uzbekistan',               flag: '🇺🇿', govType: 'Republic' },
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

export function allCountryNames(): string[] {
  return Object.keys(REGISTRY);
}
