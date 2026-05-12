import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { supabase } from '../services/supabase';
import { getPrimaryImageUrl } from '../utils/apartmentImages';

export default function SearchScreen({ navigation }) {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRooms, setMinRooms] = useState('');
  const [cities, setCities] = useState([]);

  const loadCities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('city')
        .order('city', { ascending: true });

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      const uniqueCities = Array.from(new Set((data || []).map((item) => item.city).filter(Boolean)));
      setCities(uniqueCities);
    } catch (err) {
      Alert.alert('Gabim', 'Dështoi ngarkim qyteteve.');
    }
  }, []);

  const executeSearch = useCallback(async () => {
    try {
      setLoading(true);

      const buildQuery = (selectFields) => {
        let query = supabase.from('apartments').select(selectFields);

        if (selectedCity) {
          query = query.eq('city', selectedCity);
        }

        if (minPrice && !Number.isNaN(Number(minPrice))) {
          query = query.gte('price', Number(minPrice));
        }

        if (maxPrice && !Number.isNaN(Number(maxPrice))) {
          query = query.lte('price', Number(maxPrice));
        }

        if (minRooms && !Number.isNaN(Number(minRooms))) {
          query = query.gte('rooms', Number(minRooms));
        }

        return query.order('price', { ascending: true });
      };

      const selectOptions = [
        'id, owner_id, owner_name, owner_phone, title, city, description, image_url, price, rooms',
        'id, owner_id, title, city, description, image_url, price, rooms',
      ];

      let data = [];
      let error = null;

      for (const selectFields of selectOptions) {
        const result = await buildQuery(selectFields);

        if (result.error?.code === '42703') {
          continue;
        }

        data = result.data || [];
        error = result.error;
        break;
      }

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      let results = data || [];

      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase();
        results = results.filter(
          (item) =>
            item.title?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower)
        );
      }

      setApartments(results);
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedCity, minPrice, maxPrice, minRooms]);

  React.useEffect(() => {
    loadCities();
  }, [loadCities]);

  React.useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const renderApartment = ({ item }) => {
    const primaryImageUrl = getPrimaryImageUrl(item.image_url);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ApartmentDetail', { apartment: item })}
      >
        {primaryImageUrl ? <Image source={{ uri: primaryImageUrl }} style={styles.cardImage} /> : null}
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>${item.price} / month</Text>
          </View>
        </View>
        <Text style={styles.cardCity}>{item.city}</Text>
        <Text style={styles.cardDesc}>{item.description || 'Pa pershkrim.'}</Text>
        <Text style={styles.cardMeta}>{item.rooms} rooms | Per month</Text>
      </TouchableOpacity>
    );
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedCity('');
    setMinPrice('');
    setMaxPrice('');
    setMinRooms('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Search Apartments</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          placeholder="Search by title or description"
          placeholderTextColor="#8F97A8"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <TouchableOpacity
        style={styles.filterToggleButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Text style={styles.filterToggleText}>{showFilters ? 'Hide Filters' : 'Show Filters'}</Text>
      </TouchableOpacity>

      {showFilters && (
        <ScrollView style={styles.filterPanel} showsVerticalScrollIndicator={false}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>City</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll}>
              <TouchableOpacity
                style={[styles.filterChip, !selectedCity && styles.filterChipActive]}
                onPress={() => setSelectedCity('')}
              >
                <Text style={[styles.filterChipText, !selectedCity && styles.filterChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.filterChip, selectedCity === city && styles.filterChipActive]}
                  onPress={() => setSelectedCity(city)}
                >
                  <Text style={[styles.filterChipText, selectedCity === city && styles.filterChipTextActive]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Price Range (per month)</Text>
            <View style={styles.filterRow}>
              <TextInput
                placeholder="Min"
                placeholderTextColor="#8F97A8"
                style={[styles.filterInput, styles.filterInputHalf]}
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="numeric"
              />
              <TextInput
                placeholder="Max"
                placeholderTextColor="#8F97A8"
                style={[styles.filterInput, styles.filterInputHalf]}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Minimum Rooms</Text>
            <TextInput
              placeholder="Number of rooms"
              placeholderTextColor="#8F97A8"
              style={styles.filterInput}
              value={minRooms}
              onChangeText={setMinRooms}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear all filters</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

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
          <Text style={styles.emptyTitle}>No apartments found</Text>
          <Text style={styles.emptyText}>Try adjusting your search filters.</Text>
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
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D2D8E3',
    marginBottom: 16,
  },
  backButtonText: {
    color: '#14213D',
    fontWeight: '700',
  },
  title: {
    color: '#14213D',
    fontSize: 28,
    fontWeight: '800',
  },
  searchBox: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#14213D',
  },
  filterToggleButton: {
    backgroundColor: '#14213D',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  filterToggleText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  filterPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 340,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    color: '#14213D',
    fontWeight: '800',
    marginBottom: 10,
  },
  cityScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: '#F5F7FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DEE4EF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#14213D',
    borderColor: '#14213D',
  },
  filterChipText: {
    color: '#14213D',
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterInput: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#14213D',
  },
  filterInputHalf: {
    flex: 1,
  },
  clearButton: {
    backgroundColor: '#FFE9EA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  clearButtonText: {
    color: '#D92D20',
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
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#E5E7EB',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#14213D',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    paddingRight: 10,
  },
  priceBadge: {
    backgroundColor: '#FFE9EA',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priceBadgeText: {
    color: '#FF5A5F',
    fontWeight: '800',
    fontSize: 13,
  },
  cardCity: {
    color: '#667085',
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDesc: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardMeta: {
    color: '#14213D',
    fontWeight: '700',
    fontSize: 12,
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
