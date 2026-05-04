import React, { useState } from 'react';
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
import { supabase } from '../services/supabase';
import DateRangeCalendar from '../components/DateRangeCalendar';

export default function BookingScreen({ route, navigation }) {
  const { apartment } = route.params;

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(false);

  const getNightCount = () => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 0;
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return days > 0 ? days : 0;
  };

  const nightCount = getNightCount();
  const totalPrice = nightCount * Number(apartment.price || 0);

  const book = async () => {
    const normalizedStart = start.trim();
    const normalizedEnd = end.trim();

    if (!normalizedStart || !normalizedEnd) {
      Alert.alert('Gabim', 'Ploteso datat e rezervimit.');
      return;
    }

    if (!nightCount) {
      Alert.alert('Gabim', 'Data e mbarimit duhet te jete pas dates se fillimit.');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Gabim', 'Duhet te jesh i kycur per te bere rezervim.');
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
          Alert.alert('Gabim', apartmentError.message);
          return;
        }

        ownerId = apartmentData?.owner_id;
      }

      if (!ownerId) {
        Alert.alert('Gabim', 'Owner-i i kesaj banese nuk u gjet.');
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
          Alert.alert('Gabim', profileError.message);
          return;
        }

        guestProfile = profileData;
        break;
      }

      const { data: conflictingBookings, error: conflictError } = await supabase
        .from('bookings')
        .select('id, start_date, end_date')
        .eq('apartment_id', apartment.id)
        .lt('start_date', normalizedEnd)
        .gt('end_date', normalizedStart)
        .limit(1);

      if (conflictError) {
        Alert.alert('Gabim', conflictError.message);
        return;
      }

      if (conflictingBookings?.length) {
        const conflict = conflictingBookings[0];
        Alert.alert(
          'Gabim',
          `Ky apartament eshte i rezervuar nga ${conflict.start_date} deri me ${conflict.end_date}. Zgjidh data te tjera.`
        );
        return;
      }

      const bookingPayloadOptions = [
        {
          user_id: user.id,
          owner_id: ownerId,
          apartment_id: apartment.id,
          start_date: normalizedStart,
          end_date: normalizedEnd,
          guest_first_name: guestProfile?.first_name || null,
          guest_last_name: guestProfile?.last_name || null,
          guest_phone: guestProfile?.phone || null,
        },
        {
          user_id: user.id,
          owner_id: ownerId,
          apartment_id: apartment.id,
          start_date: normalizedStart,
          end_date: normalizedEnd,
        },
      ];

      let error = null;

      for (const payload of bookingPayloadOptions) {
        const result = await supabase.from('bookings').insert(payload);

        if (!result.error) {
          error = null;
          break;
        }

        if (result.error.code === '42703') {
          error = result.error;
          continue;
        }

        error = result.error;
        break;
      }

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      Alert.alert('Success', 'Booking successful!');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()}>
            <Text style={styles.backChipText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.eyebrow}>BOOKING</Text>
          <Text style={styles.title}>{apartment.title}</Text>
          <Text style={styles.subtitle}>{apartment.city} | ${apartment.price} / night</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Choose your stay</Text>

          <DateRangeCalendar
            startDate={start}
            endDate={end}
            onChange={(nextStart, nextEnd) => {
              setStart(nextStart);
              setEnd(nextEnd);
            }}
          />

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Night stay</Text>
            <Text style={styles.summaryValue}>{nightCount || 0} nights</Text>
            <Text style={styles.summaryLabel}>Estimated total</Text>
            <Text style={styles.summaryTotal}>${totalPrice || 0}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F7',
  },
  content: {
    padding: 20,
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
