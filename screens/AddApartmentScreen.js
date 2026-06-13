import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../services/supabase';
import { parseImageUrls } from '../utils/apartmentImages';
import { AMENITIES, CURRENCIES, formatPrice, normalizeCurrency } from '../utils/marketplace';
import { generateApartmentDescription, getListingQualityReport } from '../services/recommendations';

// Numri maksimal i fotove qe lejohen per nje apartament.
const MAX_IMAGES = 10;

// AddApartmentScreen perdoret nga pronari/admini per te shtuar ose perditesuar nje apartament.
export default function AddApartmentScreen({ navigation, route }) {
  // Kur vjen apartment ne route params, forma punon ne mode editimi.
  const editingApartment = route?.params?.apartment;
  const storageBucket = process.env.EXPO_PUBLIC_SUPABASE_BUCKET || 'apartment-images';

  // State-et ruajne fushat e formes, fotot, amenities dhe gjendjet e UI-se.
  const [title, setTitle] = useState(editingApartment?.title || '');
  const [city, setCity] = useState(editingApartment?.city || '');
  const [neighborhood, setNeighborhood] = useState(editingApartment?.neighborhood || '');
  const [address, setAddress] = useState(editingApartment?.address || '');
  const [latitude, setLatitude] = useState(
    editingApartment?.latitude !== undefined && editingApartment?.latitude !== null
      ? String(editingApartment.latitude)
      : ''
  );
  const [longitude, setLongitude] = useState(
    editingApartment?.longitude !== undefined && editingApartment?.longitude !== null
      ? String(editingApartment.longitude)
      : ''
  );
  const [description, setDescription] = useState(editingApartment?.description || '');
  const [imageUrls, setImageUrls] = useState(parseImageUrls(editingApartment?.image_url));
  const [pickedImages, setPickedImages] = useState([]);
  const [price, setPrice] = useState(
    editingApartment?.price !== undefined && editingApartment?.price !== null
      ? String(editingApartment.price)
      : ''
  );
  const [currency, setCurrency] = useState(normalizeCurrency(editingApartment?.currency));
  const [currencySearch, setCurrencySearch] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [rooms, setRooms] = useState(
    editingApartment?.rooms !== undefined && editingApartment?.rooms !== null
      ? String(editingApartment.rooms)
      : ''
  );
  const [ownerName, setOwnerName] = useState(
    editingApartment?.owner_name ||
      [editingApartment?.owner?.first_name, editingApartment?.owner?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim()
  );
  const [ownerPhone, setOwnerPhone] = useState(
    editingApartment?.owner_phone || editingApartment?.owner?.phone || ''
  );
  const [amenities, setAmenities] = useState(
    AMENITIES.reduce((acc, amenity) => {
      acc[amenity.key] = Boolean(editingApartment?.[amenity.key]);
      return acc;
    }, {})
  );
  const [loading, setLoading] = useState(false);

  // Draft-i perdoret per te llogaritur quality report para se apartamenti te ruhet.
  const draftApartment = useMemo(() => {
    const draft = {
      title,
      city,
      neighborhood,
      address,
      description,
      image_url: imageUrls,
      price,
      currency,
      rooms,
    };

    AMENITIES.forEach((amenity) => {
      draft[amenity.key] = Boolean(amenities[amenity.key]);
    });

    return draft;
  }, [address, amenities, city, currency, description, imageUrls, neighborhood, price, rooms, title]);

  // Quality report ndihmon pronarin te kuptoje cfare mungon ne listing.
  const qualityReport = useMemo(() => getListingQualityReport(draftApartment), [draftApartment]);
  const selectedCurrency = useMemo(
    () => CURRENCIES.find((item) => item.code === normalizeCurrency(currency)) || CURRENCIES.find((item) => item.code === 'USD'),
    [currency]
  );
  // Filtron listen e monedhave kur user-i kerkon ne currency picker.
  const filteredCurrencies = useMemo(() => {
    const query = currencySearch.trim().toLowerCase();

    if (!query) {
      return CURRENCIES;
    }

    return CURRENCIES.filter((item) =>
      [item.code, item.label, item.symbol, item.countries].some((value) => String(value).toLowerCase().includes(query))
    );
  }, [currencySearch]);

  // Kur editohet apartamenti, merr kontaktin e pronarit nga profili.
  const loadOwnerContact = useCallback(async () => {
    if (!editingApartment?.owner_id) {
      return;
    }

    const ownerSelectOptions = [
      'id, first_name, last_name, phone',
      'id, first_name, last_name',
      'id, phone',
      'id',
    ];

    for (const selectFields of ownerSelectOptions) {
      const { data, error } = await supabase
        .from('users')
        .select(selectFields)
        .eq('id', editingApartment.owner_id)
        .maybeSingle();

      if (error?.code === '42703') {
        continue;
      }

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      const fullName = [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim();
      setOwnerName((current) => current || fullName);
      setOwnerPhone((current) => current || data?.phone || '');
      break;
    }
  }, [editingApartment?.owner_id]);

  useEffect(() => {
    loadOwnerContact();
  }, [loadOwnerContact]);

  // Perditeson emrin/telefonin e pronarit ne tabelen users nese forma i ka plotesuar.
  const updateOwnerContact = async (ownerId) => {
    const normalizedOwnerName = ownerName.trim();
    const normalizedOwnerPhone = ownerPhone.trim();

    if (!normalizedOwnerName && !normalizedOwnerPhone) {
      return null;
    }

    const [firstName, ...lastNameParts] = normalizedOwnerName.split(/\s+/).filter(Boolean);
    const namePayload = normalizedOwnerName
      ? {
          first_name: firstName || null,
          last_name: lastNameParts.join(' ') || null,
        }
      : {};
    const phonePayload = normalizedOwnerPhone ? { phone: normalizedOwnerPhone } : {};
    // Payload-e alternative per skema te ndryshme te tabeles users.
    const ownerPayloadOptions = [
      {
        ...namePayload,
        ...phonePayload,
      },
      namePayload,
      phonePayload,
    ];
    let updateMatchedNoRows = false;

    for (const payload of ownerPayloadOptions) {
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
      );

      if (!Object.keys(cleanPayload).length) {
        continue;
      }

      const { data, error } = await supabase
        .from('users')
        .update(cleanPayload)
        .eq('id', ownerId)
        .select('id')
        .maybeSingle();

      if (!error && data?.id) {
        return null;
      }

      if (!error && !data?.id) {
        updateMatchedNoRows = true;
        continue;
      }

      if (error.code === '42703') {
        continue;
      }

      return error;
    }

    return updateMatchedNoRows
      ? { message: 'The owner contact was not saved. Supabase did not allow updating the owner profile.' }
      : null;
  };

  // Krijon objektin qe dergohet ne Supabase per insert/update te apartamentit.
  const buildApartmentPayload = (
    ownerId,
    uploadedImageUrls,
    parsedPriceValue,
    parsedRoomsValue,
    includeOwnerContact = true,
    includeMarketplaceFields = true,
    includeCurrency = true
  ) => {
    const normalizedOwnerName = ownerName.trim();
    const normalizedOwnerPhone = ownerPhone.trim();
    const payload = {
      owner_id: ownerId,
      title: title.trim(),
      city: city.trim(),
      description: description.trim(),
      image_url: uploadedImageUrls.length ? JSON.stringify(uploadedImageUrls) : null,
      price: parsedPriceValue,
      rooms: parsedRoomsValue,
    };

    if (includeCurrency) {
      payload.currency = normalizeCurrency(currency);
    }

    if (includeOwnerContact) {
      payload.owner_name = normalizedOwnerName || null;
      payload.owner_phone = normalizedOwnerPhone || null;
    }

    if (includeMarketplaceFields) {
      payload.neighborhood = neighborhood.trim() || null;
      payload.address = address.trim() || null;
      payload.latitude = latitude.trim() ? Number(latitude) : null;
      payload.longitude = longitude.trim() ? Number(longitude) : null;
      AMENITIES.forEach((amenity) => {
        payload[amenity.key] = Boolean(amenities[amenity.key]);
      });
    }

    return payload;
  };

  // Ndryshon true/false per nje amenity.
  const toggleAmenity = (amenityKey) => {
    setAmenities((current) => ({
      ...current,
      [amenityKey]: !current[amenityKey],
    }));
  };

  // Gjeneron nje pershkrim automatik nga te dhenat qe jane futur ne forme.
  const handleGenerateDescription = () => {
    const generatedDescription = generateApartmentDescription(draftApartment);
    setDescription(generatedDescription);
  };

  // Zgjedh monedhen dhe mbyll modalin e currency picker.
  const selectCurrency = (item) => {
    setCurrency(item.code);
    setCurrencySearch('');
    setShowCurrencyPicker(false);
  };

  // Hap galerine e telefonit dhe ruan fotot e zgjedhura ne state.
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Allow gallery access to choose a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const selectedAssets = result.assets.slice(0, MAX_IMAGES);

    if (result.assets.length > MAX_IMAGES) {
      Alert.alert('Limit reached', `You can choose up to ${MAX_IMAGES} photos.`);
    }

    setPickedImages(selectedAssets);
    setImageUrls(selectedAssets.map((asset) => asset.uri));
  };

  // Heq nje foto nga preview dhe nga lista qe do ngarkohet.
  const removeImage = (indexToRemove) => {
    setImageUrls((current) => current.filter((_, index) => index !== indexToRemove));
    setPickedImages((current) => current.filter((_, index) => index !== indexToRemove));
  };

  // Ngarkon fotot ne Supabase Storage dhe kthen URL-te publike.
  const uploadPickedImages = async (userId) => {
    if (!pickedImages.length) {
      return imageUrls.filter(Boolean);
    }

    const uploadedUrls = await Promise.all(
      pickedImages.map(async (pickedImage) => {
        const fileExtension =
          pickedImage.fileName?.split('.').pop()?.toLowerCase() ||
          pickedImage.mimeType?.split('/').pop()?.toLowerCase() ||
          'jpg';

        const filePath = `${userId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExtension}`;

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
      })
    );

    return uploadedUrls;
  };

  // Validon formen, ngarkon fotot dhe ben insert/update ne tabelen apartments.
  const handleSaveApartment = async () => {
    if (!title || !city || !description || !price || !rooms) {
      Alert.alert('Error', 'Fill in all fields.');
      return;
    }

    const parsedPrice = Number(price);
    const parsedRooms = Number(rooms);

    if (Number.isNaN(parsedPrice) || Number.isNaN(parsedRooms)) {
      Alert.alert('Error', 'Price and rooms must be numbers.');
      return;
    }

    if (
      (latitude.trim() && Number.isNaN(Number(latitude))) ||
      (longitude.trim() && Number.isNaN(Number(longitude)))
    ) {
      Alert.alert('Error', 'Latitude and longitude must be numbers.');
      return;
    }

    if (imageUrls.length > MAX_IMAGES) {
      Alert.alert('Error', `You can add up to ${MAX_IMAGES} photos.`);
      return;
    }

    try {
      setLoading(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        Alert.alert('Error', 'User not found.');
        return;
      }

      // Admini lejohet te editoje apartamente te pronareve te tjere.
      let isAdmin = false;

      if (editingApartment) {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) {
          Alert.alert('Error', profileError.message);
          return;
        }

        isAdmin = profileData?.role === 'admin';
      }

      const uploadedImageUrls = await uploadPickedImages(authData.user.id);
      const ownerId = editingApartment?.owner_id || authData.user.id;

      let saveResult;
      let savedOwnerContactOnApartment = true;

      if (editingApartment) {
        let updateQuery = supabase
          .from('apartments')
          .update(buildApartmentPayload(ownerId, uploadedImageUrls, parsedPrice, parsedRooms))
          .eq('id', editingApartment.id);

        if (!isAdmin) {
          updateQuery = updateQuery.eq('owner_id', authData.user.id);
        }

        saveResult = await updateQuery;
      } else {
        saveResult = await supabase
          .from('apartments')
          .insert([buildApartmentPayload(ownerId, uploadedImageUrls, parsedPrice, parsedRooms)]);
      }

      // Nese mungon kolona currency, ruhet apartamenti pa ate fushe.
      if (saveResult.error?.code === '42703') {
        if (editingApartment) {
          let updateQuery = supabase
            .from('apartments')
            .update(buildApartmentPayload(ownerId, uploadedImageUrls, parsedPrice, parsedRooms, true, true, false))
            .eq('id', editingApartment.id);

          if (!isAdmin) {
            updateQuery = updateQuery.eq('owner_id', authData.user.id);
          }

          saveResult = await updateQuery;
        } else {
          saveResult = await supabase
            .from('apartments')
            .insert([buildApartmentPayload(ownerId, uploadedImageUrls, parsedPrice, parsedRooms, true, true, false)]);
        }
      }

      // Nese mungojne fushat marketplace/contact, provohet nje payload minimal.
      if (saveResult.error?.code === '42703') {
        savedOwnerContactOnApartment = false;

        if (editingApartment) {
          let updateQuery = supabase
            .from('apartments')
            .update(buildApartmentPayload(ownerId, uploadedImageUrls, parsedPrice, parsedRooms, false, false, false))
            .eq('id', editingApartment.id);

          if (!isAdmin) {
            updateQuery = updateQuery.eq('owner_id', authData.user.id);
          }

          saveResult = await updateQuery;
        } else {
          saveResult = await supabase
            .from('apartments')
            .insert([buildApartmentPayload(ownerId, uploadedImageUrls, parsedPrice, parsedRooms, false, false, false)]);
        }
      }

      const { error } = saveResult;

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      const ownerContactError = await updateOwnerContact(ownerId);

      if (ownerContactError && !savedOwnerContactOnApartment) {
        Alert.alert('Error', ownerContactError.message);
        return;
      }

      Alert.alert(
        'Success',
        editingApartment ? 'Apartment updated successfully.' : 'Apartment added successfully.'
      );
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // UI kryesor i formes: tekstet, fotot, amenities, currency picker dhe butoni save.
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()}>
            <Text style={styles.backChipText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.eyebrow}>NEW LISTING</Text>
          <Text style={styles.title}>{editingApartment ? 'Edit Apartment' : 'Add Apartment'}</Text>
          <Text style={styles.subtitle}>
            Add or update an apartment with photos, a description, and monthly rent.
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
          placeholder="Neighborhood"
          placeholderTextColor="#8F97A8"
          value={neighborhood}
          onChangeText={setNeighborhood}
          style={styles.input}
        />
        <TextInput
          placeholder="Address"
          placeholderTextColor="#8F97A8"
          value={address}
          onChangeText={setAddress}
          style={styles.input}
        />
        <View style={styles.coordinateRow}>
          <TextInput
            placeholder="Latitude"
            placeholderTextColor="#8F97A8"
            value={latitude}
            onChangeText={setLatitude}
            style={[styles.input, styles.coordinateInput]}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="Longitude"
            placeholderTextColor="#8F97A8"
            value={longitude}
            onChangeText={setLongitude}
            style={[styles.input, styles.coordinateInput]}
            keyboardType="numeric"
          />
        </View>
        <TextInput
          placeholder="Description"
          placeholderTextColor="#8F97A8"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={5}
        />
        <TouchableOpacity style={styles.aiButton} onPress={handleGenerateDescription}>
          <Text style={styles.aiButtonText}>Generate description</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          <Text style={styles.imagePickerButtonText}>
            {imageUrls.length ? 'Change Photos' : 'Choose Photos'}
          </Text>
        </TouchableOpacity>
        {imageUrls.length ? (
          <>
            <Text style={styles.imageCountText}>
              {imageUrls.length} / {MAX_IMAGES} photos selected
            </Text>
            <View style={styles.previewGrid}>
              {imageUrls.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.previewCard}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeImageButtonText}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
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
          placeholder="Currency, e.g. EUR, USD, GBP, HUF"
          placeholderTextColor="#8F97A8"
          value={selectedCurrency?.label || currency}
          onPressIn={() => setShowCurrencyPicker(true)}
          style={styles.input}
          editable={false}
          autoCapitalize="characters"
        />
        {price ? (
          <Text style={styles.pricePreview}>Preview: {formatPrice(price, currency)} / month</Text>
        ) : null}
        <TextInput
          placeholder="Rooms"
          placeholderTextColor="#8F97A8"
          value={rooms}
          onChangeText={setRooms}
          style={styles.input}
          keyboardType="numeric"
        />
        <Text style={styles.fieldLabel}>Amenities</Text>
        <View style={styles.amenitiesGrid}>
          {AMENITIES.map((amenity) => {
            const selected = amenities[amenity.key];

            return (
              <TouchableOpacity
                key={amenity.key}
                style={[styles.amenityButton, selected && styles.amenityButtonActive]}
                onPress={() => toggleAmenity(amenity.key)}
              >
                <Text style={[styles.amenityButtonText, selected && styles.amenityButtonTextActive]}>
                  {amenity.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          placeholder="Owner name"
          placeholderTextColor="#8F97A8"
          value={ownerName}
          onChangeText={setOwnerName}
          style={styles.input}
        />
        <TextInput
          placeholder="Owner phone"
          placeholderTextColor="#8F97A8"
          value={ownerPhone}
          onChangeText={setOwnerPhone}
          style={styles.input}
          keyboardType="phone-pad"
        />

        <View style={styles.aiPanel}>
          <View style={styles.aiPanelHeader}>
            <Text style={styles.aiPanelTitle}>Listing AI check</Text>
            <Text style={[
              styles.aiScore,
              qualityReport.risk === 'high' && styles.aiScoreDanger,
              qualityReport.risk === 'medium' && styles.aiScoreWarning,
            ]}>
              {qualityReport.score}/100
            </Text>
          </View>
          <Text style={styles.aiPanelLabel}>{qualityReport.label}</Text>
          {qualityReport.suggestions.slice(0, 4).map((suggestion) => (
            <Text key={suggestion} style={styles.aiSuggestion}>- {suggestion}</Text>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSaveApartment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {editingApartment ? 'Update Apartment' : 'Save Apartment'}
            </Text>
          )}
        </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal
        visible={showCurrencyPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <View style={styles.currencyModalOverlay}>
          <TouchableOpacity
            style={styles.currencyModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCurrencyPicker(false)}
          />
          <View style={styles.currencySheet}>
            <View style={styles.currencySheetHandle} />
            <View style={styles.currencySheetHeader}>
              <View style={styles.currencySheetTitleWrap}>
                <Text style={styles.currencySheetTitle}>Choose currency</Text>
                <Text style={styles.currencySheetSubtitle}>Search by code, currency, country, or symbol</Text>
              </View>
              <TouchableOpacity style={styles.currencyCloseButton} onPress={() => setShowCurrencyPicker(false)}>
                <Text style={styles.currencyCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Search currency..."
              placeholderTextColor="#8F97A8"
              value={currencySearch}
              onChangeText={setCurrencySearch}
              style={styles.currencySearchInput}
              autoCapitalize="none"
            />
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = normalizeCurrency(currency) === item.code;

                return (
                  <TouchableOpacity
                    style={[styles.currencyOption, selected && styles.currencyOptionActive]}
                    onPress={() => selectCurrency(item)}
                  >
                    <View style={styles.currencyOptionTextWrap}>
                      <Text style={[styles.currencyOptionLabel, selected && styles.currencyOptionLabelActive]}>
                        {item.label}
                      </Text>
                      {item.countries ? (
                        <Text style={[styles.currencyOptionCountry, selected && styles.currencyOptionCountryActive]}>
                          {item.countries} - {item.code}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.currencyOptionSymbol, selected && styles.currencyOptionSymbolActive]}>
                      {item.symbol}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Stilet per formen e apartamentit, preview fotot, picker-at dhe quality report.
const styles = StyleSheet.create({
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
  pricePreview: {
    color: '#667085',
    fontWeight: '700',
    marginBottom: 12,
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  coordinateInput: {
    flex: 1,
  },
  fieldLabel: {
    color: '#14213D',
    fontWeight: '800',
    marginBottom: 10,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  amenityButton: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  amenityButtonActive: {
    backgroundColor: '#14213D',
    borderColor: '#14213D',
  },
  amenityButtonText: {
    color: '#14213D',
    fontWeight: '800',
  },
  amenityButtonTextActive: {
    color: '#FFFFFF',
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
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
  aiButton: {
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#15803D',
    fontWeight: '800',
  },
  imageCountText: {
    color: '#667085',
    fontWeight: '600',
    marginBottom: 12,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  previewCard: {
    width: '47%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(20,33,61,0.82)',
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
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
  aiPanel: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  aiPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiPanelTitle: {
    color: '#14213D',
    fontSize: 16,
    fontWeight: '800',
  },
  aiScore: {
    color: '#15803D',
    fontWeight: '800',
  },
  aiScoreWarning: {
    color: '#B45309',
  },
  aiScoreDanger: {
    color: '#D92D20',
  },
  aiPanelLabel: {
    color: '#475569',
    fontWeight: '800',
    marginBottom: 8,
  },
  aiSuggestion: {
    color: '#667085',
    lineHeight: 20,
    fontWeight: '600',
  },
  currencyModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  currencyModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 33, 61, 0.42)',
  },
  currencySheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 18,
    maxHeight: '86%',
  },
  currencySheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D0D5DD',
    alignSelf: 'center',
    marginBottom: 14,
  },
  currencySheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  currencySheetTitleWrap: {
    flex: 1,
  },
  currencySheetTitle: {
    color: '#14213D',
    fontSize: 22,
    fontWeight: '800',
  },
  currencySheetSubtitle: {
    color: '#667085',
    fontWeight: '700',
    marginTop: 3,
  },
  currencyCloseButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  currencyCloseText: {
    color: '#14213D',
    fontWeight: '800',
  },
  currencySearchInput: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    color: '#14213D',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  currencyOptionActive: {
    backgroundColor: '#14213D',
    borderColor: '#14213D',
  },
  currencyOptionTextWrap: {
    flex: 1,
  },
  currencyOptionCode: {
    color: '#14213D',
    fontSize: 16,
    fontWeight: '800',
  },
  currencyOptionCodeActive: {
    color: '#FFFFFF',
  },
  currencyOptionLabel: {
    color: '#14213D',
    fontSize: 16,
    fontWeight: '800',
  },
  currencyOptionLabelActive: {
    color: '#FFFFFF',
  },
  currencyOptionCountry: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  currencyOptionCountryActive: {
    color: '#E2E8F0',
  },
  currencyOptionSymbol: {
    color: '#FF5A5F',
    fontWeight: '800',
  },
  currencyOptionSymbolActive: {
    color: '#FFFFFF',
  },
});
