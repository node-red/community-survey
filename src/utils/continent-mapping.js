// ISO 3166-1 numeric country codes to continent mapping
// Based on UN geoscheme with 6 continent model

export const CONTINENT_OPTIONS = [
  { value: 'Europe', label: 'Europe' },
  { value: 'Asia', label: 'Asia' },
  { value: 'North America', label: 'North America' },
  { value: 'South America', label: 'South America' },
  { value: 'Africa', label: 'Africa' },
  { value: 'Oceania', label: 'Oceania' }
];

// Map of ISO 3166-1 numeric country codes to continents
// These codes match the TopoJSON countries-110m.json file IDs
export const COUNTRY_TO_CONTINENT = {
  // Africa
  '12': 'Africa',    // Algeria
  '24': 'Africa',    // Angola
  '72': 'Africa',    // Botswana
  '854': 'Africa',   // Burkina Faso
  '108': 'Africa',   // Burundi
  '120': 'Africa',   // Cameroon
  '140': 'Africa',   // Central African Republic
  '148': 'Africa',   // Chad
  '178': 'Africa',   // Congo
  '180': 'Africa',   // Democratic Republic of the Congo
  '384': 'Africa',   // Ivory Coast (Cote d'Ivoire)
  '262': 'Africa',   // Djibouti
  '818': 'Africa',   // Egypt
  '226': 'Africa',   // Equatorial Guinea
  '232': 'Africa',   // Eritrea
  '748': 'Africa',   // Eswatini (Swaziland)
  '231': 'Africa',   // Ethiopia
  '266': 'Africa',   // Gabon
  '270': 'Africa',   // Gambia
  '288': 'Africa',   // Ghana
  '324': 'Africa',   // Guinea
  '624': 'Africa',   // Guinea-Bissau
  '404': 'Africa',   // Kenya
  '426': 'Africa',   // Lesotho
  '430': 'Africa',   // Liberia
  '434': 'Africa',   // Libya
  '450': 'Africa',   // Madagascar
  '454': 'Africa',   // Malawi
  '466': 'Africa',   // Mali
  '478': 'Africa',   // Mauritania
  '504': 'Africa',   // Morocco
  '508': 'Africa',   // Mozambique
  '516': 'Africa',   // Namibia
  '562': 'Africa',   // Niger
  '566': 'Africa',   // Nigeria
  '646': 'Africa',   // Rwanda
  '686': 'Africa',   // Senegal
  '694': 'Africa',   // Sierra Leone
  '706': 'Africa',   // Somalia
  '710': 'Africa',   // South Africa
  '728': 'Africa',   // South Sudan
  '729': 'Africa',   // Sudan
  '834': 'Africa',   // Tanzania
  '768': 'Africa',   // Togo
  '788': 'Africa',   // Tunisia
  '800': 'Africa',   // Uganda
  '732': 'Africa',   // Western Sahara
  '894': 'Africa',   // Zambia
  '716': 'Africa',   // Zimbabwe
  '174': 'Africa',   // Comoros
  '480': 'Africa',   // Mauritius
  '638': 'Africa',   // Reunion
  '175': 'Africa',   // Mayotte
  '654': 'Africa',   // Saint Helena
  '678': 'Africa',   // Sao Tome and Principe
  '690': 'Africa',   // Seychelles
  '204': 'Africa',   // Benin

  // Asia
  '4': 'Asia',       // Afghanistan
  '51': 'Asia',      // Armenia
  '31': 'Asia',      // Azerbaijan
  '48': 'Asia',      // Bahrain
  '50': 'Asia',      // Bangladesh
  '64': 'Asia',      // Bhutan
  '96': 'Asia',      // Brunei
  '104': 'Asia',     // Myanmar (Burma)
  '116': 'Asia',     // Cambodia
  '156': 'Asia',     // China
  '196': 'Asia',     // Cyprus
  '268': 'Asia',     // Georgia
  '344': 'Asia',     // Hong Kong
  '356': 'Asia',     // India
  '360': 'Asia',     // Indonesia
  '364': 'Asia',     // Iran
  '368': 'Asia',     // Iraq
  '376': 'Asia',     // Israel
  '392': 'Asia',     // Japan
  '400': 'Asia',     // Jordan
  '398': 'Asia',     // Kazakhstan
  '408': 'Asia',     // North Korea
  '410': 'Asia',     // South Korea
  '414': 'Asia',     // Kuwait
  '417': 'Asia',     // Kyrgyzstan
  '418': 'Asia',     // Laos
  '422': 'Asia',     // Lebanon
  '446': 'Asia',     // Macao
  '458': 'Asia',     // Malaysia
  '462': 'Asia',     // Maldives
  '496': 'Asia',     // Mongolia
  '524': 'Asia',     // Nepal
  '512': 'Asia',     // Oman
  '586': 'Asia',     // Pakistan
  '275': 'Asia',     // Palestine
  '608': 'Asia',     // Philippines
  '634': 'Asia',     // Qatar
  '643': 'Asia',     // Russia
  '682': 'Asia',     // Saudi Arabia
  '702': 'Asia',     // Singapore
  '144': 'Asia',     // Sri Lanka
  '760': 'Asia',     // Syria
  '158': 'Asia',     // Taiwan
  '762': 'Asia',     // Tajikistan
  '764': 'Asia',     // Thailand
  '626': 'Asia',     // Timor-Leste
  '792': 'Asia',     // Turkey
  '795': 'Asia',     // Turkmenistan
  '784': 'Asia',     // United Arab Emirates
  '860': 'Asia',     // Uzbekistan
  '704': 'Asia',     // Vietnam
  '887': 'Asia',     // Yemen

  // Europe
  '8': 'Europe',     // Albania
  '20': 'Europe',    // Andorra
  '40': 'Europe',    // Austria
  '112': 'Europe',   // Belarus
  '56': 'Europe',    // Belgium
  '70': 'Europe',    // Bosnia and Herzegovina
  '100': 'Europe',   // Bulgaria
  '191': 'Europe',   // Croatia
  '203': 'Europe',   // Czech Republic
  '208': 'Europe',   // Denmark
  '233': 'Europe',   // Estonia
  '246': 'Europe',   // Finland
  '250': 'Europe',   // France
  '276': 'Europe',   // Germany
  '300': 'Europe',   // Greece
  '348': 'Europe',   // Hungary
  '352': 'Europe',   // Iceland
  '372': 'Europe',   // Ireland
  '380': 'Europe',   // Italy
  '383': 'Europe',   // Kosovo
  '428': 'Europe',   // Latvia
  '438': 'Europe',   // Liechtenstein
  '440': 'Europe',   // Lithuania
  '442': 'Europe',   // Luxembourg
  '807': 'Europe',   // North Macedonia
  '470': 'Europe',   // Malta
  '498': 'Europe',   // Moldova
  '492': 'Europe',   // Monaco
  '499': 'Europe',   // Montenegro
  '528': 'Europe',   // Netherlands
  '578': 'Europe',   // Norway
  '616': 'Europe',   // Poland
  '620': 'Europe',   // Portugal
  '642': 'Europe',   // Romania
  '674': 'Europe',   // San Marino
  '688': 'Europe',   // Serbia
  '703': 'Europe',   // Slovakia
  '705': 'Europe',   // Slovenia
  '724': 'Europe',   // Spain
  '752': 'Europe',   // Sweden
  '756': 'Europe',   // Switzerland
  '804': 'Europe',   // Ukraine
  '826': 'Europe',   // United Kingdom
  '336': 'Europe',   // Vatican City

  // North America
  '28': 'North America',    // Antigua and Barbuda
  '44': 'North America',    // Bahamas
  '52': 'North America',    // Barbados
  '84': 'North America',    // Belize
  '124': 'North America',   // Canada
  '188': 'North America',   // Costa Rica
  '192': 'North America',   // Cuba
  '212': 'North America',   // Dominica
  '214': 'North America',   // Dominican Republic
  '222': 'North America',   // El Salvador
  '308': 'North America',   // Grenada
  '320': 'North America',   // Guatemala
  '332': 'North America',   // Haiti
  '340': 'North America',   // Honduras
  '388': 'North America',   // Jamaica
  '484': 'North America',   // Mexico
  '558': 'North America',   // Nicaragua
  '591': 'North America',   // Panama
  '630': 'North America',   // Puerto Rico
  '659': 'North America',   // Saint Kitts and Nevis
  '662': 'North America',   // Saint Lucia
  '670': 'North America',   // Saint Vincent and the Grenadines
  '780': 'North America',   // Trinidad and Tobago
  '840': 'North America',   // United States
  '850': 'North America',   // US Virgin Islands
  '304': 'North America',   // Greenland

  // South America
  '32': 'South America',    // Argentina
  '68': 'South America',    // Bolivia
  '76': 'South America',    // Brazil
  '152': 'South America',   // Chile
  '170': 'South America',   // Colombia
  '218': 'South America',   // Ecuador
  '238': 'South America',   // Falkland Islands
  '254': 'South America',   // French Guiana
  '328': 'South America',   // Guyana
  '600': 'South America',   // Paraguay
  '604': 'South America',   // Peru
  '740': 'South America',   // Suriname
  '858': 'South America',   // Uruguay
  '862': 'South America',   // Venezuela

  // Oceania
  '36': 'Oceania',   // Australia
  '242': 'Oceania',  // Fiji
  '296': 'Oceania',  // Kiribati
  '584': 'Oceania',  // Marshall Islands
  '583': 'Oceania',  // Micronesia
  '520': 'Oceania',  // Nauru
  '554': 'Oceania',  // New Zealand
  '540': 'Oceania',  // New Caledonia
  '585': 'Oceania',  // Palau
  '598': 'Oceania',  // Papua New Guinea
  '882': 'Oceania',  // Samoa
  '90': 'Oceania',   // Solomon Islands
  '776': 'Oceania',  // Tonga
  '798': 'Oceania',  // Tuvalu
  '548': 'Oceania',  // Vanuatu
  '258': 'Oceania',  // French Polynesia
  '316': 'Oceania',  // Guam
};

// Get all country codes for a given continent
export const getCountryCodesForContinent = (continent) => {
  return Object.entries(COUNTRY_TO_CONTINENT)
    .filter(([, cont]) => cont === continent)
    .map(([code]) => code);
};

// Get all country codes for multiple continents
export const getCountryCodesForContinents = (continents) => {
  if (!continents || continents.length === 0) return [];

  const codes = new Set();
  continents.forEach(continent => {
    getCountryCodesForContinent(continent).forEach(code => codes.add(code));
  });
  return Array.from(codes);
};

// Get continent for a country code
export const getContinentForCountry = (countryCode) => {
  return COUNTRY_TO_CONTINENT[countryCode] || null;
};
