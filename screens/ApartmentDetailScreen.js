import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  TextInput,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { parseImageUrls, getPrimaryImageUrl } from '../utils/apartmentImages';
import { getBillingMonthCount, getMonthlyBookingTotal } from '../utils/bookingPricing';
import DateRangeCalendar from '../components/DateRangeCalendar';
import { openWhatsAppForPhone } from '../utils/whatsapp';
import {
  getAmenityLabels,
  getProfileVerificationLabel,
  hasMapLocation,
  USER_PROFILE_SELECT_FULL,
} from '../utils/marketplace';
import {
  createBooking,
  createNotification,
  getBlockingBookings,
  getCurrentUser,
  loadFavoriteApartmentIds,
  loadReviewData,
  submitApartmentReview,
  toggleFavorite,
} from '../services/sprintOne';

export default function ApartmentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const apartment = route.params?.apartment;
  const routeViewerRole = route.params?.viewerRole || null;

  const imageUrls = useMemo(() => parseImageUrls(apartment?.image_url), [apartment?.image_url]);
  const heroImage = imageUrls[0] || getPrimaryImageUrl(apartment?.image_url);
  const { width } = useWindowDimensions();
  const galleryListRef = useRef(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [favoriteUnavailable, setFavoriteUnavailable] = useState(false);
  const [reviewData, setReviewData] = useState({ reviews: [], averageRating: 0, reviewCount: 0 });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [viewerRole, setViewerRole] = useState(routeViewerRole);
  const isAdminView = viewerRole === 'admin';

  const loadRecentBookings = useCallback(async () => {
    if (!apartment?.id) {
      return;
    }

    setRecentLoading(true);

    try {
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
          Alert.alert('Gabim', fallback.error.message);
          return;
        }

        setRecentBookings(fallback.data || []);
        return;
      }

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      setRecentBookings((data || []).filter(
        (booking) => !['cancelled', 'rejected'].includes(String(booking.status || 'accepted').toLowerCase())
      ));
    } finally {
      setRecentLoading(false);
    }
  }, [apartment?.id]);

  const loadOwnerProfile = useCallback(async () => {
    if (!apartment?.owner_id) {
      setOwnerProfile(null);
      return;
    }

    const ownerSelectOptions = USER_PROFILE_SELECT_FULL;

    for (const selectFields of ownerSelectOptions) {
      const { data, error } = await supabase
        .from('users')
        .select(selectFields)
        .eq('id', apartment.owner_id)
        .maybeSingle();

      if (error?.code === '42703') {
        continue;
      }

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      setOwnerProfile(data || null);
      break;
    }
  }, [apartment?.owner_id]);

  useEffect(() => {
    if (!isAdminView) {
      loadRecentBookings();
    }
  }, [isAdminView, loadRecentBookings]);

  useEffect(() => {
    loadOwnerProfile();
  }, [loadOwnerProfile]);

  const loadFavoriteState = useCallback(async () => {
    if (!apartment?.id) {
      return;
    }

    const { user } = await getCurrentUser();

    if (!user) {
      return;
    }

    const { favoriteApartmentIds, unavailable } = await loadFavoriteApartmentIds(user.id);
    setFavoriteUnavailable(unavailable);
    setFavorite(favoriteApartmentIds.map(String).includes(String(apartment.id)));
  }, [apartment?.id]);

  const loadReviews = useCallback(async () => {
    if (!apartment?.id) {
      return;
    }

    const result = await loadReviewData(apartment.id);
    setReviewData(result);
  }, [apartment?.id]);

  useEffect(() => {
    if (!isAdminView) {
      loadFavoriteState();
    }
  }, [isAdminView, loadFavoriteState]);

  useEffect(() => {
    if (!isAdminView) {
      loadReviews();
    }
  }, [isAdminView, loadReviews]);

  useEffect(() => {
    if (routeViewerRole) {
      setViewerRole(routeViewerRole);
      return;
    }

    let isMounted = true;

    const loadViewerRole = async () => {
      const { user } = await getCurrentUser();

      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && isMounted) {
        setViewerRole(data?.role || null);
      }
    };

    loadViewerRole();

    return () => {
      isMounted = false;
    };
  }, [routeViewerRole]);

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

  const monthCount = getBillingMonthCount(startDate, endDate);
  const totalPrice = getMonthlyBookingTotal(apartment?.price, startDate, endDate);
  const profileOwnerName = [ownerProfile?.first_name, ownerProfile?.last_name].filter(Boolean).join(' ').trim();
  const ownerName = apartment?.owner_name || profileOwnerName;
  const ownerPhone = apartment?.owner_phone || ownerProfile?.phone;
  const amenityLabels = getAmenityLabels(apartment);
  const ownerVerificationLabel = getProfileVerificationLabel(ownerProfile);

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

    if (!monthCount) {
      Alert.alert('Gabim', 'Data e mbarimit duhet te jete pas dates se fillimit.');
      return;
    }

    try {
      setBookingLoading(true);

      const { user, error: authError } = await getCurrentUser();

      if (authError || !user) {
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

      const { bookings: conflictingBookings, error: conflictError } = await getBlockingBookings({
        apartmentId: apartment.id,
        startDate: normalizedStart,
        endDate: normalizedEnd,
      });

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
        Alert.alert('Gabim', error.message);
        return;
      }

      await createNotification({
        userId: ownerId,
        title: 'Rezervim i ri',
        message: `${apartment.title} ka nje kerkese te re nga ${normalizedStart} deri me ${normalizedEnd}.`,
        type: 'booking_created',
        bookingId: booking?.id || null,
        apartmentId: apartment.id,
      });

      Alert.alert('Success', 'Booking request sent!');
      setStartDate('');
      setEndDate('');
      loadRecentBookings();
    } finally {
      setBookingLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    const { user } = await getCurrentUser();

    if (!user) {
      Alert.alert('Gabim', 'Duhet te jesh i kycur per favorites.');
      return;
    }

    const result = await toggleFavorite({
      userId: user.id,
      apartmentId: apartment.id,
      isFavorite: favorite,
    });

    if (result.error) {
      Alert.alert('Gabim', result.error.message);
      return;
    }

    if (favoriteUnavailable) {
      Alert.alert('Info', 'Ekzekuto supabase_sprint1.sql per me aktivizu favorites.');
      return;
    }

    setFavorite(result.isFavorite);
  };

  const handleSubmitReview = async () => {
    const { user } = await getCurrentUser();

    if (!user) {
      Alert.alert('Gabim', 'Duhet te jesh i kycur per review.');
      return;
    }

    try {
      setReviewLoading(true);
      const { error } = await submitApartmentReview({
        userId: user.id,
        apartmentId: apartment.id,
        rating: reviewRating,
        comment: reviewComment,
      });

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      if (reviewData.unavailable) {
        Alert.alert('Info', 'Ekzekuto supabase_sprint1.sql per me aktivizu reviews.');
        return;
      }

      setReviewComment('');
      await loadReviews();
      Alert.alert('Success', 'Review u ruajt.');
    } finally {
      setReviewLoading(false);
    }
  };

  const openGoogleMaps = async () => {
    const query = hasMapLocation(apartment)
      ? `${apartment.latitude},${apartment.longitude}`
      : [apartment?.address, apartment?.neighborhood, apartment?.city].filter(Boolean).join(', ');

    if (!query) {
      Alert.alert('Map', 'Lokacioni nuk eshte shtuar ende.');
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    await Linking.openURL(url);
  };

  const openChat = async () => {
    const { user, error } = await getCurrentUser();

    if (error || !user) {
      Alert.alert('Gabim', 'Duhet te jesh i kycur per chat.');
      return;
    }

    if (!apartment?.owner_id) {
      Alert.alert('Gabim', 'Owner-i i kesaj banese nuk u gjet.');
      return;
    }

    navigation.navigate('Chat', { apartment, clientId: user.id });
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
          {!isAdminView ? (
            <Text style={styles.ratingText}>
              {reviewData.reviewCount
                ? `${reviewData.averageRating.toFixed(1)} / 5 (${reviewData.reviewCount} reviews)`
                : 'No reviews yet'}
            </Text>
          ) : null}
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceBadgeText}>${apartment.price} / month</Text>
        </View>
      </View>

      {!isAdminView ? (
        <TouchableOpacity style={styles.favoriteButton} onPress={handleToggleFavorite}>
          <Text style={styles.favoriteButtonText}>
            {favorite ? 'Saved apartment' : 'Save apartment'}
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.metaRow}>
        <View style={[styles.metaChip, styles.metaChipMarginRight]}>
          <Text style={styles.metaLabel}>Rooms</Text>
          <Text style={styles.metaValue}>{apartment.rooms || '-'}</Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaLabel}>Type</Text>
          <Text style={styles.metaValue}>{apartment.type || 'Apartment'}</Text>
        </View>
      </View>

      {amenityLabels.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesRow}>
            {amenityLabels.map((label) => (
              <View key={label} style={styles.amenityChip}>
                <Text style={styles.amenityChipText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <TouchableOpacity style={styles.mapBox} activeOpacity={0.88} onPress={openGoogleMaps}>
          <Text style={styles.mapTitle}>{apartment.address || apartment.neighborhood || apartment.city || 'Lokacion'}</Text>
          <Text style={styles.mapText}>
            {hasMapLocation(apartment)
              ? `${Number(apartment.latitude).toFixed(5)}, ${Number(apartment.longitude).toFixed(5)}`
              : 'Hap ne Google Maps me adrese/qytet.'}
          </Text>
          <Text style={styles.mapButtonText}>Open Google Maps</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Text style={styles.description}>{apartment.description || 'No description provided.'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Owner</Text>
        <TouchableOpacity
          style={styles.ownerContact}
          onPress={() => openWhatsAppForPhone(ownerPhone)}
          disabled={!ownerPhone}
        >
          <Text style={styles.ownerName}>{ownerName || 'Owner'}</Text>
          <Text style={[styles.verificationText, ownerProfile?.verified && styles.verificationTextVerified]}>
            {ownerVerificationLabel}
          </Text>
          <Text style={[styles.ownerPhone, !ownerPhone && styles.ownerPhoneDisabled]}>
            {ownerPhone || 'Nuk ka numer'}
          </Text>
        </TouchableOpacity>
        {!isAdminView ? (
          <TouchableOpacity style={styles.chatButton} onPress={openChat}>
            <Text style={styles.chatButtonText}>Chat in app</Text>
          </TouchableOpacity>
        ) : null}
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

      {!isAdminView ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Book this apartment</Text>
            <DateRangeCalendar
              startDate={startDate}
              endDate={endDate}
              unavailableRanges={recentBookings}
              onChange={(nextStartDate, nextEndDate) => {
                setStartDate(nextStartDate);
                setEndDate(nextEndDate);
              }}
            />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Monthly stay</Text>
              <Text style={styles.summaryValue}>
                {monthCount || 0} {monthCount === 1 ? 'month' : 'months'}
              </Text>
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
              recentBookings.slice(0, 3).map((booking) => (
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[styles.ratingPill, reviewRating === rating && styles.ratingPillActive]}
                  onPress={() => setReviewRating(rating)}
                >
                  <Text style={[styles.ratingPillText, reviewRating === rating && styles.ratingPillTextActive]}>
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="Write a short review"
              placeholderTextColor="#8F97A8"
              style={styles.reviewInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
            />
            <TouchableOpacity
              style={[styles.reviewButton, reviewLoading && styles.bookButtonDisabled]}
              onPress={handleSubmitReview}
              disabled={reviewLoading}
            >
              {reviewLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.bookButtonText}>Submit review</Text>
              )}
            </TouchableOpacity>
            {reviewData.reviews?.slice(0, 3).map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <Text style={styles.metaValue}>{review.rating} / 5</Text>
                <Text style={styles.description}>{review.comment || 'No comment.'}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

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
  ratingText: {
    color: '#14213D',
    fontWeight: '800',
    marginTop: 8,
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
  favoriteButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D8E3',
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 18,
  },
  favoriteButtonText: {
    color: '#14213D',
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
  ownerContact: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DEE4EF',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  ownerName: {
    color: '#14213D',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  verificationText: {
    color: '#D92D20',
    fontWeight: '800',
    marginBottom: 6,
  },
  verificationTextVerified: {
    color: '#15803D',
  },
  ownerPhone: {
    color: '#FF5A5F',
    fontWeight: '800',
  },
  ownerPhoneDisabled: {
    color: '#94A3B8',
  },
  chatButton: {
    backgroundColor: '#14213D',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  amenityChipText: {
    color: '#14213D',
    fontWeight: '800',
  },
  mapBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  mapTitle: {
    color: '#14213D',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  mapText: {
    color: '#667085',
    lineHeight: 20,
    marginBottom: 12,
  },
  mapButtonText: {
    color: '#FF5A5F',
    fontWeight: '800',
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
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  ratingPill: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ratingPillActive: {
    backgroundColor: '#14213D',
    borderColor: '#14213D',
  },
  ratingPillText: {
    color: '#14213D',
    fontWeight: '800',
  },
  ratingPillTextActive: {
    color: '#FFFFFF',
  },
  reviewInput: {
    minHeight: 90,
    backgroundColor: '#F8FAFC',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  reviewButton: {
    backgroundColor: '#FF5A5F',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  reviewItem: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginTop: 10,
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
  
