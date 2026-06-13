import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { formatPrice } from '../utils/marketplace';
import { getBillingMonthCount, getMonthlyBookingTotal } from '../utils/bookingPricing';
import DateRangeCalendar from '../components/DateRangeCalendar';
import {
  createBooking,
  createNotification,
  getBlockingBookings,
  getCurrentUser,
} from '../services/sprintOne';

export default function BookingScreen({ route, navigation }) {
  const { apartment } = route.params;

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [unavailableRanges, setUnavailableRanges] = useState([]);

  const monthCount = getBillingMonthCount(start, end);
  const totalPrice = getMonthlyBookingTotal(apartment.price, start, end);

  const loadUnavailableRanges = useCallback(async () => {
    if (!apartment?.id) {
      setUnavailableRanges([]);
      return;
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('id, start_date, end_date, status')
      .eq('apartment_id', apartment.id)
      .order('start_date', { ascending: false });

    if (error?.code === '42703') {
      const fallback = await supabase
        .from('bookings')
        .select('id, start_date, end_date')
        .eq('apartment_id', apartment.id)
        .order('start_date', { ascending: false });

      if (fallback.error) {
        Alert.alert('Error', fallback.error.message);
        return;
      }

      setUnavailableRanges(fallback.data || []);
      return;
    }

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setUnavailableRanges((data || []).filter(
      (booking) => !['cancelled', 'rejected'].includes(String(booking.status || 'accepted').toLowerCase())
    ));
  }, [apartment?.id]);

  useEffect(() => {
    loadUnavailableRanges();
  }, [loadUnavailableRanges]);

  const book = async () => {
    const normalizedStart = start.trim();
    const normalizedEnd = end.trim();

    if (!normalizedStart || !normalizedEnd) {
      Alert.alert('Error', 'Fill in the booking dates.');
      return;
    }

    if (!monthCount) {
      Alert.alert('Error', 'The end date must be after the start date.');
      return;
    }

    try {
      setLoading(true);

      const { user } = await getCurrentUser();

      if (!user) {
        Alert.alert('Error', 'You must be logged in to make a booking.');
        return;
      }

      let ownerId = apartment.owner_id;

      if (!ownerId && apartment.id) {
        const { data: apartmentData, error: apartmentError } = await supabase
          .from('apartments')
          .select('owner_id')
          .eq('id', apartment.id)
          .maybeSingle();

        if (apartmentError) {
          Alert.alert('Error', apartmentError.message);
          return;
        }

        ownerId = apartmentData?.owner_id;
      }

      if (!ownerId) {
        Alert.alert('Error', 'The owner of this apartment was not found.');
        return;
      }

      let guestProfile = null;
      const guestProfileQueries = [
        'first_name, last_name, phone',
        'first_name, last_name',
        'id',
      ];

      for (const selectFields of guestProfileQueries) {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select(selectFields)
          .eq('id', user.id)
          .maybeSingle();

        if (profileError?.code === '42703') {
          continue;
        }

        if (profileError) {
          Alert.alert('Error', profileError.message);
          return;
        }

        guestProfile = profileData;
        break;
      }

      const { bookings: conflictingBookings, error: conflictError } = await getBlockingBookings({
        apartmentId: apartment.id,
        startDate: normalizedStart,
        endDate: normalizedEnd,
      });

      if (conflictError) {
        Alert.alert('Error', conflictError.message);
        return;
      }

      if (conflictingBookings?.length) {
        const conflict = conflictingBookings[0];
        Alert.alert(
          'Error',
          `This apartment is booked from ${conflict.start_date} until ${conflict.end_date}. Choose different dates.`
        );
        return;
      }

      const { booking, error } = await createBooking({
        user_id: user.id,
        owner_id: ownerId,
        apartment_id: apartment.id,
        start_date: normalizedStart,
        end_date: normalizedEnd,
        guest_first_name: guestProfile?.first_name || null,
        guest_last_name: guestProfile?.last_name || null,
        guest_phone: guestProfile?.phone || null,
      });

      if (error) {
        Alert.alert('Error', error.message);
        await loadUnavailableRanges();
        return;
      }

      await createNotification({
        userId: ownerId,
        title: 'New booking request',
        message: `${apartment.title} has a new request from ${normalizedStart} until ${normalizedEnd}.`,
        type: 'booking_created',
        bookingId: booking?.id || null,
        apartmentId: apartment.id,
      });

      Alert.alert('Success', 'Booking request sent!');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()}>
              <Text style={styles.backChipText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.eyebrow}>BOOKING</Text>
            <Text style={styles.title}>{apartment.title}</Text>
            <Text style={styles.subtitle}>{formatPrice(apartment.price, apartment.currency)} / month</Text>
          </View>

          <View style={styles.card}>
          <Text style={styles.sectionTitle}>Choose your stay</Text>
          <View style={styles.locationBox}>
            <Text style={styles.locationLabel}>City</Text>
            <Text style={styles.locationValue}>{apartment.city || 'No city'}</Text>
          </View>

          <DateRangeCalendar
            startDate={start}
            endDate={end}
            unavailableRanges={unavailableRanges}
            onChange={(nextStart, nextEnd) => {
              setStart(nextStart);
              setEnd(nextEnd);
            }}
          />

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Monthly stay</Text>
            <Text style={styles.summaryValue}>
              {monthCount || 0} {monthCount === 1 ? 'month' : 'months'}
            </Text>
            <Text style={styles.summaryLabel}>Estimated total</Text>
            <Text style={styles.summaryTotal}>{formatPrice(totalPrice || 0, apartment.currency)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={book}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Confirm Booking</Text>
            )}
          </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F7',
  },
  keyboard: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: '#14213D',
    borderRadius: 24,
    padding: 24,
    marginBottom: 18,
  },
  backChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  backChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  eyebrow: {
    color: '#FCA5A5',
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#D3DAE6',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#12213F',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sectionTitle: {
    color: '#14213D',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  locationBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  locationLabel: {
    color: '#667085',
    fontWeight: '700',
    marginBottom: 4,
  },
  locationValue: {
    color: '#14213D',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#667085',
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryValue: {
    color: '#14213D',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  summaryTotal: {
    color: '#FF5A5F',
    fontSize: 24,
    fontWeight: '800',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#FF5A5F',
    borderRadius: 14,
    alignItems: 'center',
    padding: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
