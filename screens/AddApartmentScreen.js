import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../services/supabase';

export default function AddApartmentScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [rooms, setRooms] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!title.trim() || !city.trim() || !price.trim() || !rooms.trim()) {
      Alert.alert('Gabim', 'Ploteso te gjitha fushat.');
      return;
    }

    if (Number.isNaN(parseFloat(price)) || Number.isNaN(parseInt(rooms, 10))) {
      Alert.alert('Gabim', 'Price dhe rooms duhet te jene vlera valide.');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Gabim', 'Duhet te jesh i kycur si owner.');
        return;
      }

      const { error } = await supabase.from('apartments').insert({
        title: title.trim(),
        city: city.trim(),
        price: parseFloat(price),
        rooms: parseInt(rooms, 10),
        owner_id: user.id,
      });

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      Alert.alert('Success', 'Apartment added successfully!');
      navigation.goBack();
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
        <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()}>
          <Text style={styles.backChipText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>NEW LISTING</Text>
        <Text style={styles.title}>Add Apartment</Text>
        <Text style={styles.subtitle}>
          Krijo nje listing te qarte dhe moderne per klientet qe kerkojne qira.
        </Text>
      </View>

      <View style={styles.card}>
        <TextInput
          placeholder="Title"
          placeholderTextColor="#8F97A8"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          placeholder="City"
          placeholderTextColor="#8F97A8"
          style={styles.input}
          value={city}
          onChangeText={setCity}
        />
        <TextInput
          placeholder="Price"
          placeholderTextColor="#8F97A8"
          keyboardType="numeric"
          style={styles.input}
          value={price}
          onChangeText={setPrice}
        />
        <TextInput
          placeholder="Rooms"
          placeholderTextColor="#8F97A8"
          keyboardType="numeric"
          style={styles.input}
          value={rooms}
          onChangeText={setRooms}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAdd}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Save Apartment</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    fontWeight: '700',
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
});
