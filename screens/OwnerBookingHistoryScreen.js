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
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { openWhatsAppForPhone } from '../utils/whatsapp';
import { createNotification, updateBookingStatus } from '../services/sprintOne';

export default function OwnerBookingHistoryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [currentOwnerId, setCurrentOwnerId] = useState(null);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const ownerId = authData?.user?.id;

      if (authError || !ownerId) {
        Alert.alert('Gabim', 'Duhet te jesh i kycur per te pare rezervimet e apartamenteve.' );
        navigation.goBack();
        return;
      }

      setCurrentOwnerId(ownerId);

      const { data: apartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select('id, title, city')
        .eq('owner_id', ownerId);

      if (apartmentsError) {
        Alert.alert('Gabim', apartmentsError.message);
        return;
      }

      const apartmentIds = (apartments || []).map((item) => item.id).filter(Boolean);

      if (!apartmentIds.length) {
        setBookings([]);
        return;
      }

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
        Alert.alert('Gabim', bookingsByOwnerError.message);
        return;
      }

      const hasOwnerBookings = Array.isArray(bookingsByOwner) && bookingsByOwner.length > 0;

      const { data: bookingsByApartment, error: bookingsByApartmentError } = hasOwnerBookings
        ? { data: null, error: null }
        : await supabase
            .from('bookings')
            .select(bookingFields)
            .in('apartment_id', apartmentIds)
            .order('start_date', { ascending: false });

      if (bookingsByApartmentError) {
        Alert.alert('Gabim', bookingsByApartmentError.message);
        return;
      }

      const bookingsData = hasOwnerBookings ? bookingsByOwner : bookingsByApartment;

      const apartmentMap = (apartments || []).reduce((acc, apartment) => {
        acc[apartment.id] = apartment;
        return acc;
      }, {});

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

            Alert.alert('Gabim', guestError.message);
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

  const getGuestPhone = (guest) => {
    if (!guest?.phone) {
      return 'Nuk ka numer';
    }

    return guest.phone;
  };

  const getGuestPhoneFromBooking = (booking) => {
    if (booking.guest_phone) {
      return booking.guest_phone;
    }

    return getGuestPhone(booking.guest);
  };

  const renderBooking = ({ item }) => {
    const guestPhone = getGuestPhoneFromBooking(item);
    const hasGuestPhone = guestPhone !== 'Nuk ka numer';
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
        <Text style={styles.guestNameLabel}>Emri dhe mbiemri: {getGuestNameFromBooking(item)}</Text>
        <TouchableOpacity
          style={styles.phoneLink}
          onPress={() => openWhatsAppForPhone(guestPhone)}
          disabled={!hasGuestPhone}
        >
          <Text style={[styles.userIdLabel, !hasGuestPhone && styles.userIdLabelDisabled]}>
            Numri i telefonit: {guestPhone}
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

  const handleStatusChange = (booking, status) => {
    Alert.alert('Ndrysho statusin', `Ta ndryshoj rezervimin ne ${status}?`, [
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
            Alert.alert('Gabim', error.message);
            return;
          }

          await createNotification({
            userId: booking.user_id,
            title: 'Statusi i rezervimit ndryshoi',
            message: `${booking.apartment?.title || 'Rezervimi'} eshte ${status}.`,
            type: `booking_${status}`,
            bookingId: booking.id,
            apartmentId: booking.apartment_id,
          });

          loadBookings();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F7',
    padding: 20,
  },
  header: {
    marginBottom: 22,
  },
  backChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D2D8E3',
    marginBottom: 18,
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
