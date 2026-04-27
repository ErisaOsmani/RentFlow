import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { parseImageUrls, getPrimaryImageUrl } from '../utils/apartmentImages';

export default function ApartmentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const apartment = route.params?.apartment;

  const imageUrls = useMemo(() => parseImageUrls(apartment?.image_url), [apartment?.image_url]);
  const heroImage = imageUrls[0] || getPrimaryImageUrl(apartment?.image_url);
  const { width } = useWindowDimensions();
  const galleryListRef = useRef(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const loadRecentBookings = useCallback(async () => {
    if (!apartment?.id) {
      return;
    }

    setRecentLoading(true);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, start_date, end_date')
        .eq('apartment_id', apartment.id)
        .order('start_date', { ascending: false })
        .limit(3);

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      setRecentBookings(data || []);
    } finally {
      setRecentLoading(false);
    }
  }, [apartment?.id]);

  useEffect(() => {
    loadRecentBookings();
  }, [loadRecentBookings]);

  useEffect(() => {
    if (!viewerVisible || !galleryListRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      galleryListRef.current?.scrollToIndex({
        index: viewerIndex,
        animated: false,
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [viewerIndex, viewerVisible]);

  const getNightCount = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }

    const diffMs = end.getTime() - start.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return days > 0 ? days : 0;
  };

  const nightCount = getNightCount();
  const totalPrice = nightCount * Number(apartment?.price || 0);

  const openImageViewer = (index) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handleViewerScroll = (event) => {
    if (!width) {
      return;
    }

    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setViewerIndex(nextIndex);
  };

  const handleBook = async () => {
    const normalizedStart = startDate.trim();
    const normalizedEnd = endDate.trim();

    if (!normalizedStart || !normalizedEnd) {
      Alert.alert('Gabim', 'Ploteso datat e rezervimit.');
      return;
    }

    if (!nightCount) {
      Alert.alert('Gabim', 'Data e mbarimit duhet te jete pas dates se fillimit.');
      return;
    }

    try {
      setBookingLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
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
          .eq('id', authData.user.id)
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
          user_id: authData.user.id,
          owner_id: ownerId,
          apartment_id: apartment.id,
          start_date: normalizedStart,
          end_date: normalizedEnd,
          guest_first_name: guestProfile?.first_name || null,
          guest_last_name: guestProfile?.last_name || null,
          guest_phone: guestProfile?.phone || null,
        },
        {
          user_id: authData.user.id,
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
      setStartDate('');
      setEndDate('');
      loadRecentBookings();
    } finally {
      setBookingLoading(false);
    }
  };

  if (!apartment) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Apartment details are not available.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      {heroImage ? (
        <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(0)}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} />
        </TouchableOpacity>
      ) : (
        <View style={styles.heroPlaceholder}>
          <Text style={styles.heroPlaceholderText}>No image available</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={styles.headline}>
          <Text style={styles.title}>{apartment.title}</Text>
          <Text style={styles.location}>{apartment.city}</Text>
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceBadgeText}>${apartment.price}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.metaChip, styles.metaChipMarginRight]}>
          <Text style={styles.metaLabel}>Rooms</Text>
          <Text style={styles.metaValue}>{apartment.rooms || '—'}</Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaLabel}>Type</Text>
          <Text style={styles.metaValue}>{apartment.type || 'Apartment'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Text style={styles.description}>{apartment.description || 'No description provided.'}</Text>
      </View>

      {imageUrls.length > 1 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {imageUrls.map((imageUrl, index) => (
              <TouchableOpacity
                key={`${imageUrl}-${index}`}
                activeOpacity={0.9}
                onPress={() => openImageViewer(index)}
              >
                <Image source={{ uri: imageUrl }} style={styles.galleryImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Book this apartment</Text>
        <TextInput
          placeholder="Start date (YYYY-MM-DD)"
          placeholderTextColor="#8F97A8"
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
        />
        <TextInput
          placeholder="End date (YYYY-MM-DD)"
          placeholderTextColor="#8F97A8"
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
        />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Night stay</Text>
          <Text style={styles.summaryValue}>{nightCount || 0} nights</Text>
          <Text style={styles.summaryLabel}>Estimated total</Text>
          <Text style={styles.summaryTotal}>${totalPrice || 0}</Text>
        </View>

        <TouchableOpacity
          style={[styles.bookButton, bookingLoading && styles.bookButtonDisabled]}
          onPress={handleBook}
          disabled={bookingLoading}
        >
          {bookingLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.bookButtonText}>Confirm booking</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent bookings</Text>
        {recentLoading ? (
          <ActivityIndicator color="#14213D" />
        ) : recentBookings.length ? (
          recentBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingItem}>
              <Text style={styles.metaLabel}>From</Text>
              <Text style={styles.metaValue}>{booking.start_date}</Text>
              <Text style={[styles.metaLabel, styles.bookingToLabel]}>To</Text>
              <Text style={styles.metaValue}>{booking.end_date}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.description}>No recent bookings for this apartment.</Text>
        )}
      </View>

      <Modal
        visible={viewerVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity
              style={styles.viewerCloseButton}
              onPress={() => setViewerVisible(false)}
            >
              <Text style={styles.viewerCloseText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.viewerCounter}>
              {imageUrls.length ? `${viewerIndex + 1} / ${imageUrls.length}` : ''}
            </Text>
          </View>

          <FlatList
            ref={galleryListRef}
            data={imageUrls}
            keyExtractor={(item, index) => `${item}-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex}
            onMomentumScrollEnd={handleViewerScroll}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={[styles.viewerSlide, { width }]}>
                <Image source={{ uri: item }} style={styles.viewerImage} resizeMode="contain" />
              </View>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#EEF1F7',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#D2D8E3',
  },
  backButtonText: {
    color: '#14213D',
    fontWeight: '700',
  },
  heroImage: {
    width: '100%',
    height: 260,
    borderRadius: 24,
    marginBottom: 20,
    backgroundColor: '#E5E7EB',
  },
  heroPlaceholder: {
    width: '100%',
    height: 260,
    borderRadius: 24,
    backgroundColor: '#D8E1EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroPlaceholderText: {
    color: '#667085',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headline: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: '#14213D',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  location: {
    color: '#667085',
    fontSize: 16,
  },
  priceBadge: {
    backgroundColor: '#FFE9EA',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  priceBadgeText: {
    color: '#FF5A5F',
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metaChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaChipMarginRight: {
    marginRight: 12,
  },
  metaLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  metaValue: {
    color: '#14213D',
    fontSize: 18,
    fontWeight: '800',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    color: '#14213D',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  description: {
    color: '#475569',
    lineHeight: 22,
  },
  gallery: {
    flexDirection: 'row',
  },
  galleryImage: {
    width: 140,
    height: 120,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
  },
  input: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  bookButton: {
    backgroundColor: '#14213D',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 30,
  },
  bookButtonDisabled: {
    opacity: 0.7,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  bookingItem: {
    backgroundColor: '#F5F7FB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  bookingToLabel: {
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#EEF1F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#667085',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#050816',
    paddingTop: 56,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  viewerCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewerCloseText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  viewerCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  viewerSlide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  viewerImage: {
    width: '100%',
    height: '78%',
  },
});
  
