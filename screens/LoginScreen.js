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

// Ky screen menaxhon hyrjen ne aplikacion dhe navigimin sipas rolit te perdoruesit.
export default function LoginScreen({ navigation }) {
  // State-et ruajne te dhenat qe shkruhen ne forme dhe gjendjen loading.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Kontroll i thjeshte qe email-i te kete format te vlefshem para login-it.
  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  // Kryen login me Supabase, krijon profil default nese mungon dhe hap dashboard-in perkates.
  const login = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      Alert.alert('Error', 'Enter your email and password.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Error', 'Enter a valid email address.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        Alert.alert('Login failed', error.message);
        return;
      }

      const userId = data?.user?.id;

      if (!userId) {
        Alert.alert('Error', 'User not found.');
        return;
      }

      let { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        Alert.alert('Error', profileError.message);
        return;
      }

      if (!profile) {
        const { error: insertError } = await supabase.from('users').upsert([
          {
            id: userId,
            email: normalizedEmail,
            role: 'client',
          },
        ]);

        if (insertError) {
          Alert.alert('Error', insertError.message);
          return;
        }

        profile = { role: 'client', email: normalizedEmail };
      }

      // Roli i profilit vendos ekranin ku dergohet perdoruesi pas hyrjes.
      const targetScreen =
        profile?.role === 'admin' ? 'AdminHome' : profile?.role === 'owner' ? 'OwnerHome' : 'Home';

      await registerForPushNotifications(userId);

      navigation.reset({
        index: 0,
        routes: [{ name: targetScreen }],
      });
    } catch (err) {
      Alert.alert('Error', 'Something went wrong during login.');
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
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to explore apartments in a cleaner, more modern experience.
            </Text>
          </View>

          <View style={styles.card}>
            <TextInput
              placeholder="Email"
              placeholderTextColor="#8F97A8"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
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
              onSubmitEditing={login}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={login}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Login</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('SignUp')} disabled={loading}>
              <Text style={styles.link}>Create account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Stilet percaktojne pamjen e formes, butonave dhe gjendjeve loading.
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
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  hero: {
    backgroundColor: '#14213D',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
  },
  eyebrow: {
    color: '#FCA5A5',
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#D3DAE6',
    marginTop: 8,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
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
    padding: 13,
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#FF5A5F',
    borderRadius: 14,
    alignItems: 'center',
    padding: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  link: {
    marginTop: 16,
    textAlign: 'center',
    color: '#14213D',
    fontWeight: '700',
  },
});
