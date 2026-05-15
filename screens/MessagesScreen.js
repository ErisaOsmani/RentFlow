import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { getCurrentUser, markNotificationsReadByType } from '../services/sprintOne';
import { loadInboxConversations } from '../services/sprintTwo';
import { APARTMENT_SELECT_FULL, USER_PROFILE_SELECT_FULL, getOwnerDisplayName } from '../utils/marketplace';

export default function MessagesScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const { user, error: authError } = await getCurrentUser();

      if (authError || !user) {
        Alert.alert('Gabim', 'Duhet te jesh i kycur per mesazhe.');
        navigation.goBack();
        return;
      }

      setCurrentUserId(user.id);
      await markNotificationsReadByType(user.id, 'chat_message');
      const { conversations: loadedConversations, error, unavailable } = await loadInboxConversations(user.id);

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      if (unavailable || !loadedConversations.length) {
        setConversations([]);
        return;
      }

      const apartmentIds = Array.from(new Set(loadedConversations.map((item) => item.apartment_id).filter(Boolean)));
      const userIds = Array.from(
        new Set(
          loadedConversations
            .flatMap((item) => [item.owner_id, item.client_id])
            .filter(Boolean)
        )
      );

      let apartments = [];
      for (const selectFields of APARTMENT_SELECT_FULL) {
        const result = await supabase.from('apartments').select(selectFields).in('id', apartmentIds);

        if (result.error?.code === '42703') {
          continue;
        }

        if (!result.error) {
          apartments = result.data || [];
        }
        break;
      }

      let users = [];
      for (const selectFields of USER_PROFILE_SELECT_FULL) {
        const result = await supabase.from('users').select(selectFields).in('id', userIds);

        if (result.error?.code === '42703') {
          continue;
        }

        if (!result.error) {
          users = result.data || [];
        }
        break;
      }

      const apartmentMap = apartments.reduce((acc, apartment) => {
        acc[apartment.id] = apartment;
        return acc;
      }, {});
      const userMap = users.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      setConversations(
        loadedConversations.map((conversation) => ({
          ...conversation,
          apartment: apartmentMap[conversation.apartment_id] || null,
          owner: userMap[conversation.owner_id] || null,
          client: userMap[conversation.client_id] || null,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  const renderConversation = ({ item }) => {
    const otherProfile = item.owner_id === currentUserId ? item.client : item.owner;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.86}
        onPress={() =>
          navigation.navigate('Chat', {
            apartment: item.apartment,
            conversation: item,
            clientId: item.client_id,
          })
        }
      >
        <Text style={styles.cardTitle}>{item.apartment?.title || 'Apartment chat'}</Text>
        <Text style={styles.cardCity}>{item.apartment?.city || 'Pa qytet'}</Text>
        <Text style={styles.cardMeta}>Me: {getOwnerDisplayName(otherProfile, 'User')}</Text>
        <Text style={styles.cardTime}>
          {item.updated_at ? new Date(item.updated_at).toLocaleString() : 'No date'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()}>
          <Text style={styles.backChipText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Bisedat aktive mes klientave dhe owner-ave.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#14213D" style={styles.loader} />
      ) : conversations.length ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={renderConversation}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>Bisedat shfaqen ketu pasi klienti hap chat nga detajet e baneses.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F7',
    padding: 20,
  },
  header: {
    marginBottom: 18,
  },
  backChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D2D8E3',
    marginBottom: 16,
  },
  backChipText: {
    color: '#14213D',
    fontWeight: '800',
  },
  title: {
    color: '#14213D',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#667085',
    marginTop: 8,
    lineHeight: 20,
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#14213D',
    fontSize: 18,
    fontWeight: '800',
  },
  cardCity: {
    color: '#667085',
    marginTop: 6,
    fontWeight: '700',
  },
  cardMeta: {
    color: '#14213D',
    marginTop: 12,
    fontWeight: '800',
  },
  cardTime: {
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#14213D',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: '#667085',
    textAlign: 'center',
    lineHeight: 22,
  },
});
