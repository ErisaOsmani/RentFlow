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

export default function OwnerBookingHistoryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);

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

      const { data: bookingsByOwner, error: bookingsByOwnerError } = await supabase
        .from('bookings')
        .select('id, start_date, end_date, user_id, apartment_id')
        .eq('owner_id', ownerId)
        .order('start_date', { ascending: false });

      if (bookingsByOwnerError && bookingsByOwnerError.code !== '42703') {
        Alert.alert('Gabim', bookingsByOwnerError.message);
        return;
      }

      const hasOwnerBookings = Array.isArray(bookingsByOwner) && bookingsByOwner.length > 0;

      const { data: bookingsByApartment, error: bookingsByApartmentError } = hasOwnerBookings
        ? { data: null, error: null }
        : await supabase
            .from('bookings')
            .select('id, start_date, end_date, user_id, apartment_id')
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

      setBookings((bookingsData || []).map((booking) => ({
        ...booking,
        apartment: apartmentMap[booking.apartment_id] || null,
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

  const renderBooking = ({ item }) => (
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
      <Text style={styles.userIdLabel}>Guest ID: {item.user_id}</Text>
    </View>
  );

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
    marginTop: 10,
    color: '#667085',
    fontWeight: '700',
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
