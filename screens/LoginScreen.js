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
} from 'react-native';
import { supabase } from '../services/supabase';
import { registerForPushNotifications } from '../services/pushNotifications';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const login = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      Alert.alert('Gabim', 'Ploteso email dhe password.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Gabim', 'Shkruaj nje email valid.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        Alert.alert('Login deshtoi', error.message);
        return;
      }

      const userId = data?.user?.id;

      if (!userId) {
        Alert.alert('Gabim', 'Nuk u gjet perdoruesi.');
        return;
      }

      let { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        Alert.alert('Gabim', profileError.message);
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
          Alert.alert('Gabim', insertError.message);
          return;
        }

        profile = { role: 'client', email: normalizedEmail };
      }

      const targetScreen =
        profile?.role === 'admin' ? 'AdminHome' : profile?.role === 'owner' ? 'OwnerHome' : 'Home';

      await registerForPushNotifications(userId);

      navigation.reset({
        index: 0,
        routes: [{ name: targetScreen }],
      });
    } catch (err) {
      Alert.alert('Gabim', 'Ndodhi nje problem gjate login-it.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>RENTFLOW</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Hyr ne platforme dhe eksploro apartamente me nje pamje me moderne dhe me te qarte.
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#EEF1F7',
  },
  hero: {
    backgroundColor: '#14213D',
    borderRadius: 24,
    padding: 24,
    marginBottom: 18,
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
  input: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
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
