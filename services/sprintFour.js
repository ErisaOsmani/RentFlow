import { AMENITIES, formatPrice, getAmenityLabels } from '../utils/marketplace';
import { parseImageUrls } from '../utils/apartmentImages';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasTextMatch = (apartment, query) => {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return false;
  }

  return [
    apartment?.title,
    apartment?.description,
    apartment?.city,
    apartment?.neighborhood,
    apartment?.address,
  ].some((value) => normalizeText(value).includes(normalizedQuery));
};

export const getListingQualityReport = (apartment) => {
  const imageCount = parseImageUrls(apartment?.image_url).length;
  const descriptionLength = String(apartment?.description || '').trim().length;
  const amenityCount = getAmenityLabels(apartment).length;
  const price = toNumber(apartment?.price);
  const rooms = toNumber(apartment?.rooms);
  const issues = [];
  const suggestions = [];
  let score = 100;

  if (imageCount === 0) {
    score -= 26;
    issues.push('Nuk ka foto');
    suggestions.push('Shto te pakten 3 foto te qarta nga dhomat kryesore.');
  } else if (imageCount < 3) {
    score -= 14;
    issues.push('Pak foto');
    suggestions.push('Shto me shume foto per kuzhinen, dhomen e dites dhe banjon.');
  }

  if (descriptionLength < 70) {
    score -= 18;
    issues.push('Pershkrim i shkurter');
    suggestions.push('Zgjero pershkrimin me lokacion, stil banimi dhe perfitime praktike.');
  }

  if (!apartment?.neighborhood && !apartment?.address) {
    score -= 10;
    issues.push('Lokacion jo i detajuar');
    suggestions.push('Shto lagjen ose adresen qe klientet ta kuptojne zonen.');
  }

  if (amenityCount === 0) {
    score -= 14;
    issues.push('Amenities mungojne');
    suggestions.push('Sheno amenities si Wi-Fi, parking, ballkon, lift ose ngrohje.');
  } else if (amenityCount < 3) {
    score -= 6;
    suggestions.push('Shto cdo amenity reale qe e rrit besueshmerine e listing-ut.');
  }

  if (!rooms || rooms < 1) {
    score -= 14;
    issues.push('Numri i dhomave mungon');
    suggestions.push('Vendos numrin real te dhomave.');
  }

  if (!price || price < 50) {
    score -= 18;
    issues.push('Cmimi duket jo realist');
    suggestions.push('Kontrollo cmimin mujor para publikimit.');
  }

  if (rooms && price) {
    const pricePerRoom = price / rooms;

    if (pricePerRoom < 80 || pricePerRoom > 1200) {
      score -= 12;
      issues.push('Cmim i pazakonte per dhome');
      suggestions.push('Krahaso cmimin me banesa te ngjashme ne te njejtin qytet.');
    }
  }

  const normalizedScore = clamp(score, 0, 100);

  return {
    score: normalizedScore,
    label: normalizedScore >= 82 ? 'Listing i forte' : normalizedScore >= 60 ? 'Ka hapesire per permiresim' : 'Listing i dobet',
    risk: normalizedScore >= 82 ? 'low' : normalizedScore >= 60 ? 'medium' : 'high',
    issues,
    suggestions: suggestions.length ? suggestions : ['Listing-u duket mire. Mbaje te perditesuar me foto dhe cmim real.'],
  };
};

export const generateApartmentDescription = (apartment) => {
  const title = String(apartment?.title || 'Kjo banese').trim();
  const city = String(apartment?.city || '').trim();
  const neighborhood = String(apartment?.neighborhood || '').trim();
  const rooms = toNumber(apartment?.rooms);
  const price = toNumber(apartment?.price);
  const amenities = getAmenityLabels(apartment);
  const location = [neighborhood, city].filter(Boolean).join(', ');
  const amenityText = amenities.length
    ? `E pajisur me ${amenities.slice(0, 5).join(', ').toLowerCase()}, banesa ofron komoditet per jetese te perditshme.`
    : 'Banesa eshte e pershtatshme per kliente qe kerkojne nje hapesire funksionale dhe te rregullt.';

  return [
    `${title} ${location ? `ne ${location}` : ''} ofron nje ambient praktik dhe te rehatshem per qendrim mujor.`,
    rooms ? `Ka ${rooms} ${rooms === 1 ? 'dhome' : 'dhoma'} dhe organizim te pershtatshem per banim.` : '',
    price ? `Qiraja mujore eshte ${formatPrice(price, apartment?.currency)}, me fokus ne vlere dhe lokacion.` : '',
    amenityText,
    'Kontakto owner-in per me shume detaje, foto shtese ose vizite.',
  ].filter(Boolean).join(' ');
};

