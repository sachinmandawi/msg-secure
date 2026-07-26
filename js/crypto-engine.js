/**
 * Msg Secure - AES-256-GCM Encryption Engine using Web Crypto API
 * Zero-Knowledge client-side crypto operations
 */

export class CryptoEngine {
  /**
   * Derive AES-256-GCM key from passphrase using PBKDF2
   */
  static async deriveKey(passphrase, salt) {
    const encoder = new TextEncoder();
    const passphraseKey = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(passphrase),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      passphraseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypt text message with AES-256-GCM
   * Returns Base64 payload containing Salt + IV + Ciphertext
   */
  static async encrypt(plainText, passphrase) {
    if (!plainText) throw new Error("Please enter a message to encrypt.");
    if (!passphrase) throw new Error("Please enter a secret passphrase.");

    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);

    // 16 bytes salt & 12 bytes IV for GCM
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKey(passphrase, salt);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );

    // Pack: Magic header (4 bytes: "MSGS") + Salt (16) + IV (12) + Encrypted Data
    const magic = new Uint8Array([77, 83, 71, 83]); // "MSGS"
    const encryptedArray = new Uint8Array(encryptedBuffer);

    const packed = new Uint8Array(magic.length + salt.length + iv.length + encryptedArray.length);
    packed.set(magic, 0);
    packed.set(salt, magic.length);
    packed.set(iv, magic.length + salt.length);
    packed.set(encryptedArray, magic.length + salt.length + iv.length);

    // Return as Base64 string with custom formatting
    return this.arrayBufferToBase64(packed);
  }

  /**
   * Decrypt AES-256-GCM Base64 payload
   */
  static async decrypt(base64Payload, passphrase) {
    if (!base64Payload) throw new Error("Please enter a payload to decrypt.");
    if (!passphrase) throw new Error("Please enter the secret passphrase.");

    let packed;
    try {
      packed = this.base64ToArrayBuffer(base64Payload.trim());
    } catch (e) {
      throw new Error("Invalid format. Ciphertext is not valid Base64 payload.");
    }

    if (packed.byteLength < 4 + 16 + 12 + 1) {
      throw new Error("Payload is corrupted or too short.");
    }

    const packedArray = new Uint8Array(packed);

    // Check magic header "MSGS"
    if (packedArray[0] !== 77 || packedArray[1] !== 83 || packedArray[2] !== 71 || packedArray[3] !== 83) {
      throw new Error("Invalid payload format. Not an authentic Msg Secure encrypted string.");
    }

    const salt = packedArray.slice(4, 20);
    const iv = packedArray.slice(20, 32);
    const ciphertext = packedArray.slice(32);

    const key = await this.deriveKey(passphrase, salt);

    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (err) {
      throw new Error("Decryption failed! Incorrect passphrase or corrupted data.");
    }
  }

  static arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  static base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
