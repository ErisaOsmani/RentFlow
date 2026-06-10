export const AMENITIES = [
  { key: 'has_parking', label: 'Parking' },
  { key: 'has_wifi', label: 'Wi-Fi' },
  { key: 'pets_allowed', label: 'Pets' },
  { key: 'is_furnished', label: 'Furnished' },
  { key: 'has_balcony', label: 'Balcony' },
  { key: 'has_elevator', label: 'Elevator' },
  { key: 'has_heating', label: 'Heating' },
];

const FALLBACK_CURRENCY_CODES = [
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
  'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP',
  'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD',
  'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HTG', 'HUF', 'IDR', 'ILS', 'INR',
  'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF',
  'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL',
  'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR',
  'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR',
  'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR',
  'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD',
  'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN', 'SYP', 'SZL', 'THB', 'TJS',
  'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD',
  'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XOF', 'XPF',
  'YER', 'ZAR', 'ZMW', 'ZWL',
];

const CURRENCY_COUNTRIES = {
  AED: 'United Arab Emirates',
  AFN: 'Afghanistan',
  ALL: 'Albania',
  AMD: 'Armenia',
  ANG: 'Curacao and Sint Maarten',
  AOA: 'Angola',
  ARS: 'Argentina',
  AUD: 'Australia',
  AWG: 'Aruba',
  AZN: 'Azerbaijan',
  BAM: 'Bosnia and Herzegovina',
  BBD: 'Barbados',
  BDT: 'Bangladesh',
  BGN: 'Bulgaria',
  BHD: 'Bahrain',
  BIF: 'Burundi',
  BMD: 'Bermuda',
  BND: 'Brunei',
  BOB: 'Bolivia',
  BRL: 'Brazil',
  BSD: 'Bahamas',
  BTN: 'Bhutan',
  BWP: 'Botswana',
  BYN: 'Belarus',
  BZD: 'Belize',
  CAD: 'Canada',
  CDF: 'Democratic Republic of the Congo',
  CHF: 'Switzerland and Liechtenstein',
  CLP: 'Chile',
  CNY: 'China',
  COP: 'Colombia',
  CRC: 'Costa Rica',
  CUP: 'Cuba',
  CVE: 'Cape Verde',
  CZK: 'Czech Republic',
  DJF: 'Djibouti',
  DKK: 'Denmark, Greenland, Faroe Islands',
  DOP: 'Dominican Republic',
  DZD: 'Algeria',
  EGP: 'Egypt',
  ERN: 'Eritrea',
  ETB: 'Ethiopia',
  EUR: 'Eurozone',
  FJD: 'Fiji',
  FKP: 'Falkland Islands',
  GBP: 'United Kingdom',
  GEL: 'Georgia',
  GHS: 'Ghana',
  GIP: 'Gibraltar',
  GMD: 'Gambia',
  GNF: 'Guinea',
  GTQ: 'Guatemala',
  GYD: 'Guyana',
  HKD: 'Hong Kong',
  HNL: 'Honduras',
  HTG: 'Haiti',
  HUF: 'Hungary',
  IDR: 'Indonesia',
  ILS: 'Israel',
  INR: 'India',
  IQD: 'Iraq',
  IRR: 'Iran',
  ISK: 'Iceland',
  JMD: 'Jamaica',
  JOD: 'Jordan',
  JPY: 'Japan',
  KES: 'Kenya',
  KGS: 'Kyrgyzstan',
  KHR: 'Cambodia',
  KMF: 'Comoros',
  KPW: 'North Korea',
  KRW: 'South Korea',
  KWD: 'Kuwait',
  KYD: 'Cayman Islands',
  KZT: 'Kazakhstan',
  LAK: 'Laos',
  LBP: 'Lebanon',
  LKR: 'Sri Lanka',
  LRD: 'Liberia',
  LSL: 'Lesotho',
  LYD: 'Libya',
  MAD: 'Morocco',
  MDL: 'Moldova',
  MGA: 'Madagascar',
  MKD: 'North Macedonia',
  MMK: 'Myanmar',
  MNT: 'Mongolia',
  MOP: 'Macau',
  MRU: 'Mauritania',
  MUR: 'Mauritius',
  MVR: 'Maldives',
  MWK: 'Malawi',
  MXN: 'Mexico',
  MYR: 'Malaysia',
  MZN: 'Mozambique',
  NAD: 'Namibia',
  NGN: 'Nigeria',
  NIO: 'Nicaragua',
  NOK: 'Norway',
  NPR: 'Nepal',
  NZD: 'New Zealand',
  OMR: 'Oman',
  PAB: 'Panama',
  PEN: 'Peru',
  PGK: 'Papua New Guinea',
  PHP: 'Philippines',
  PKR: 'Pakistan',
  PLN: 'Poland',
  PYG: 'Paraguay',
  QAR: 'Qatar',
  RON: 'Romania',
  RSD: 'Serbia',
  RUB: 'Russia',
  RWF: 'Rwanda',
  SAR: 'Saudi Arabia',
  SBD: 'Solomon Islands',
  SCR: 'Seychelles',
  SDG: 'Sudan',
  SEK: 'Sweden',
  SGD: 'Singapore',
  SHP: 'Saint Helena',
  SLE: 'Sierra Leone',
  SOS: 'Somalia',
  SRD: 'Suriname',
  SSP: 'South Sudan',
  STN: 'Sao Tome and Principe',
  SYP: 'Syria',
  SZL: 'Eswatini',
  THB: 'Thailand',
  TJS: 'Tajikistan',
  TMT: 'Turkmenistan',
  TND: 'Tunisia',
  TOP: 'Tonga',
  TRY: 'Turkey',
  TTD: 'Trinidad and Tobago',
  TWD: 'Taiwan',
  TZS: 'Tanzania',
  UAH: 'Ukraine',
  UGX: 'Uganda',
  USD: 'United States',
  UYU: 'Uruguay',
  UZS: 'Uzbekistan',
  VES: 'Venezuela',
  VND: 'Vietnam',
  VUV: 'Vanuatu',
  WST: 'Samoa',
  XAF: 'Central African CFA countries',
  XCD: 'Eastern Caribbean countries',
  XOF: 'West African CFA countries',
  XPF: 'French Pacific territories',
  YER: 'Yemen',
  ZAR: 'South Africa',
  ZMW: 'Zambia',
  ZWL: 'Zimbabwe',
};

