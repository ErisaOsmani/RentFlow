import { Alert, Linking } from 'react-native';

export const openWhatsAppForPhone = async (phone) => {
  const normalizedPhone = String(phone || '').trim();
  const whatsappNumber = normalizedPhone.replace(/[^\d]/g, '').replace(/^00/, '');

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
