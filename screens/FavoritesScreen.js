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
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { getPrimaryImageUrl } from '../utils/apartmentImages';
import { getCurrentUser, loadFavoriteApartmentIds } from '../services/sprintOne';

export default function FavoritesScreen({ navigation }) {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const { user, error: userError } = await getCurrentUser();

      if (userError || !user) {
        Alert.alert('Gabim', 'Duhet te jesh i kycur per favorites.');
        navigation.goBack();
        return;
      }

      const { favoriteApartmentIds, error, unavailable } = await loadFavoriteApartmentIds(user.id);

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      if (unavailable || !favoriteApartmentIds.length) {
        setApartments([]);
        return;
      }

      const selectOptions = [
        'id, owner_id, owner_name, owner_phone, title, city, description, image_url, price, rooms',
        'id, owner_id, title, city, description, image_url, price, rooms',
      ];

      for (const selectFields of selectOptions) {
        const result = await supabase
          .from('apartments')
          .select(selectFields)
          .in('id', favoriteApartmentIds);

        if (result.error?.code === '42703') {
          continue;
        }

        if (result.error) {
          Alert.alert('Gabim', result.error.message);
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
          <Text style={styles.priceText}>${item.price} / month</Text>
        </View>
        <Text style={styles.cardCity}>{item.city || 'Pa qytet'}</Text>
        <Text style={styles.cardMeta}>{item.rooms || 0} rooms</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
          <Text style={styles.emptyText}>Ruaj banesat qe te pelqejne nga faqja e detajeve.</Text>
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
    marginBottom: 8,
  },
  cardMeta: {
    color: '#14213D',
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