const getSupportedCurrencyCodes = () => {
  if (typeof Intl === 'undefined' || typeof Intl.supportedValuesOf !== 'function') {
    return FALLBACK_CURRENCY_CODES;
  }

  try {
    return Intl.supportedValuesOf('currency');
  } catch (error) {
    return FALLBACK_CURRENCY_CODES;
  }
};

const currencyNameFormatter =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'currency' })
    : null;

const getCurrencyLabel = (code) => {
  try {
    return currencyNameFormatter?.of(code) || code;
  } catch (error) {
    return code;
  }
};

const getCurrencySymbolForCode = (code) => {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    }).formatToParts(0);

    return parts.find((part) => part.type === 'currency')?.value || code;
  } catch (error) {
    return code;
  }
};

export const CURRENCIES = Array.from(new Set(getSupportedCurrencyCodes()))
  .map((code) => ({
    code,
    label: getCurrencyLabel(code),
    symbol: getCurrencySymbolForCode(code),
    countries: CURRENCY_COUNTRIES[code] || '',
  }))
  .sort((first, second) => first.label.localeCompare(second.label));

export const APARTMENT_SELECT_FULL = [
  'id, owner_id, owner_name, owner_phone, title, city, neighborhood, address, latitude, longitude, description, image_url, price, currency, rooms, has_parking, has_wifi, pets_allowed, is_furnished, has_balcony, has_elevator, has_heating',
  'id, owner_id, owner_name, owner_phone, title, city, address, latitude, longitude, description, image_url, price, currency, rooms, has_parking, has_wifi, pets_allowed, is_furnished, has_balcony, has_elevator, has_heating',
  'id, owner_id, owner_name, owner_phone, title, city, description, image_url, price, currency, rooms',
  'id, owner_id, title, city, description, image_url, price, currency, rooms',
  'id, owner_id, owner_name, owner_phone, title, city, neighborhood, address, latitude, longitude, description, image_url, price, rooms, has_parking, has_wifi, pets_allowed, is_furnished, has_balcony, has_elevator, has_heating',
  'id, owner_id, owner_name, owner_phone, title, city, address, latitude, longitude, description, image_url, price, rooms, has_parking, has_wifi, pets_allowed, is_furnished, has_balcony, has_elevator, has_heating',
  'id, owner_id, owner_name, owner_phone, title, city, description, image_url, price, rooms',
  'id, owner_id, title, city, description, image_url, price, rooms',
];

export const USER_PROFILE_SELECT_FULL = [
  'id, email, first_name, last_name, phone, role, verified, verification_status, identity_document_url',
  'id, email, first_name, last_name, phone, role, verified, verification_status',
  'id, email, first_name, last_name, phone, role',
  'id, email, first_name, last_name',
  'id, phone',
  'id',
];

export const getAmenityLabels = (apartment) =>
  AMENITIES
    .filter((amenity) => Boolean(apartment?.[amenity.key]))
    .map((amenity) => amenity.label);

export const getOwnerDisplayName = (profile, fallback = 'Owner') => {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  return fullName || profile?.email || fallback;
};

export const normalizeCurrency = (currency) => {
  const value = String(currency || '').trim();
  const normalizedValue = value.toUpperCase();

  if (!value) {
    return 'USD';
  }

  if (value === '$') {
    return 'USD';
  }

  if (value === '\u20AC') {
    return 'EUR';
  }

  if (value === '\u00A3') {
    return 'GBP';
  }

  const knownCurrency = CURRENCIES.find(
    (item) =>
      item.code === normalizedValue ||
      item.symbol.toUpperCase() === normalizedValue ||
      item.label.toUpperCase() === normalizedValue
  );

  return knownCurrency?.code || normalizedValue;
};

export const getCurrencySymbol = (currency) => {
  const code = normalizeCurrency(currency);
  return CURRENCIES.find((item) => item.code === code)?.symbol || code;
};

export const formatPrice = (price, currency = 'USD') => {
  if (price === undefined || price === null || price === '') {
    return 'N/A';
  }

  const value = Number(price);
  const displayValue = Number.isFinite(value) ? value.toLocaleString('en-US') : String(price);
  const symbol = getCurrencySymbol(currency);

  return ['$', '\u20AC', '\u00A3'].includes(symbol) ? `${symbol}${displayValue}` : `${displayValue} ${symbol}`;
};

export const getProfileVerificationLabel = (profile) => {
  if (profile?.verified) {
    return 'Verified';
  }

  if (profile?.verification_status === 'pending') {
    return 'Pending verification';
  }

  return 'Unverified';
};

export const hasMapLocation = (apartment) =>
  apartment?.latitude !== undefined &&
  apartment?.latitude !== null &&
  apartment?.longitude !== undefined &&
  apartment?.longitude !== null &&
  !Number.isNaN(Number(apartment.latitude)) &&
  !Number.isNaN(Number(apartment.longitude));
