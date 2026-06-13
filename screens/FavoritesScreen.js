import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { getPrimaryImageUrl } from '../utils/apartmentImages';
import { getCurrentUser, loadFavoriteApartmentIds } from '../services/bookings';
import { APARTMENT_SELECT_FULL, formatPrice, getAmenityLabels } from '../utils/marketplace';

// FavoritesScreen shfaq apartamentet qe user-i i ka ruajtur si favorite.
export default function FavoritesScreen({ navigation }) {
  // State-et ruajne listen e favoriteve dhe gjendjen loading.
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Merr ID-te favorite dhe pastaj ngarkon te dhenat e apartamenteve.
  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const { user, error: userError } = await getCurrentUser();

      if (userError || !user) {
        Alert.alert('Error', 'You must be logged in to use favorites.');
        navigation.goBack();
        return;
      }

      const { favoriteApartmentIds, error, unavailable } = await loadFavoriteApartmentIds(user.id);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (unavailable || !favoriteApartmentIds.length) {
        setApartments([]);
        return;
      }

      // Select-e alternative per skema te ndryshme te tabeles apartments.
      const selectOptions = APARTMENT_SELECT_FULL;

      for (const selectFields of selectOptions) {
        const result = await supabase
          .from('apartments')
          .select(selectFields)
          .in('id', favoriteApartmentIds);

        if (result.error?.code === '42703') {
          continue;
        }

        if (result.error) {
          Alert.alert('Error', result.error.message);
          return;
        }

        setApartments(result.data || []);
        break;
      }
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  // Renderon nje karte apartamenti qe hap faqen e detajeve.
  const renderApartment = ({ item }) => {
    const imageUrl = getPrimaryImageUrl(item.image_url);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.86}
        onPress={() => navigation.navigate('ApartmentDetail', { apartment: item })}
      >
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.cardImage} /> : null}
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.priceText}>{formatPrice(item.price, item.currency)} / month</Text>
        </View>
        <View style={styles.cityBadge}>
          <Text style={styles.cardCity}>{item.city || 'No city'}</Text>
        </View>
        <Text style={styles.cardMeta}>{item.rooms || 0} rooms</Text>
        <View style={styles.amenitiesRow}>
          {getAmenityLabels(item).slice(0, 4).map((label) => (
            <Text key={label} style={styles.amenityText}>{label}</Text>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()}>
          <Text style={styles.backChipText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Saved apartments</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#14213D" style={styles.loader} />
      ) : apartments.length ? (
        <FlatList
          data={apartments}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={renderApartment}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>Save apartments you like from the details page.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// Stilet per listen e favoriteve, kartat dhe gjendjen bosh.
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
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: '#E5E7EB',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    color: '#14213D',
    fontSize: 18,
    fontWeight: '800',
    paddingRight: 10,
  },
  priceText: {
    color: '#FF5A5F',
    fontWeight: '800',
  },
  cardCity: {
    color: '#667085',
    fontWeight: '700',
  },
  cityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 8,
  },
  cardMeta: {
    color: '#14213D',
    fontWeight: '700',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  amenityText: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 999,
    color: '#14213D',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 5,
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
