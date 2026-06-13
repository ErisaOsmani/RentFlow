import { supabase } from '../services/supabase';

// Kthen daten lokale ne format YYYY-MM-DD per krahasime booking-u.
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Gjen apartamentet qe jane te zena ne daten e dhene.
export const getActiveBookedApartmentIds = async (date = getLocalDateString()) => {
  const selectOptions = ['apartment_id, status', 'apartment_id'];
  let data = [];
  let error = null;

  for (const selectFields of selectOptions) {
    const result = await supabase
      .from('bookings')
      .select(selectFields)
      .lte('start_date', date)
      .gt('end_date', date);

    if (result.error?.code === '42703') {
      continue;
    }

    data = result.data || [];
    error = result.error;
    break;
  }

  if (error) {
    return { bookedApartmentIds: [], error };
  }

  // Booking-et e anuluara/refuzuara nuk e bllokojne apartamentin.
  const bookedApartmentIds = (data || [])
    .filter((booking) => !['cancelled', 'rejected'].includes(String(booking.status || 'accepted').toLowerCase()))
    .map((booking) => booking.apartment_id)
    .filter(Boolean);

  return {
    bookedApartmentIds: Array.from(new Set(bookedApartmentIds)),
    error: null,
  };
};

// Heq nga lista apartamentet qe jane te zena.
export const filterAvailableApartments = (apartments, bookedApartmentIds) => {
  const bookedSet = new Set((bookedApartmentIds || []).map(String));

  return (apartments || []).filter((apartment) => !bookedSet.has(String(apartment.id)));
};
