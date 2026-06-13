import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { openWhatsAppForPhone } from '../utils/whatsapp';
import { createNotification, markNotificationsReadByType, updateBookingStatus } from '../services/bookings';

// Ky screen i lejon pronarit te shoh dhe menaxhoje kerkesat per apartamentet e tij.
export default function OwnerBookingHistoryScreen({ navigation }) {
  // State-et ruajne booking-et dhe ID-ne e pronarit aktual.
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [currentOwnerId, setCurrentOwnerId] = useState(null);

  // Ngarkon apartamentet e pronarit dhe booking-et qe lidhen me to.
  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const ownerId = authData?.user?.id;

      if (authError || !ownerId) {
        Alert.alert('Error', 'You must be logged in to view apartment bookings.' );
        navigation.goBack();
        return;
      }

      setCurrentOwnerId(ownerId);
      await markNotificationsReadByType(ownerId, 'booking_created');

      const { data: apartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select('id, title, city')
        .eq('owner_id', ownerId);

      if (apartmentsError) {
        Alert.alert('Error', apartmentsError.message);
        return;
      }

      const apartmentIds = (apartments || []).map((item) => item.id).filter(Boolean);

      if (!apartmentIds.length) {
        setBookings([]);
        return;
      }

      // Select-et alternative mbajne kompatibilitet me versione te ndryshme te databazes.
      const bookingSelectOptions = [
        'id, start_date, end_date, status, user_id, owner_id, apartment_id, guest_first_name, guest_last_name, guest_phone',
        'id, start_date, end_date, status, user_id, apartment_id, guest_first_name, guest_last_name, guest_phone',
        'id, start_date, end_date, user_id, apartment_id',
      ];

      let bookingsByOwner = null;
      let bookingsByOwnerError = null;
      let bookingFields = bookingSelectOptions[bookingSelectOptions.length - 1];

      for (const selectFields of bookingSelectOptions) {
        const { data, error } = await supabase
          .from('bookings')
          .select(selectFields)
          .eq('owner_id', ownerId)
          .order('start_date', { ascending: false });

        if (error?.code === '42703') {
          continue;
        }

        bookingsByOwner = data;
        bookingsByOwnerError = error;
        bookingFields = selectFields;
        break;
      }

      if (bookingsByOwnerError && bookingsByOwnerError.code !== '42703') {
        Alert.alert('Error', bookingsByOwnerError.message);
        return;
      }

      // Nese booking-et nuk gjenden me owner_id, provohet lidhja nepermjet apartment_id.
      const hasOwnerBookings = Array.isArray(bookingsByOwner) && bookingsByOwner.length > 0;

      const { data: bookingsByApartment, error: bookingsByApartmentError } = hasOwnerBookings
        ? { data: null, error: null }
        : await supabase
            .from('bookings')
            .select(bookingFields)
            .in('apartment_id', apartmentIds)
            .order('start_date', { ascending: false });

      if (bookingsByApartmentError) {
        Alert.alert('Error', bookingsByApartmentError.message);
        return;
      }

      const bookingsData = hasOwnerBookings ? bookingsByOwner : bookingsByApartment;

      const apartmentMap = (apartments || []).reduce((acc, apartment) => {
        acc[apartment.id] = apartment;
        return acc;
      }, {});

      // Merr profilin e klientit qe pronari te shoh emrin dhe telefonin.
      const guestIds = [...new Set((bookingsData || []).map((booking) => booking.user_id).filter(Boolean))];
      let guestMap = {};

      if (guestIds.length) {
        const guestQueries = [
          'id, email, first_name, last_name, phone',
          'id, email, first_name, last_name',
          'id, email',
        ];

        for (const selectFields of guestQueries) {
          const { data: guestData, error: guestError } = await supabase
            .from('users')
            .select(selectFields)
            .in('id', guestIds);

          if (guestError) {
            if (guestError.code === '42703') {
              continue;
            }

            Alert.alert('Error', guestError.message);
            return;
          }

          guestMap = (guestData || []).reduce((acc, guest) => {
            acc[guest.id] = guest;
            return acc;
          }, {});
          break;
        }
      }

      setBookings((bookingsData || []).map((booking) => ({
        ...booking,
        owner_id: booking.owner_id || ownerId,
        apartment: apartmentMap[booking.apartment_id] || null,
        guest: guestMap[booking.user_id] || null,
      })));
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  // Ndihmon UI-ne te shfaq nje emer edhe kur mungojne disa fusha.
  const getGuestName = (guest) => {
    if (!guest) {
      return 'Unknown guest';
    }

    const fullName = [guest.first_name, guest.last_name].filter(Boolean).join(' ').trim();
    return fullName || guest.email || 'Unknown guest';
  };

  const getGuestNameFromBooking = (booking) => {
    const bookingName = [booking.guest_first_name, booking.guest_last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (bookingName) {
      return bookingName;
    }

    return getGuestName(booking.guest);
  };

  // Kthen telefonin e klientit ose tekst fallback kur mungon.
  const getGuestPhone = (guest) => {
    if (!guest?.phone) {
      return 'No phone number';
    }

    return guest.phone;
  };

  const getGuestPhoneFromBooking = (booking) => {
    if (booking.guest_phone) {
      return booking.guest_phone;
    }

    return getGuestPhone(booking.guest);
  };

  // Renderon kerkesen e booking-ut me butona accept/reject/cancel.
  const renderBooking = ({ item }) => {
    const guestPhone = getGuestPhoneFromBooking(item);
    const hasGuestPhone = guestPhone !== 'No phone number';
    const status = String(item.status || 'pending').toLowerCase();
    const canDecide = status === 'pending';
    const canCancel = !['cancelled', 'rejected'].includes(status);

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{item.apartment?.title || 'Unknown Apartment'}</Text>
        <Text style={styles.cardCity}>{item.apartment?.city || 'Unknown city'}</Text>
        <View style={styles.row}>
          <Text style={styles.metaLabel}>From</Text>
          <Text style={styles.metaValue}>{item.start_date}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.metaLabel}>To</Text>
          <Text style={styles.metaValue}>{item.end_date}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status || 'pending'}</Text>
        </View>
        <Text style={styles.guestNameLabel}>Full name: {getGuestNameFromBooking(item)}</Text>
        <TouchableOpacity
          style={styles.phoneLink}
          onPress={() => openWhatsAppForPhone(guestPhone)}
          disabled={!hasGuestPhone}
        >
          <Text style={[styles.userIdLabel, !hasGuestPhone && styles.userIdLabelDisabled]}>
            Phone number: {guestPhone}
          </Text>
        </TouchableOpacity>
        {canDecide ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.acceptButton} onPress={() => handleStatusChange(item, 'accepted')}>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectButton} onPress={() => handleStatusChange(item, 'rejected')}>
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {canCancel ? (
          <TouchableOpacity style={styles.cancelButton} onPress={() => handleStatusChange(item, 'cancelled')}>
            <Text style={styles.rejectButtonText}>Cancel</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  // Ndryshon statusin e booking-ut dhe njofton klientin.
  const handleStatusChange = (booking, status) => {
    Alert.alert('Change status', `Change this booking to ${status}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: async () => {
          const { error } = await updateBookingStatus({
            bookingId: booking.id,
            status,
            cancelledBy: status === 'cancelled' ? currentOwnerId : null,
          });

          if (error) {
            Alert.alert('Error', error.message);
            return;
          }

          await createNotification({
            userId: booking.user_id,
            title: 'Booking status changed',
            message: `${booking.apartment?.title || 'Booking'} is ${status}.`,
            type: `booking_${status}`,
            bookingId: booking.id,
            apartmentId: booking.apartment_id,
          });

          loadBookings();
        },
      },
    ]);
  };

  // UI kryesor: header dhe lista e kerkesave per pronarin.
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()}>
          <Text style={styles.backChipText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Owner bookings</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#14213D" style={styles.loader} />
      ) : bookings.length ? (
        <FlatList
          data={bookings}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={renderBooking}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyText}>Your apartments do not have reservations yet.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// Stilet per kartat e booking-eve dhe butonat accept/reject/cancel.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F7',
    paddingHorizontal: 18,
  },
  header: {
    paddingTop: 10,
    marginBottom: 18,
  },
  backChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D2D8E3',
    marginBottom: 12,
  },
  backChipText: {
    color: '#14213D',
    fontWeight: '700',
  },
  title: {
    color: '#14213D',
    fontSize: 28,
    fontWeight: '800',
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingTop: 2,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    color: '#14213D',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardCity: {
    color: '#667085',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  metaValue: {
    color: '#14213D',
    fontWeight: '700',
  },
  userIdLabel: {
    color: '#16A34A',
    fontWeight: '700',
  },
  userIdLabelDisabled: {
    color: '#667085',
  },
  phoneLink: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF1F7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  statusText: {
    color: '#14213D',
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#15803D',
    fontWeight: '800',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FFE9EA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#D92D20',
    fontWeight: '800',
  },
  cancelButton: {
    backgroundColor: '#FFE9EA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  guestNameLabel: {
    marginTop: 10,
    color: '#14213D',
    fontWeight: '800',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#14213D',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  emptyText: {
    color: '#667085',
    textAlign: 'center',
    lineHeight: 22,
  },
});
