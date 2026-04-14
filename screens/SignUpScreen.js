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

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('client');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password || !confirmPassword) {
      Alert.alert('Gabim', 'Ploteso te gjitha fushat.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Gabim', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      const user = data?.user;

      if (!user) {
        Alert.alert('Error', 'User nuk u krijua.');
        return;
      }

      const { error: insertError } = await supabase.from('users').upsert([
        {
          id: user.id,
          email: normalizedEmail,
          role,
        },
      ]);

      if (insertError) {
        Alert.alert('Error', insertError.message);
        return;
      }

      Alert.alert('Success', 'Account created! Please login.');
      navigation.navigate('Login');
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
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Zgjidh rolin tend dhe hyj ne platforme me nje flow me te paster.
        </Text>
      </View>

      <View style={styles.card}>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#8F97A8"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#8F97A8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#8F97A8"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
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
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
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
  roles: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 6,
  },
  rolePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
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
    marginTop: 14,
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
