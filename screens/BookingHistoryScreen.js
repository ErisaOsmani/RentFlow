import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { getPrimaryImageUrl } from '../utils/apartmentImages';
import { openWhatsAppForPhone } from '../utils/whatsapp';
import { createNotification, getCurrentUser, updateBookingStatus } from '../services/sprintOne';

export default function BookingHistoryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const { user, error: authError } = await getCurrentUser();

      if (authError || !user) {
        Alert.alert('Gabim', 'Duhet te jesh i kycur per te pare rezervimet.' );
        navigation.goBack();
        return;
      }

      setCurrentUserId(user.id);

      const bookingSelectOptions = [
        'id, start_date, end_date, status, owner_id, apartment_id',
        'id, start_date, end_date, owner_id, apartment_id',
        'id, start_date, end_date, apartment_id',
      ];

      let bookingsData = [];
      let bookingsError = null;

      for (const selectFields of bookingSelectOptions) {
        const result = await supabase
          .from('bookings')
          .select(selectFields)
          .eq('user_id', user.id)
          .order('start_date', { ascending: false });

        if (result.error?.code === '42703') {
          continue;
        }

        bookingsData = result.data || [];
        bookingsError = result.error;
        break;
      }

      if (bookingsError) {
        Alert.alert('Gabim', bookingsError.message);
        return;
      }

      const apartmentIds = (bookingsData || []).map((booking) => booking.apartment_id).filter(Boolean);

      if (!apartmentIds.length) {
        setBookings([]);
        return;
      }

      const apartmentSelectOptions = [
        'id, owner_id, owner_name, owner_phone, title, city, price, image_url',
        'id, owner_id, title, city, price, image_url',
      ];

      let apartments = [];
      let apartmentsError = null;

      for (const selectFields of apartmentSelectOptions) {
        const result = await supabase
          .from('apartments')
          .select(selectFields)
          .in('id', apartmentIds);

        if (result.error?.code === '42703') {
          continue;
        }

        apartments = result.data || [];
        apartmentsError = result.error;
        break;
      }

      if (apartmentsError) {
        Alert.alert('Gabim', apartmentsError.message);
        return;
      }

      const apartmentMap = (apartments || []).reduce((acc, apartment) => {
        acc[apartment.id] = apartment;
        return acc;
      }, {});

      const ownerIds = [...new Set((apartments || []).map((apartment) => apartment.owner_id).filter(Boolean))];
      let ownerMap = {};

      if (ownerIds.length) {
        const ownerQueries = [
          'id, first_name, last_name, phone',
          'id, first_name, last_name',
          'id',
        ];

        for (const selectFields of ownerQueries) {
          const { data: ownerData, error: ownerError } = await supabase
            .from('users')
            .select(selectFields)
            .in('id', ownerIds);

          if (ownerError?.code === '42703') {
            continue;
          }

          if (ownerError) {
            Alert.alert('Gabim', ownerError.message);
            return;
          }

          ownerMap = (ownerData || []).reduce((acc, owner) => {
            acc[owner.id] = owner;
            return acc;
          }, {});
          break;
        }
      }

      setBookings(
        (bookingsData || []).map((booking) => ({
          ...booking,
          apartment: apartmentMap[booking.apartment_id] || null,
          owner: ownerMap[apartmentMap[booking.apartment_id]?.owner_id] || null,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const renderBooking = ({ item }) => {
    const imageUrl = getPrimaryImageUrl(item.apartment?.image_url);
    const ownerPhone = item.apartment?.owner_phone || item.owner?.phone;

    return (
      <View style={styles.card}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.cardImage} /> : null}
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.apartment?.title || 'Unknown Apartment'}</Text>
          <Text style={styles.priceBadgeText}>
            {item.apartment?.price ? `$${item.apartment.price} / month` : 'N/A'}
          </Text>
        </View>
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
        <TouchableOpacity
          style={styles.phoneLink}
          onPress={() => openWhatsAppForPhone(ownerPhone)}
          disabled={!ownerPhone}
        >
          <Text style={styles.phoneLabel}>Numri i owner-it</Text>
          <Text style={[styles.phoneValue, !ownerPhone && styles.phoneValueDisabled]}>
            {ownerPhone || 'Nuk ka numer'}
          </Text>
        </TouchableOpacity>
        {!['cancelled', 'rejected'].includes(String(item.status || 'pending').toLowerCase()) ? (
          <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelBooking(item)}>
            <Text style={styles.cancelButtonText}>Cancel booking</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const handleCancelBooking = (booking) => {
    Alert.alert('Cancel booking', 'A je i sigurt qe do ta anulosh kete rezervim?', [
      { text: 'Jo', style: 'cancel' },
      {
        text: 'Po, anulo',
        style: 'destructive',
        onPress: async () => {
          const { error } = await updateBookingStatus({
            bookingId: booking.id,
            status: 'cancelled',
            cancelledBy: currentUserId,
          });

          if (error) {
            Alert.alert('Gabim', error.message);
            return;
          }

          await createNotification({
            userId: booking.owner_id || booking.apartment?.owner_id,
            title: 'Rezervimi u anulua',
            message: `${booking.apartment?.title || 'Banesa'} u anulua nga klienti.`,
            type: 'booking_cancelled',
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
        <Text style={styles.title}>My Bookings</Text>
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
          <Text style={styles.emptyText}>You have not booked any apartments yet.</Text>
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
  cardImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#14213D',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    paddingRight: 10,
  },
  priceBadgeText: {
    color: '#FF5A5F',
    fontWeight: '800',
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
  phoneLink: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  phoneLabel: {
    color: '#94A3B8',
    fontWeight: '700',
    marginBottom: 4,
  },
  phoneValue: {
    color: '#16A34A',
    fontWeight: '800',
  },
  phoneValueDisabled: {
    color: '#667085',
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
  cancelButton: {
    backgroundColor: '#FFE9EA',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 14,
  },
  cancelButtonText: {
    color: '#D92D20',
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
