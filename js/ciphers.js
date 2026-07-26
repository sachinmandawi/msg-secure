/**
 * Msg Secure - Classic Ciphers & Utility Encoders
 */

export class CipherEngine {
  // Caesar Cipher
  static caesarEncrypt(text, shift = 3) {
    shift = (parseInt(shift) || 3) % 26;
    return text.replace(/[a-zA-Z]/g, (char) => {
      const code = char.charCodeAt(0);
      const base = code >= 65 && code <= 90 ? 65 : 97;
      return String.fromCharCode(((code - base + shift) % 26) + base);
    });
  }

  static caesarDecrypt(text, shift = 3) {
    shift = (parseInt(shift) || 3) % 26;
    return this.caesarEncrypt(text, (26 - shift) % 26);
  }

  // ROT13 Cipher
  static rot13(text) {
    return this.caesarEncrypt(text, 13);
  }

  // Vigenère Cipher
  static vigenereEncrypt(text, key) {
    if (!key) throw new Error("Vigenère cipher requires a keyword.");
    key = key.toLowerCase().replace(/[^a-z]/g, "");
    if (!key) throw new Error("Key must contain alphabetic characters.");

    let keyIdx = 0;
    return text.replace(/[a-zA-Z]/g, (char) => {
      const code = char.charCodeAt(0);
      const isUpper = code >= 65 && code <= 90;
      const base = isUpper ? 65 : 97;
      const shift = key[keyIdx % key.length].charCodeAt(0) - 97;
      keyIdx++;
      return String.fromCharCode(((code - base + shift) % 26) + base);
    });
  }

  static vigenereDecrypt(text, key) {
    if (!key) throw new Error("Vigenère cipher requires a keyword.");
    key = key.toLowerCase().replace(/[^a-z]/g, "");
    if (!key) throw new Error("Key must contain alphabetic characters.");

    let keyIdx = 0;
    return text.replace(/[a-zA-Z]/g, (char) => {
      const code = char.charCodeAt(0);
      const isUpper = code >= 65 && code <= 90;
      const base = isUpper ? 65 : 97;
      const shift = key[keyIdx % key.length].charCodeAt(0) - 97;
      keyIdx++;
      return String.fromCharCode(((code - base - shift + 26) % 26) + base);
    });
  }

  // Base64 Encoding / Decoding
  static base64Encode(text) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return window.btoa(binary);
  }

  static base64Decode(base64) {
    try {
      const binary = window.atob(base64.trim());
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    } catch (e) {
      throw new Error("Invalid Base64 string.");
    }
  }

  // Hex Encoding / Decoding
  static hexEncode(text) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
  }

  static hexDecode(hexStr) {
    try {
      const cleanHex = hexStr.replace(/[^0-9a-fA-F]/g, "");
      if (cleanHex.length % 2 !== 0) throw new Error("Invalid Hex length.");
      const bytes = new Uint8Array(cleanHex.length / 2);
      for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
      }
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    } catch (e) {
      throw new Error("Invalid Hex string.");
    }
  }

  // Morse Code Converter
  static MORSE_CODE_MAP = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
    I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
    Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....",
    6: "-....", 7: "--...", 8: "---..", 9: "----.", 0: "-----", " ": "/"
  };

  static morseEncode(text) {
    return text
      .toUpperCase()
      .split("")
      .map((char) => this.MORSE_CODE_MAP[char] || char)
      .join(" ");
  }

  static morseDecode(morse) {
    const reverseMap = {};
    Object.keys(this.MORSE_CODE_MAP).forEach((k) => (reverseMap[this.MORSE_CODE_MAP[k]] = k));

    return morse
      .trim()
      .split(" ")
      .map((code) => reverseMap[code] || (code === "/" ? " " : ""))
      .join("");
  }
}
