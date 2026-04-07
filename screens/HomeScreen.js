import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../services/supabase';

export default function HomeScreen({ navigation }) {

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to RentFlow!</Text>
      <Text style={styles.subtitle}>Search, browse, and reserve your perfect apartment.</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => Alert.alert('Go to apartments')}
      >
        <Text style={styles.buttonText}>Browse Apartments</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a73e8', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 30, textAlign: 'center' },
  button: { backgroundColor: '#1a73e8', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 10, elevation: 3, marginBottom: 15 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutButton: { marginTop: 20, padding: 10 },
  logoutText: { color: '#ff3b30', fontSize: 16, fontWeight: 'bold' },
});