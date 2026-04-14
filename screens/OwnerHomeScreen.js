import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { logoutUser } from '../services/auth';

export default function OwnerHomeScreen({ navigation }) {
  const [stats, setStats] = useState({ apartments: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        return;
      }

      const { count, error } = await supabase
        .from('apartments')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      setStats({ apartments: count || 0 });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const logout = () => {
    Alert.alert('Logout', 'A je i sigurt qe do te dalesh nga dashboard?', [
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
            onPress={logout}
            disabled={loggingOut}
          >
            <Text style={styles.logoutChipText}>{loggingOut ? '...' : 'Logout'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Menaxho listing-et me nje panel me te paster dhe veprime me te qarta.
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          {statsLoading ? (
            <ActivityIndicator color="#14213D" />
          ) : (
            <>
              <Text style={styles.statValue}>{stats.apartments}</Text>
              <Text style={styles.statLabel}>Active listings</Text>
            </>
          )}
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>24/7</Text>
          <Text style={styles.statLabel}>Owner access</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <Text style={styles.cardText}>
          Shto apartmente te reja, zgjero inventarin dhe pergatit aplikacionin per menaxhim me serioz.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('AddApartment')}>
          <Text style={styles.primaryButtonText}>Add Apartment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => Alert.alert('Soon', 'Statistikat dhe rezervimet mund t\'i shtojme ne hapin tjeter.')}
        >
          <Text style={styles.secondaryButtonText}>Open Insights</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#EEF1F7',
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    minHeight: 96,
    justifyContent: 'center',
    shadowColor: '#12213F',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statValue: {
    color: '#14213D',
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: '#667085',
    marginTop: 6,
    fontWeight: '600',
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
  cardTitle: {
    color: '#14213D',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardText: {
    color: '#667085',
    lineHeight: 20,
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: '#FF5A5F',
    borderRadius: 14,
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    padding: 16,
  },
  secondaryButtonText: {
    color: '#14213D',
    fontWeight: '800',
  },
});
