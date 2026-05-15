export const AMENITIES = [
  { key: 'has_parking', label: 'Parking' },
  { key: 'has_wifi', label: 'Wi-Fi' },
  { key: 'pets_allowed', label: 'Pets' },
  { key: 'is_furnished', label: 'Furnished' },
  { key: 'has_balcony', label: 'Balcony' },
  { key: 'has_elevator', label: 'Elevator' },
  { key: 'has_heating', label: 'Heating' },
];

export const APARTMENT_SELECT_FULL = [
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
