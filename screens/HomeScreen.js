import React, { useCallback, useState } from 'react';
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

export default function HomeScreen({ navigation }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadApartments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('apartments')
        .select('id, owner_id, title, city, description, image_url, price, rooms')
        .order('city', { ascending: true })
        .order('title', { ascending: true });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      const grouped = (data || []).reduce((acc, item) => {
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

        <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('BookingHistory')}>
          <Text style={styles.historyButtonText}>My bookings</Text>
        </TouchableOpacity>
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
                  <Text style={styles.priceBadgeText}>${item.price}</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>{item.description || 'Pa pershkrim.'}</Text>
              <Text style={styles.cardMeta}>{item.rooms} rooms | Per month</Text>
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
  historyButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D2D8E3',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 18,
    alignItems: 'center',
  },
  historyButtonText: {
    color: '#14213D',
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
