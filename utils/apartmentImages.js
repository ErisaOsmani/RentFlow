// Kthen image_url ne liste URL-sh, pavaresisht nese vjen si array, JSON string ose URL e vetme.
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

// Merr foton e pare qe perdoret si thumbnail/hero image.
export function getPrimaryImageUrl(imageValue) {
  return parseImageUrls(imageValue)[0] || '';
}