export const buildSearchPreferences = ({
  searchText = '',
  selectedCity = '',
  locationText = '',
  minPrice = '',
  maxPrice = '',
  minRooms = '',
  selectedAmenities = [],
} = {}) => ({
  searchText: searchText.trim(),
  city: selectedCity.trim(),
  locationText: locationText.trim(),
  minPrice: toOptionalNumber(minPrice),
  maxPrice: toOptionalNumber(maxPrice),
  minRooms: toOptionalNumber(minRooms),
  amenities: selectedAmenities,
});

const getMostCommonValue = (items, key) => {
  const counts = items.reduce((acc, item) => {
    const value = String(item?.[key] || '').trim();

    if (!value) {
      return acc;
    }

    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
};

const getMedianNumber = (values) => {
  const sortedValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (!sortedValues.length) {
    return null;
  }

  return sortedValues[Math.floor(sortedValues.length / 2)];
};

const getComparableApartments = (apartment, marketApartments = []) => {
  const city = normalizeText(apartment?.city);
  const rooms = toNumber(apartment?.rooms);
  const apartmentId = apartment?.id === undefined || apartment?.id === null ? null : String(apartment.id);

  if (!city || !rooms) {
    return [];
  }

  return (marketApartments || []).filter((item) => {
    const itemId = item?.id === undefined || item?.id === null ? null : String(item.id);

    return (
      itemId !== apartmentId &&
      normalizeText(item?.city) === city &&
      Math.abs(toNumber(item?.rooms) - rooms) <= 1 &&
      toNumber(item?.price) > 0
    );
  });
};

export const getMarketAwareListingQualityReport = (apartment, marketApartments = []) => {
  const report = getListingQualityReport(apartment);
  const price = toNumber(apartment?.price);
  const comparableApartments = getComparableApartments(apartment, marketApartments);
  const marketMedianPrice = getMedianNumber(comparableApartments.map((item) => item?.price));

  if (!price || !marketMedianPrice || comparableApartments.length < 2) {
    return {
      ...report,
      marketMedianPrice,
      comparableCount: comparableApartments.length,
    };
  }

  const distance = Math.abs(price - marketMedianPrice) / marketMedianPrice;

  if (distance < 0.42) {
    return {
      ...report,
      marketMedianPrice,
      comparableCount: comparableApartments.length,
    };
  }

  const nextScore = clamp(report.score - (distance > 0.75 ? 16 : 10), 0, 100);
  const nextRisk = nextScore >= 82 ? 'low' : nextScore >= 60 ? 'medium' : 'high';
  const priceDirection = price > marketMedianPrice ? 'me i larte' : 'me i ulet';

  return {
    ...report,
    score: nextScore,
    label: nextScore >= 82 ? 'Listing i forte' : nextScore >= 60 ? 'Ka hapesire per permiresim' : 'Listing i dobet',
    risk: nextRisk,
    issues: [...report.issues, 'Cmim larg tregut lokal'],
    suggestions: [
      `Cmimi eshte rreth ${Math.round(distance * 100)}% ${priceDirection} se listing-et e ngjashme ne kete qytet.`,
      ...report.suggestions,
    ],
    marketMedianPrice,
    comparableCount: comparableApartments.length,
  };
};

export const buildPreferencesFromApartments = (apartments = []) => {
  const city = getMostCommonValue(apartments, 'city');
  const locationText = getMostCommonValue(apartments, 'neighborhood') || getMostCommonValue(apartments, 'address');
  const targetPrice = getMedianNumber(apartments.map((apartment) => apartment?.price));
  const targetRooms = getMedianNumber(apartments.map((apartment) => apartment?.rooms));
  const amenityCounts = AMENITIES.reduce((acc, amenity) => {
    acc[amenity.key] = apartments.filter((apartment) => Boolean(apartment?.[amenity.key])).length;
    return acc;
  }, {});
  const amenities = Object.entries(amenityCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key);

  return {
    city,
    locationText,
    minPrice: null,
    maxPrice: targetPrice ? Math.round(targetPrice * 1.18) : null,
    targetPrice,
    minRooms: targetRooms,
    amenities,
    excludeApartmentIds: apartments.map((apartment) => apartment?.id).filter(Boolean),
    learnedFromUser: apartments.length > 0,
  };
};

export const getPreferenceSummary = (preferences = {}) => {
  const parts = [];

  if (preferences.city) {
    parts.push(preferences.city);
  }

  if (preferences.maxPrice) {
    parts.push(`deri ${formatPrice(preferences.maxPrice)}`);
  }

  if (preferences.minRooms) {
    parts.push(`${preferences.minRooms}+ dhoma`);
  }

  if (preferences.amenities?.length) {
    parts.push(`${preferences.amenities.length} amenities`);
  }

  return parts.length ? parts.join(' | ') : 'Bazuar ne cilesi, cmim dhe plotesi te listing-ut';
};

export const scoreApartmentMatch = (apartment, preferences = {}) => {
  let score = 45;
  const reasons = [];
  const quality = getListingQualityReport(apartment);
  const price = toNumber(apartment?.price);
  const rooms = toNumber(apartment?.rooms);
  const amenityLabels = getAmenityLabels(apartment);

  if (preferences.city && normalizeText(apartment?.city) === normalizeText(preferences.city)) {
    score += 16;
    reasons.push(preferences.learnedFromUser ? 'qytet qe e preferon' : 'qyteti perputhet');
  }

  if (preferences.locationText && hasTextMatch(apartment, preferences.locationText)) {
    score += 12;
    reasons.push('lokacion i afert');
  }

  if (preferences.searchText && hasTextMatch(apartment, preferences.searchText)) {
    score += 12;
    reasons.push('perputhet me kerkimin');
  }

  if (preferences.maxPrice && price <= preferences.maxPrice) {
    score += 12;
    reasons.push('brenda buxhetit');
  }

  if (preferences.targetPrice && price) {
    const distance = Math.abs(price - preferences.targetPrice) / preferences.targetPrice;

    if (distance <= 0.18) {
      score += 8;
      reasons.push('cmim i ngjashem me preferencat');
    } else if (distance > 0.55) {
      score -= 6;
    }
  }

  if (preferences.minPrice && price >= preferences.minPrice) {
    score += 4;
  }

  if (preferences.minRooms && rooms >= preferences.minRooms) {
    score += 10;
    reasons.push('ka mjaft dhoma');
  }

  const matchedAmenities = (preferences.amenities || []).filter((key) => Boolean(apartment?.[key]));

  if (matchedAmenities.length) {
    score += matchedAmenities.length * 5;
    reasons.push(`${matchedAmenities.length} amenities te kerkuara`);
  }

  score += Math.round(quality.score * 0.18);

  if (quality.risk === 'high') {
    score -= 12;
  }

  return {
    score: clamp(score, 0, 100),
    reasons: reasons.length ? reasons : amenityLabels.slice(0, 2),
    quality,
  };
};

export const rankApartmentsSmartly = (apartments, preferences = {}) =>
  [...apartments]
    .map((apartment) => ({
      ...apartment,
      smartMatch: scoreApartmentMatch(apartment, preferences),
    }))
    .sort((a, b) => {
      const scoreDiff = b.smartMatch.score - a.smartMatch.score;

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return toNumber(a.price) - toNumber(b.price);
    });

export const getRecommendedApartments = (apartments, preferences = {}, limit = 6) => {
  const rankedApartments = rankApartmentsSmartly(apartments, preferences);
  const excludedIds = new Set((preferences.excludeApartmentIds || []).map(String));
  const freshRecommendations = rankedApartments.filter((apartment) => !excludedIds.has(String(apartment.id)));

  return (freshRecommendations.length ? freshRecommendations : rankedApartments).slice(0, limit);
};

export const summarizeOwnerPortfolio = (apartments) => {
  const reports = apartments.map((apartment) => ({
    apartment,
    report: getMarketAwareListingQualityReport(apartment, apartments),
  }));
  const weakListings = reports.filter((item) => item.report.risk !== 'low');
  const averageScore = reports.length
    ? Math.round(reports.reduce((sum, item) => sum + item.report.score, 0) / reports.length)
    : 0;

  return {
    averageScore,
    weakListings,
    reports,
  };
};
