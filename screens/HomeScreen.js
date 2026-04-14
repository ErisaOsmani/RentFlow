import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { logoutUser } from '../services/auth';

export default function HomeScreen({ navigation }) {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('apartments').select('*');

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      setApartments(data || []);
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.title}>Explore Apartments</Text>
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
          Hapesira moderne, qytete te ndryshme dhe nje eksperience me e rafinuar ne kerkimin tend.
        </Text>
        <Text style={styles.helperText}>Terhiq poshte per refresh te listing-eve.</Text>
      </View>

      <FlatList
        data={apartments}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? <ActivityIndicator color="#14213D" /> : <Text style={styles.emptyTitle}>Nuk ka listing-e ende</Text>}
            <Text style={styles.emptyText}>
              {loading ? 'Po ngarkohen apartamentet...' : 'Provo perseri me vone ose shto listing-e te reja si owner.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Booking', { apartment: item })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>{item.city}</Text>
              </View>
              <Text style={styles.price}>${item.price}</Text>
            </View>

            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.meta}>{item.rooms} rooms available</Text>

            <View style={styles.cardFooter}>
              <Text style={styles.footerHint}>Per night</Text>
              <Text style={styles.cta}>Reserve</Text>
            </View>
          </TouchableOpacity>
        )}
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
  helperText: {
    color: '#98A2B3',
    marginTop: 10,
    fontWeight: '600',
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
  listContent: {
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#12213F',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  locationBadge: {
    backgroundColor: '#F5F7FB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationBadgeText: {
    color: '#14213D',
    fontWeight: '700',
  },
  price: {
    color: '#FF5A5F',
    fontWeight: '800',
    fontSize: 18,
  },
  name: {
    color: '#14213D',
    fontSize: 20,
    fontWeight: '800',
  },
  meta: {
    color: '#667085',
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  footerHint: {
    color: '#98A2B3',
    fontWeight: '600',
  },
  cta: {
    color: '#14213D',
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
