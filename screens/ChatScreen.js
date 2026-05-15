import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getCurrentUser } from '../services/sprintOne';
import {
  getOrCreateConversation,
  loadConversationMessages,
  sendConversationMessage,
} from '../services/sprintTwo';

export default function ChatScreen({ navigation, route }) {
  const apartment = route.params?.apartment;
  const providedConversation = route.params?.conversation || null;
  const [conversation, setConversation] = useState(providedConversation);
  const [messages, setMessages] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const title = useMemo(() => apartment?.title || 'RentFlow chat', [apartment?.title]);

  const loadChat = useCallback(async () => {
    try {
      setLoading(true);
      const { user, error: authError } = await getCurrentUser();

      if (authError || !user) {
        Alert.alert('Gabim', 'Duhet te jesh i kycur per chat.');
        navigation.goBack();
        return;
      }

      setCurrentUserId(user.id);

      let activeConversation = providedConversation;

      if (!activeConversation) {
        const ownerId = apartment?.owner_id;
        const clientId = route.params?.clientId || user.id;
        const result = await getOrCreateConversation({
          apartmentId: apartment?.id,
          ownerId,
          clientId,
        });

        if (result.error) {
          Alert.alert('Chat', result.error.message);
          return;
        }

        activeConversation = result.conversation;
        setConversation(activeConversation);
      }

      if (!activeConversation?.id) {
        return;
      }

      const { messages: loadedMessages, error } = await loadConversationMessages(activeConversation.id);

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      setMessages(loadedMessages);
    } finally {
      setLoading(false);
    }
  }, [apartment?.id, apartment?.owner_id, navigation, providedConversation, route.params?.clientId]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  const handleSend = async () => {
    if (!conversation?.id || !currentUserId) {
      return;
    }

    try {
      setSending(true);
      const { message, error } = await sendConversationMessage({
        conversationId: conversation.id,
        senderId: currentUserId,
        body: draft,
      });

      if (error) {
        Alert.alert('Gabim', error.message);
        return;
      }

      setDraft('');
      if (message) {
        setMessages((current) => [...current, message]);
      }
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender_id === currentUserId;

    return (
      <View style={[styles.messageBubble, isMine ? styles.messageMine : styles.messageOther]}>
        <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextOther]}>
          {item.body}
        </Text>
        <Text style={[styles.messageTime, isMine ? styles.messageTimeMine : styles.messageTimeOther]}>
          {item.created_at ? new Date(item.created_at).toLocaleString() : 'Now'}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()}>
          <Text style={styles.backChipText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Komunikim direkt brenda RentFlow.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#14213D" style={styles.loader} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nis biseden</Text>
              <Text style={styles.emptyText}>Pyet owner-in per kushtet, lagjen ose disponueshmerine.</Text>
            </View>
          }
        />
      )}

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Shkruaj mesazh..."
          placeholderTextColor="#8F97A8"
          style={styles.input}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendButtonText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F7',
  },
  header: {
    backgroundColor: '#14213D',
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    fontWeight: '800',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#D3DAE6',
    marginTop: 6,
  },
  loader: {
    marginTop: 40,
  },
  messagesContent: {
    padding: 18,
    paddingBottom: 30,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  messageMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#14213D',
    borderBottomRightRadius: 6,
  },
  messageOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageTextMine: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#14213D',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 8,
    fontWeight: '700',
  },
  messageTimeMine: {
    color: '#CBD5E1',
  },
  messageTimeOther: {
    color: '#94A3B8',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    color: '#14213D',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#667085',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
  },
  composer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#14213D',
  },
  sendButton: {
    width: 72,
    borderRadius: 16,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
