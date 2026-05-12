import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { logoutUser } from '../services/auth';
import { getPrimaryImageUrl } from '../utils/apartmentImages';

export default function OwnerHomeScreen({ navigation }) {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadApartments = useCallback(async () => {
    try {
      setLoading(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        return;
      }

      const selectOptions = [
        'id, owner_id, owner_name, owner_phone, title, city, description, image_url, price, rooms',
        'id, owner_id, title, city, description, image_url, price, rooms',
      ];

      let data = [];
      let error = null;

      for (const selectFields of selectOptions) {
        const result = await supabase
          .from('apartments')
          .select(selectFields)
          .eq('owner_id', authData.user.id)
          .order('id', { ascending: false });

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

      setApartments(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = (apartmentId) => {
    Alert.alert('Delete', 'A je i sigurt qe do ta fshish kete banese?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('apartments').delete().eq('id', apartmentId);

          if (error) {
            Alert.alert('Error', error.message);
            return;
          }

          loadApartments();
        },
      },
    ]);
  };

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

            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
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
            <Text style={styles.eyebrow}>OWNER SPACE</Text>
            <Text style={styles.title}>Dashboard</Text>
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
          Shto banesa, pershkrime dhe menaxho listing-et e tua me nje pamje me premium.
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('AddApartment')}>
        <Text style={styles.primaryButtonText}>Add Apartment</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.ownerActionButton} onPress={() => navigation.navigate('OwnerBookingHistory')}>
        <Text style={styles.ownerActionButtonText}>View bookings</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>My Apartments</Text>

      <FlatList
        data={apartments}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadApartments}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? <ActivityIndicator color="#14213D" /> : <Text style={styles.emptyTitle}>No apartments yet</Text>}
            <Text style={styles.emptyText}>
              {loading ? 'Po ngarkohen listing-et...' : 'Shto banesen tende te pare nga butoni me siper.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const primaryImageUrl = getPrimaryImageUrl(item.image_url);

          return (
            <View style={styles.card}>
              {primaryImageUrl ? (
                <Image source={{ uri: primaryImageUrl }} style={styles.cardImage} />
              ) : null}
              <View style={styles.cardTop}>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardCity}>{item.city}</Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>${item.price} / month</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>{item.description || 'Pa pershkrim.'}</Text>
              <Text style={styles.cardMeta}>{item.rooms} rooms | Per month</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('AddApartment', { apartment: item })}
                >
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  primaryButton: {
    backgroundColor: '#FF5A5F',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  ownerActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DEE4EF',
    padding: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  ownerActionButtonText: {
    color: '#14213D',
    fontWeight: '800',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#14213D',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 28,
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
  cardTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#14213D',
  },
  cardCity: {
    color: '#667085',
    marginTop: 4,
    fontWeight: '700',
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
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#14213D',
    fontWeight: '800',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FFE9EA',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#D92D20',
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
