import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../services/supabase';

export default function AddApartmentScreen({ navigation, route }) {
  const editingApartment = route?.params?.apartment;
  const storageBucket = process.env.EXPO_PUBLIC_SUPABASE_BUCKET || 'apartment-images';

  const [title, setTitle] = useState(editingApartment?.title || '');
  const [city, setCity] = useState(editingApartment?.city || '');
  const [description, setDescription] = useState(editingApartment?.description || '');
  const [imageUrl, setImageUrl] = useState(editingApartment?.image_url || '');
  const [pickedImage, setPickedImage] = useState(null);
  const [price, setPrice] = useState(
    editingApartment?.price !== undefined && editingApartment?.price !== null
      ? String(editingApartment.price)
      : ''
  );
  const [rooms, setRooms] = useState(
    editingApartment?.rooms !== undefined && editingApartment?.rooms !== null
      ? String(editingApartment.rooms)
      : ''
  );
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Lejo qasjen ne galeri per te zgjedhur nje foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    setPickedImage(asset);
    setImageUrl(asset.uri);
  };

  const uploadPickedImage = async (userId) => {
    if (!pickedImage?.base64) {
      return imageUrl.trim() || null;
    }

    const fileExtension =
      pickedImage.fileName?.split('.').pop()?.toLowerCase() ||
      pickedImage.mimeType?.split('/').pop()?.toLowerCase() ||
      'jpg';

    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(filePath, decode(pickedImage.base64), {
        contentType: pickedImage.mimeType || `image/${fileExtension}`,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(storageBucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSaveApartment = async () => {
    if (!title || !city || !description || !price || !rooms) {
      Alert.alert('Error', 'Ploteso te gjitha fushat.');
      return;
    }

    const parsedPrice = Number(price);
    const parsedRooms = Number(rooms);

    if (Number.isNaN(parsedPrice) || Number.isNaN(parsedRooms)) {
      Alert.alert('Error', 'Price dhe rooms duhet te jene numra.');
      return;
    }

    try {
      setLoading(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        Alert.alert('Error', 'User nuk u gjet.');
        return;
      }

      const uploadedImageUrl = await uploadPickedImage(authData.user.id);

      const payload = {
        owner_id: authData.user.id,
        title: title.trim(),
        city: city.trim(),
        description: description.trim(),
        image_url: uploadedImageUrl,
        price: parsedPrice,
        rooms: parsedRooms,
      };

      const { error } = editingApartment
        ? await supabase
            .from('apartments')
            .update(payload)
            .eq('id', editingApartment.id)
            .eq('owner_id', authData.user.id)
        : await supabase.from('apartments').insert([payload]);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', editingApartment ? 'Banesa u perditesua me sukses.' : 'Banesa u shtua me sukses.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()}>
          <Text style={styles.backChipText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>NEW LISTING</Text>
        <Text style={styles.title}>{editingApartment ? 'Edit Apartment' : 'Add Apartment'}</Text>
        <Text style={styles.subtitle}>
          Shto ose perditeso banese me foto, pershkrim dhe qira mujore.
        </Text>
      </View>

      <View style={styles.card}>
        <TextInput
          placeholder="Apartment title"
          placeholderTextColor="#8F97A8"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        <TextInput
          placeholder="City"
          placeholderTextColor="#8F97A8"
          value={city}
          onChangeText={setCity}
          style={styles.input}
        />
        <TextInput
          placeholder="Description"
          placeholderTextColor="#8F97A8"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={5}
        />
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          <Text style={styles.imagePickerButtonText}>
            {pickedImage || imageUrl ? 'Change Photo' : 'Choose Photo'}
          </Text>
        </TouchableOpacity>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.previewImage}
          />
        ) : null}
        <TextInput
          placeholder="Monthly rent"
          placeholderTextColor="#8F97A8"
          value={price}
          onChangeText={setPrice}
          style={styles.input}
          keyboardType="numeric"
        />
        <TextInput
          placeholder="Rooms"
          placeholderTextColor="#8F97A8"
          value={rooms}
          onChangeText={setRooms}
          style={styles.input}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSaveApartment}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{editingApartment ? 'Update Apartment' : 'Save Apartment'}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#EEF1F7',
    justifyContent: 'center',
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
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#E5E7EB',
  },
  imagePickerButton: {
    backgroundColor: '#F5F7FB',
    borderWidth: 1,
    borderColor: '#DEE4EF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  imagePickerButtonText: {
    color: '#14213D',
    fontWeight: '700',
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
});
