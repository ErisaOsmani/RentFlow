import { Alert, Linking } from 'react-native';

export const openWhatsAppForPhone = async (phone) => {
  const normalizedPhone = String(phone || '').trim();
  const digitsOnly = normalizedPhone.replace(/[^\d]/g, '').replace(/^00/, '');
  const whatsappNumber = digitsOnly.startsWith('0') ? `383${digitsOnly.slice(1)}` : digitsOnly;

  if (!whatsappNumber) {
    Alert.alert('Gabim', 'Ky numer telefoni nuk eshte i disponueshem.');
    return;
  }

  try {
    await Linking.openURL(`https://wa.me/${whatsappNumber}`);
  } catch {
    Alert.alert('Gabim', 'WhatsApp nuk mund te hapet per kete numer.');
  }
};
