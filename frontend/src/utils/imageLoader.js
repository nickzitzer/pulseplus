export default function imageLoader({ src = '/missing-image.png', width = 48, quality = 75 }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

  return `${baseUrl}${src}?w=${width}&q=${quality}`;
}