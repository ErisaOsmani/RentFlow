import { supabase } from './supabase';
import { sendPushNotificationToUser } from './pushNotifications';

const MISSING_SCHEMA_CODES = new Set(['42P01', '42703']);

export const isMissingSchemaError = (error) => Boolean(error && MISSING_SCHEMA_CODES.has(error.code));

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user || null, error };
};

export const createNotification = async ({
  userId,
  title,
  message,
  type = 'info',
  bookingId = null,
  apartmentId = null,
}) => {
  if (!userId) {
    return { error: null };
  }

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    booking_id: bookingId,
    apartment_id: apartmentId,
    read_at: null,
  });

  if (!error || isMissingSchemaError(error)) {
    await sendPushNotificationToUser({
      userId,
      title,
      body: message,
      data: { type, bookingId, apartmentId },
    });
  }

  return { error: isMissingSchemaError(error) ? null : error };
};

export const loadNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, type, booking_id, apartment_id, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (isMissingSchemaError(error)) {
    return { notifications: [], error: null, unavailable: true };
  }

  return { notifications: data || [], error, unavailable: false };
};

export const loadUnreadNotificationCount = async (userId, type = null) => {
  let query = supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (type) {
    query = query.eq('type', type);
  }

  const { count, error } = await query;

  if (isMissingSchemaError(error)) {
    return { count: 0, error: null, unavailable: true };
  }

  return { count: count || 0, error, unavailable: false };
};

export const markNotificationRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  return { error: isMissingSchemaError(error) ? null : error };
};

export const markNotificationsReadByType = async (userId, type) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('type', type)
    .is('read_at', null);

  return { error: isMissingSchemaError(error) ? null : error };
};

export const loadFavoriteApartmentIds = async (userId) => {
  const { data, error } = await supabase
    .from('favorites')
    .select('apartment_id')
    .eq('user_id', userId);

  if (isMissingSchemaError(error)) {
    return { favoriteApartmentIds: [], error: null, unavailable: true };
  }

  return {
    favoriteApartmentIds: (data || []).map((favorite) => favorite.apartment_id).filter(Boolean),
    error,
    unavailable: false,
  };
};

export const toggleFavorite = async ({ userId, apartmentId, isFavorite }) => {
  if (isFavorite) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('apartment_id', apartmentId);

    return { isFavorite: false, error: isMissingSchemaError(error) ? null : error };
  }

  const { error } = await supabase.from('favorites').insert({
    user_id: userId,
    apartment_id: apartmentId,
  });

  return { isFavorite: true, error: isMissingSchemaError(error) ? null : error };
};

export const loadReviewData = async (apartmentId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, user_id, apartment_id, rating, comment, created_at')
    .eq('apartment_id', apartmentId)
    .order('created_at', { ascending: false });

  if (isMissingSchemaError(error)) {
    return { reviews: [], averageRating: 0, reviewCount: 0, error: null, unavailable: true };
  }

  const reviews = data || [];
  const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0);
  const averageRating = reviews.length ? total / reviews.length : 0;

  return { reviews, averageRating, reviewCount: reviews.length, error, unavailable: false };
};

export const submitApartmentReview = async ({ userId, apartmentId, rating, comment }) => {
  const payload = {
    user_id: userId,
    apartment_id: apartmentId,
    rating,
    comment: comment.trim() || null,
  };

  const { error } = await supabase
    .from('reviews')
    .upsert(payload, { onConflict: 'user_id,apartment_id' });

  return { error: isMissingSchemaError(error) ? null : error };
};

export const selectBookings = async (queryBuilder) => {
  const selectOptions = [
    'id, start_date, end_date, status, cancelled_at, cancelled_by, user_id, owner_id, apartment_id, guest_first_name, guest_last_name, guest_phone',
    'id, start_date, end_date, status, user_id, owner_id, apartment_id, guest_first_name, guest_last_name, guest_phone',
    'id, start_date, end_date, user_id, owner_id, apartment_id, guest_first_name, guest_last_name, guest_phone',
    'id, start_date, end_date, user_id, apartment_id',
  ];

  for (const selectFields of selectOptions) {
    const result = await queryBuilder(selectFields);

    if (result.error?.code === '42703') {
      continue;
    }

    return result;
  }

  return queryBuilder(selectOptions[selectOptions.length - 1]);
};

export const getBlockingBookings = async ({ apartmentId, startDate, endDate }) => {
  const result = await selectBookings((selectFields) =>
    supabase
      .from('bookings')
      .select(selectFields)
      .eq('apartment_id', apartmentId)
      .lt('start_date', endDate)
      .gt('end_date', startDate)
      .limit(10)
  );

  if (result.error) {
    return { bookings: [], error: result.error };
  }

  const bookings = (result.data || []).filter(
    (booking) => !['cancelled', 'rejected'].includes(String(booking.status || 'accepted').toLowerCase())
  );

  return { bookings, error: null };
};

export const createBooking = async (payload) => {
  const basicPayload = {
    user_id: payload.user_id,
    owner_id: payload.owner_id,
    apartment_id: payload.apartment_id,
    start_date: payload.start_date,
    end_date: payload.end_date,
  };
  const payloadOptions = [
    { ...payload, status: 'pending' },
    payload,
    { ...basicPayload, status: 'pending' },
    basicPayload,
  ];

  for (const bookingPayload of payloadOptions) {
    const result = await supabase
      .from('bookings')
      .insert(bookingPayload)
      .select('id, status')
      .maybeSingle();

    if (!result.error) {
      return { booking: result.data, error: null };
    }

    if (result.error.code === '42703') {
      const fallback = await supabase.from('bookings').insert(bookingPayload).select('id').maybeSingle();

      if (!fallback.error) {
        return { booking: fallback.data, error: null };
      }

      if (fallback.error.code === '42703') {
        continue;
      }

      return { booking: null, error: fallback.error };
    }

    if (result.error.code === '23505') {
      continue;
    }

    return { booking: null, error: result.error };
  }

  return { booking: null, error: { message: 'Rezervimi nuk u ruajt. Kontrollo kolonat e tabeles bookings.' } };
};

export const updateBookingStatus = async ({ bookingId, status, cancelledBy = null }) => {
  const payloadOptions = [
    {
      status,
      cancelled_by: cancelledBy,
      cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
    },
    { status },
  ];

  for (const payload of payloadOptions) {
    const { error } = await supabase.from('bookings').update(payload).eq('id', bookingId);

    if (!error) {
      return { error: null };
    }

    if (error.code === '42703') {
      continue;
    }

    return { error };
  }

  return { error: { message: 'Kolona status mungon ne tabelen bookings.' } };
};
