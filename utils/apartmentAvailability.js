import { supabase } from '../services/supabase';

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getActiveBookedApartmentIds = async (date = getLocalDateString()) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('apartment_id')
    .lte('start_date', date)
    .gt('end_date', date);

  if (error) {
    return { bookedApartmentIds: [], error };
  }

  const bookedApartmentIds = (data || [])
    .map((booking) => booking.apartment_id)
    .filter(Boolean);

  return {
    bookedApartmentIds: Array.from(new Set(bookedApartmentIds)),
    error: null,
  };
};

export const filterAvailableApartments = (apartments, bookedApartmentIds) => {
  const bookedSet = new Set((bookedApartmentIds || []).map(String));

  return (apartments || []).filter((apartment) => !bookedSet.has(String(apartment.id)));
};
