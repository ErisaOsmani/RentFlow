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
import {
  getCurrentUser,
  loadNotifications,
  markNotificationRead,
} from '../services/sprintOne';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { user, error: userError } = await getCurrentUser();

      if (userError || !user) {
        Alert.alert('Gabim', 'Duhet te jesh i kycur per njoftime.');
        navigation.goBack();
        return;
      }

      const result = await loadNotifications(user.id);

      if (result.error) {
        Alert.alert('Gabim', result.error.message);
        return;
      }

      setUnavailable(result.unavailable);
      setNotifications(result.notifications);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleOpen = async (item) => {
    if (!item.read_at) {
      await markNotificationRead(item.id);
      loadData();
    }

    if (item.apartment_id) {
      navigation.goBack();
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.read_at && styles.cardUnread]}
      activeOpacity={0.86}
      onPress={() => handleOpen(item)}
    >
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardMessage}>{item.message}</Text>
      <Text style={styles.cardDate}>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()}>
          <Text style={styles.backChipText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#14213D" style={styles.loader} />
      ) : unavailable ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Notifications not configured</Text>
          <Text style={styles.emptyText}>Ekzekuto supabase_sprint1.sql per me aktivizu njoftimet.</Text>
        </View>
      ) : notifications.length ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={renderNotification}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>Aktivitetet e rezervimeve do te shfaqen ketu.</Text>
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
    marginBottom: 22,
  },
  backChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D2D8E3',
    marginBottom: 18,
  },
  backChipText: {
    color: '#14213D',
    fontWeight: '700',
  },
  title: {
    color: '#14213D',
    fontSize: 28,
    fontWeight: '800',
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardUnread: {
    borderColor: '#FF5A5F',
  },
  cardTitle: {
    color: '#14213D',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardMessage: {
    color: '#475569',
    lineHeight: 20,
  },
  cardDate: {
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 10,
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
    marginBottom: 10,
  },
  emptyText: {
    color: '#667085',
    textAlign: 'center',
    lineHeight: 22,
  },
});
