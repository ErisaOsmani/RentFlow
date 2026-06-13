import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { getCurrentUser } from '../services/sprintOne';
import { loadUserProfile, updateUserProfile } from '../services/sprintTwo';
import { getProfileVerificationLabel } from '../utils/marketplace';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { user, error: authError } = await getCurrentUser();

      if (authError || !user) {
        Alert.alert('Error', 'You must be logged in to view your profile.');
        navigation.goBack();
        return;
      }

      const { profile: loadedProfile, error } = await loadUserProfile(user.id);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setProfile(loadedProfile || { id: user.id, email: user.email, role: 'client' });
      setFirstName(loadedProfile?.first_name || '');
      setLastName(loadedProfile?.last_name || '');
      setPhone(loadedProfile?.phone || '');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!profile?.id) {
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      Alert.alert('Error', 'Fill in your first name, last name, and phone number.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await updateUserProfile({
        userId: profile.id,
        firstName,
        lastName,
        phone,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'Your profile was sent for verification.');
      loadProfile();
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#14213D" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()}>
            <Text style={styles.backChipText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.eyebrow}>TRUST PROFILE</Text>
          <Text style={styles.title}>My profile</Text>
          <Text style={styles.subtitle}>Keep your information accurate so owners and clients can trust each other more.</Text>
        </View>

        <View style={styles.statusPanel}>
        <Text style={styles.statusLabel}>Verification</Text>
        <Text style={[styles.statusValue, profile?.verified && styles.statusValueVerified]}>
          {getProfileVerificationLabel(profile)}
        </Text>
        <Text style={styles.statusText}>
          {profile?.verified
            ? 'Your profile is verified.'
            : 'Save complete details; an admin can approve your profile.'}
        </Text>
        </View>

        <View style={styles.form}>
        <TextInput
          placeholder="First name"
          placeholderTextColor="#8F97A8"
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
        />
        <TextInput
          placeholder="Last name"
          placeholderTextColor="#8F97A8"
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
        />
        <TextInput
          placeholder="Phone"
          placeholderTextColor="#8F97A8"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          keyboardType="phone-pad"
        />
        <Text style={styles.readonlyText}>{profile?.email || 'No email'}</Text>
        <Text style={styles.readonlyText}>Role: {profile?.role || 'client'}</Text>

        <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Save profile</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF1F7',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF1F7',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    backgroundColor: '#EEF1F7',
  },
  hero: {
    backgroundColor: '#14213D',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  backChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  backChipText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  eyebrow: {
    color: '#FCA5A5',
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#D3DAE6',
    lineHeight: 20,
    marginTop: 8,
  },
  statusPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  statusLabel: {
    color: '#94A3B8',
    fontWeight: '800',
    marginBottom: 6,
  },
  statusValue: {
    color: '#D92D20',
    fontSize: 22,
    fontWeight: '800',
  },
  statusValueVerified: {
    color: '#15803D',
  },
  statusText: {
    color: '#667085',
    marginTop: 8,
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  input: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    color: '#14213D',
  },
  readonlyText: {
    color: '#475569',
    fontWeight: '700',
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#FF5A5F',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: '#FFE9EA',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#D92D20',
    fontWeight: '800',
  },
});
