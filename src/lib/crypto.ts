/**
 * Client-side encryption/decryption utilities using Web Crypto API
 * for private IPFS sharing
 */

/**
 * Generate a random encryption key
 * @returns Base64-encoded key
 */
export function generateEncryptionKey(): string {
  const array = new Uint8Array(32); // 256 bits
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Encrypt text data using AES-GCM
 * @param data The plaintext data to encrypt
 * @param keyBase64 The base64-encoded encryption key
 * @returns Base64-encoded encrypted data (IV + ciphertext)
 */
export async function encryptData(data: string, keyBase64: string): Promise<string> {
  try {
    // Decode the key
    const keyData = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Generate a random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encode the data
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBytes
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM
 * @param encryptedBase64 The base64-encoded encrypted data (IV + ciphertext)
 * @param keyBase64 The base64-encoded encryption key
 * @returns The decrypted plaintext
 */
export async function decryptData(encryptedBase64: string, keyBase64: string): Promise<string> {
  try {
    // Decode the key
    const keyData = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decode the combined data
    const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

    // Split IV and ciphertext (IV is first 12 bytes)
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    // Decode the plaintext
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. The encryption key may be incorrect or corrupted.');
  }
}
