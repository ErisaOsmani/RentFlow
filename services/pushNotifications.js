import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotifications = async (userId) => {
  if (!userId || Platform.OS === 'web') {
    return { token: null, error: null };
  }

  try {
    const existingPermissions = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermissions.status;

    if (finalStatus !== 'granted') {
      const requestedPermissions = await Notifications.requestPermissionsAsync();
      finalStatus = requestedPermissions.status;
    }

    if (finalStatus !== 'granted') {
      return { token: null, error: null };
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'RentFlow',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    const { error } = await supabase
      .from('users')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error?.code === '42703') {
      return { token, error: null };
    }

    return { token, error };
  } catch (err) {
    return { token: null, error: { message: err?.message || 'Push notification registration failed.' } };
  }
};

export const sendPushNotificationToUser = async ({ userId, title, body, data = {} }) => {
  if (!userId) {
    return { error: null };
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('expo_push_token')
    .eq('id', userId)
    .maybeSingle();

  if (error?.code === '42703' || error) {
    return { error: error?.code === '42703' ? null : error };
  }

  if (!profile?.expo_push_token) {
    return { error: null };
  }

  let response;

  try {
    response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        sound: 'default',
        title,
        body,
        data,
      }),
    });
  } catch (err) {
    return { error: { message: 'Push notification network request failed.' } };
  }

  if (!response.ok) {
    return { error: { message: 'Push notification failed to send.' } };
  }

  return { error: null };
};
