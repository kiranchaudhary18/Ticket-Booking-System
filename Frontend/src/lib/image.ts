export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const prefix = path.startsWith('/') ? '' : '/';
  
  return `${baseUrl}${prefix}${path}`;
}
