import Dexie, { type Table } from 'dexie';
import { Reel } from '../types';

export class SareeHistoryDatabase extends Dexie {
  reels!: Table<Reel>;

  constructor() {
    super('SareeHistoryDB');
    this.version(1).stores({
      reels: 'id, createdAt, aesthetic' // Primary key and indexes
    });
  }
}

export const db = new SareeHistoryDatabase();

/**
 * Converts a URL (like a blob: or network URL) to a Base64 string for persistent storage
 */
export async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert URL to Base64:', error);
    return url; // Fallback to original if conversion fails
  }
}

/**
 * Creates temporary URLs from Base64 data for efficient rendering in memory
 */
export function base64ToBlobUrl(base64: string): string {
  if (!base64.startsWith('data:')) return base64;
  
  const parts = base64.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  const blob = new Blob([u8arr], { type: mime });
  return URL.createObjectURL(blob);
}
