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

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      Alert.alert('Gabim', 'Ploteso email dhe password.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      const userId = data?.user?.id;

      if (!userId) {
        Alert.alert('Error', 'User nuk u gjet.');
        return;
      }

      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        Alert.alert('Error', userError.message);
        return;
      }

      // If the profile row is missing, create a basic one so login can continue.
      if (!userData) {
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

        userData = { role: 'client', email: normalizedEmail };
      }

      navigation.reset({
        index: 0,
        routes: [{ name: userData.role === 'owner' ? 'OwnerHome' : 'Home' }],
      });
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
          Hyr ne platforme dhe vazhdo me nje eksperience me moderne dhe me te paster.
        </Text>
      </View>

      <View style={styles.card}>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#8F97A8"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#8F97A8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('SignUp')} disabled={loading}>
          <Text style={styles.linkText}>Create account</Text>
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
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
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
    borderWidth: 1,
    borderColor: '#DEE4EF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
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
    fontSize: 16,
  },
  linkText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#14213D',
    fontWeight: '700',
  },
});
