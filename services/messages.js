import { supabase } from './supabase';
import { createNotification, isMissingSchemaError } from './bookings';
import { USER_PROFILE_SELECT_FULL } from '../utils/marketplace';

// Merr profilin e user-it duke provuar select-e qe pershtaten me skema te ndryshme.
export const loadUserProfile = async (userId) => {
  if (!userId) {
    return { profile: null, error: null };
  }

  for (const selectFields of USER_PROFILE_SELECT_FULL) {
    const { data, error } = await supabase
      .from('users')
      .select(selectFields)
      .eq('id', userId)
      .maybeSingle();

    if (error?.code === '42703') {
      continue;
    }

    return { profile: data || null, error };
  }

  return { profile: null, error: null };
};

// Perditeson te dhenat e profilit dhe e kthen statusin ne pending verification.
export const updateUserProfile = async ({ userId, firstName, lastName, phone }) => {
  const payloadOptions = [
    {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      verification_status: 'pending',
    },
    {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
    },
  ];

  for (const payload of payloadOptions) {
    const { error } = await supabase.from('users').update(payload).eq('id', userId);

    if (!error) {
      return { error: null };
    }

    if (error.code === '42703') {
      continue;
    }

    return { error };
  }

  return { error: { message: 'The profile was not saved. Check the users table columns.' } };
};

// Admini e perdor per te verifikuar ose refuzuar nje profil.
export const setProfileVerification = async ({ userId, verified }) => {
  const payloadOptions = [
    {
      verified,
      verification_status: verified ? 'verified' : 'rejected',
    },
    { verified },
  ];

  for (const payload of payloadOptions) {
    const { error } = await supabase.from('users').update(payload).eq('id', userId);

    if (!error) {
      return { error: null };
    }

    if (error.code === '42703') {
      continue;
    }

    return { error };
  }

  return { error: { message: 'Run supabase_marketplace_features.sql for verified profiles.' } };
};

// Gjen biseden ekzistuese per apartamentin ose krijon nje te re.
export const getOrCreateConversation = async ({ apartmentId, ownerId, clientId }) => {
  if (!apartmentId || !ownerId || !clientId) {
    return { conversation: null, error: { message: 'Missing chat data.' } };
  }

  const { data: existing, error: existingError } = await supabase
    .from('conversations')
    .select('id, apartment_id, owner_id, client_id, updated_at')
    .eq('apartment_id', apartmentId)
    .eq('owner_id', ownerId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (isMissingSchemaError(existingError)) {
    return {
      conversation: null,
      error: { message: 'Run supabase_marketplace_features.sql to enable chat.' },
      unavailable: true,
    };
  }

  if (existingError) {
    return { conversation: null, error: existingError };
  }

  if (existing) {
    return { conversation: existing, error: null };
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      apartment_id: apartmentId,
      owner_id: ownerId,
      client_id: clientId,
    })
    .select('id, apartment_id, owner_id, client_id, updated_at')
    .maybeSingle();

  if (isMissingSchemaError(error)) {
    return {
      conversation: null,
      error: { message: 'Run supabase_marketplace_features.sql to enable chat.' },
      unavailable: true,
    };
  }

  return { conversation: data || null, error };
};

// Ngarkon mesazhet e nje bisede ne rend kronologjik.
export const loadConversationMessages = async (conversationId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, read_at, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (isMissingSchemaError(error)) {
    return { messages: [], error: null, unavailable: true };
  }

  return { messages: data || [], error, unavailable: false };
};

// Dergon njoftim te personi tjeter kur vjen mesazh i ri.
const notifyMessageRecipient = async ({ conversationId, senderId, body }) => {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id, apartment_id, owner_id, client_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (error || !conversation) {
    return;
  }

  const recipientId = conversation.owner_id === senderId
    ? conversation.client_id
    : conversation.owner_id;

  if (!recipientId || recipientId === senderId) {
    return;
  }

  const preview = body.length > 90 ? `${body.slice(0, 87)}...` : body;

  await createNotification({
    userId: recipientId,
    title: 'New message',
    message: preview,
    type: 'chat_message',
    apartmentId: conversation.apartment_id,
  });
};

// Ruaj mesazhin, perditeson conversation.updated_at dhe njofton marresin.
export const sendConversationMessage = async ({ conversationId, senderId, body }) => {
  const normalizedBody = body.trim();

  if (!normalizedBody) {
    return { message: null, error: { message: 'The message cannot be empty.' } };
  }

  const payload = {
    conversation_id: conversationId,
    sender_id: senderId,
    body: normalizedBody,
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(payload)
    .select('id, conversation_id, sender_id, body, read_at, created_at')
    .maybeSingle();

  if (isMissingSchemaError(error)) {
    return { message: null, error: { message: 'Run supabase_marketplace_features.sql for messages.' } };
  }

  if (error?.code === '42501' || error?.message?.toLowerCase().includes('row-level security')) {
    const fallback = await supabase.from('messages').insert(payload);

    if (fallback.error) {
      return { message: null, error: fallback.error };
    }

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    await notifyMessageRecipient({ conversationId, senderId, body: normalizedBody });

    return {
      message: {
        id: `local-${Date.now()}`,
        ...payload,
        read_at: null,
        created_at: new Date().toISOString(),
      },
      error: null,
    };
  }

  if (!error) {
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    await notifyMessageRecipient({ conversationId, senderId, body: normalizedBody });
  }

  return { message: data || null, error };
};

// Merr te gjitha bisedat ku user-i eshte pronar ose klient.
export const loadInboxConversations = async (userId) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, apartment_id, owner_id, client_id, updated_at')
    .or(`owner_id.eq.${userId},client_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (isMissingSchemaError(error)) {
    return { conversations: [], error: null, unavailable: true };
  }

  return { conversations: data || [], error, unavailable: false };
};
