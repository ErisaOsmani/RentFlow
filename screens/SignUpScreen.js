import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { registerForPushNotifications } from '../services/pushNotifications';

const SIGNUP_ROLES = ['client', 'owner'];

// Ky screen krijon llogari te reja dhe ruan rolin/profilin ne Supabase.
export default function SignUpScreen({ navigation }) {
  // State-et ruajne fushat e formes se regjistrimit.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('client');
  const [loading, setLoading] = useState(false);

  // Validim lokal per email para se forma te dergohet ne backend.
  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  // Regjistron user-in ne Supabase Auth dhe provon disa payload-e per skema te ndryshme DB.
  const signup = async () => {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedPhone ||
      !normalizedEmail ||
      !normalizedPassword ||
      !confirmPassword.trim()
    ) {
      Alert.alert('Error', 'Fill in all fields.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Error', 'Enter a valid email address.');
      return;
    }

    if (normalizedPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    if (normalizedPassword !== confirmPassword.trim()) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const signupRole = SIGNUP_ROLES.includes(role) ? role : 'client';

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      const user = data?.user;

      if (!user) {
        Alert.alert('Error', 'The user was not created. Check the email confirmation.');
        return;
      }

      // Keta payload-e e bejne app-in tolerant nese disa kolona nuk jane shtuar ende ne Supabase.
      const userPayloadOptions = [
        {
          id: user.id,
          email: normalizedEmail,
          role: signupRole,
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
          phone: normalizedPhone,
          verified: false,
          verification_status: 'pending',
        },
        {
          id: user.id,
          email: normalizedEmail,
          role: signupRole,
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
        },
        {
          id: user.id,
          email: normalizedEmail,
          role: signupRole,
        },
      ];

      let insertError = null;

      for (const payload of userPayloadOptions) {
        const { error } = await supabase.from('users').upsert([payload]);

        if (!error) {
          insertError = null;
          break;
        }

        if (error.code === '42703') {
          insertError = error;
          continue;
        }

        insertError = error;
        break;
      }

      if (insertError) {
        Alert.alert('Error', insertError.message);
        return;
      }

      await registerForPushNotifications(user.id);

      Alert.alert('Success', 'Account created! Please login.');
      navigation.navigate('Login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>RENTFLOW</Text>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Choose your account type and join the platform with a cleaner flow.
            </Text>
          </View>

          <View style={styles.card}>
            <TextInput
              placeholder="First name"
              placeholderTextColor="#8F97A8"
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
            />

            <TextInput
              placeholder="Last name"
              placeholderTextColor="#8F97A8"
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
            />

            <TextInput
              placeholder="Phone number"
              placeholderTextColor="#8F97A8"
              style={styles.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <TextInput
              placeholder="Email"
              placeholderTextColor="#8F97A8"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor="#8F97A8"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />

            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#8F97A8"
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.roles}>
              <TouchableOpacity
                style={[styles.rolePill, role === 'client' && styles.rolePillActive]}
                onPress={() => setRole('client')}
              >
                <Text style={[styles.roleText, role === 'client' && styles.roleTextActive]}>Client</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rolePill, role === 'owner' && styles.rolePillActive]}
                onPress={() => setRole('owner')}
              >
                <Text style={[styles.roleText, role === 'owner' && styles.roleTextActive]}>Owner</Text>
              </TouchableOpacity>

            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={signup}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Sign Up</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
              <Text style={styles.link}>Already have an account? Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Stilet mbulojne formen, zgjedhjen e rolit dhe butonat e regjistrimit.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF1F7',
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hero: {
    backgroundColor: '#14213D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  eyebrow: {
    color: '#FCA5A5',
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#D3DAE6',
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#12213F',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  input: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    marginBottom: 9,
  },
  roles: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  rolePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DEE4EF',
    backgroundColor: '#F8FAFC',
  },
  rolePillActive: {
    backgroundColor: '#FFE9EA',
    borderColor: '#FF5A5F',
  },
  roleText: {
    color: '#667085',
    fontWeight: '700',
  },
  roleTextActive: {
    color: '#FF5A5F',
  },
  button: {
    marginTop: 10,
    backgroundColor: '#FF5A5F',
    borderRadius: 12,
    alignItems: 'center',
    padding: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  link: {
    marginTop: 12,
    textAlign: 'center',
    color: '#14213D',
    fontWeight: '700',
  },
});
