import { Alert, Linking } from 'react-native';

// Normalizon numrin dhe hap WhatsApp me linkun wa.me.
export const openWhatsAppForPhone = async (phone) => {
  const normalizedPhone = String(phone || '').trim();
  const digitsOnly = normalizedPhone.replace(/[^\d]/g, '').replace(/^00/, '');
  const whatsappNumber = digitsOnly.startsWith('0') ? `383${digitsOnly.slice(1)}` : digitsOnly;

  if (!whatsappNumber) {
    Alert.alert('Error', 'This phone number is not available.');
    return;
  }

  try {
    await Linking.openURL(`https://wa.me/${whatsappNumber}`);
  } catch {
    Alert.alert('Error', 'WhatsApp cannot be opened for this number.');
  }
};
