export function parseImageUrls(imageValue) {
  if (Array.isArray(imageValue)) {
    return imageValue.filter((item) => typeof item === 'string' && item.trim());
  }

  if (typeof imageValue !== 'string') {
    return [];
  }

  const trimmedValue = imageValue.trim();

  if (!trimmedValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmedValue);

    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string' && item.trim());
    }
  } catch (error) {
    return [trimmedValue];
  }

  return [trimmedValue];
}

export function getPrimaryImageUrl(imageValue) {
  return parseImageUrls(imageValue)[0] || '';
}
