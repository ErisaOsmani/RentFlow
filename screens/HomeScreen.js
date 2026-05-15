import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SectionList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { logoutUser } from '../services/auth';
import { getPrimaryImageUrl } from '../utils/apartmentImages';
import { filterAvailableApartments, getActiveBookedApartmentIds } from '../utils/apartmentAvailability';
import { APARTMENT_SELECT_FULL, getAmenityLabels } from '../utils/marketplace';
import { getCurrentUser, loadUnreadNotificationCount } from '../services/sprintOne';
import { registerForPushNotifications } from '../services/pushNotifications';

export default function HomeScreen({ navigation }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const loadApartments = useCallback(async () => {
    try {
      setLoading(true);
      const selectOptions = APARTMENT_SELECT_FULL;

      let data = [];
      let error = null;

      for (const selectFields of selectOptions) {
        const result = await supabase
          .from('apartments')
          .select(selectFields)
          .order('city', { ascending: true })
          .order('title', { ascending: true });

        if (result.error?.code === '42703') {
          continue;
        }

        data = result.data || [];
        error = result.error;
        break;
      }

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      const { bookedApartmentIds, error: bookedError } = await getActiveBookedApartmentIds();

      if (bookedError) {
        Alert.alert('Error', bookedError.message);
        return;
      }

      const availableApartments = filterAvailableApartments(data, bookedApartmentIds);

      const grouped = availableApartments.reduce((acc, item) => {
        const city = item.city || 'Pa qytet';
        const existing = acc.find((section) => section.title === city);

        if (existing) {
          existing.data.push(item);
        } else {
          acc.push({ title: city, data: [item] });
        }

        return acc;
      }, []);

      setSections(grouped);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadApartments();
    }, [loadApartments])
  );

  const loadUnreadMessages = useCallback(async () => {
    const { user } = await getCurrentUser();

    if (!user) {
      return;
    }

    await registerForPushNotifications(user.id);

    const { count, error } = await loadUnreadNotificationCount(user.id, 'chat_message');

    if (!error) {
      setUnreadMessages(count);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUnreadMessages();
    }, [loadUnreadMessages])
  );

  useEffect(() => {
    let channel = null;
    let mounted = true;

    const subscribeToNotifications = async () => {
      const { user } = await getCurrentUser();

      if (!mounted || !user) {
        return;
      }

      channel = supabase
        .channel(`home-chat-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const nextType = payload.new?.type || payload.old?.type;

            if (nextType === 'chat_message') {
              loadUnreadMessages();
            }
          }
        )
        .subscribe();
    };

    subscribeToNotifications();

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadUnreadMessages]);

  const handleLogout = () => {
    Alert.alert('Logout', 'A je i sigurt qe do te dalesh?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            const { error } = await logoutUser();

            if (error) {
              Alert.alert('Gabim', error.message);
              return;
            }

            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>DISCOVER</Text>
            <Text style={styles.title}>Apartments By City</Text>
          </View>
          <TouchableOpacity
            style={[styles.logoutChip, loggingOut && styles.logoutChipDisabled]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <Text style={styles.logoutChipText}>{loggingOut ? '...' : 'Logout'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Klientat mund t'i shohin banesat sipas qyteteve dhe me pershkrim te plote.
        </Text>

        <View style={styles.heroButtons}>
          <TouchableOpacity style={styles.searchButton} onPress={() => navigation.navigate('Search')}>
            <Text style={styles.searchButtonText}>Search & Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('BookingHistory')}>
            <Text style={styles.historyButtonText}>My bookings</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.heroButtons}>
          <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('Favorites')}>
            <Text style={styles.historyButtonText}>Saved</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.historyButtonText}>Notifications</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.heroButtons}>
          <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.historyButtonText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('Messages')}>
            {unreadMessages > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
              </View>
            ) : null}
            <Text style={styles.historyButtonText}>Messages</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadApartments}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? <ActivityIndicator color="#14213D" /> : <Text style={styles.emptyTitle}>Nuk ka banesa ende</Text>}
            <Text style={styles.emptyText}>
              {loading ? 'Po ngarkohen listing-et...' : 'Owner-at ende nuk kane shtuar banesa.'}
            </Text>
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.cityHeader}>{title}</Text>
        )}
        renderItem={({ item }) => {
          const primaryImageUrl = getPrimaryImageUrl(item.image_url);

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ApartmentDetail', { apartment: item })}
            >
              {primaryImageUrl ? (
                <Image source={{ uri: primaryImageUrl }} style={styles.cardImage} />
              ) : null}
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>${item.price} / month</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>{item.description || 'Pa pershkrim.'}</Text>
              <Text style={styles.cardMeta}>
                {item.rooms} rooms | {item.neighborhood || item.city || 'Lokacion'}
              </Text>
              <View style={styles.amenitiesRow}>
                {getAmenityLabels(item).slice(0, 4).map((label) => (
                  <View key={label} style={styles.amenityChip}>
                    <Text style={styles.amenityChipText}>{label}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F7',
    paddingTop: 20,
    paddingHorizontal: 18,
  },
  hero: {
    backgroundColor: '#14213D',
    borderRadius: 24,
    padding: 24,
    marginBottom: 18,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: 12,
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
    lineHeight: 20,
  },
  logoutChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutChipDisabled: {
    opacity: 0.7,
  },
  logoutChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  searchButton: {
    flex: 1,
    backgroundColor: '#14213D',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  historyButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D2D8E3',
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  historyButtonText: {
    color: '#14213D',
    fontWeight: '800',
    fontSize: 14,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 12,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF5A5F',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    zIndex: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  list: {
    width: '100%',
  },
  listContent: {
    paddingBottom: 28,
  },
  cityHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#14213D',
    marginTop: 4,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#12213F',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 170,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: '#E5E7EB',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    color: '#14213D',
    fontSize: 20,
    fontWeight: '800',
    paddingRight: 10,
  },
  priceBadge: {
    backgroundColor: '#FFE9EA',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceBadgeText: {
    color: '#FF5A5F',
    fontWeight: '800',
  },
  cardDesc: {
    color: '#667085',
    lineHeight: 20,
  },
  cardMeta: {
    color: '#14213D',
    marginTop: 12,
    fontWeight: '700',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  amenityChip: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  amenityChipText: {
    color: '#14213D',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#14213D',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#667085',
    marginTop: 10,
    textAlign: 'center',
  },
});
