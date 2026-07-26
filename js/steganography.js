/**
 * Msg Secure - Image Steganography Engine (LSB Technique)
 * Encodes secret text inside canvas pixel RGB channels
 */

export class SteganographyEngine {
  static MAGIC_HEADER = "MSGSEC|";

  /**
   * Hide secret text inside image and return PNG Data URL
   */
  static encode(imageSrc, text) {
    return new Promise((resolve, reject) => {
      if (!text) {
        return reject(new Error("Please provide a secret text to hide in the image."));
      }

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;

        // Prepare binary message: MAGIC_HEADER + length + "|" + text
        const fullMessage = `${this.MAGIC_HEADER}${text}`;
        const encoder = new TextEncoder();
        const msgBytes = encoder.encode(fullMessage);

        // Calculate bits capacity
        // 3 bits per pixel (R, G, B channels, skipping Alpha channel)
        const totalPixels = pixels.length / 4;
        const availableBits = totalPixels * 3;
        const requiredBits = (msgBytes.length + 4) * 8; // 4 bytes for length prefix

        if (requiredBits > availableBits) {
          return reject(new Error(`Image is too small! Need at least ${Math.ceil(requiredBits / 3)} pixels.`));
        }

        // Convert message to bit array with 32-bit length prefix
        const bits = [];
        // Add 32-bit length prefix (number of message bytes)
        const msgLen = msgBytes.length;
        for (let i = 31; i >= 0; i--) {
          bits.push((msgLen >> i) & 1);
        }

        // Add message byte bits
        for (let i = 0; i < msgBytes.length; i++) {
          const byte = msgBytes[i];
          for (let b = 7; b >= 0; b--) {
            bits.push((byte >> b) & 1);
          }
        }

        // Write bits into LSB of RGB channels
        let bitIndex = 0;
        for (let i = 0; i < pixels.length && bitIndex < bits.length; i++) {
          if ((i + 1) % 4 === 0) continue; // Skip Alpha channel

          // Set lower bit to target bit
          pixels[i] = (pixels[i] & 0xFE) | bits[bitIndex];
          bitIndex++;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = () => reject(new Error("Failed to load image for steganography."));
      img.src = imageSrc;
    });
  }

  /**
   * Decode hidden text from an image
   */
  static decode(imageSrc) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;

        // Read first 32 bits to get payload byte length
        let lengthBits = [];
        let bitIndex = 0;
        let pIndex = 0;

        while (lengthBits.length < 32 && pIndex < pixels.length) {
          if ((pIndex + 1) % 4 !== 0) {
            lengthBits.push(pixels[pIndex] & 1);
          }
          pIndex++;
        }

        if (lengthBits.length < 32) {
          return reject(new Error("No hidden message found in this image."));
        }

        let msgByteLength = 0;
        for (let i = 0; i < 32; i++) {
          msgByteLength = (msgByteLength << 1) | lengthBits[i];
        }

        // Sanity check length
        const maxBytes = Math.floor((pixels.length * 3 / 4) / 8);
        if (msgByteLength <= 0 || msgByteLength > maxBytes) {
          return reject(new Error("No hidden Msg Secure data detected in this image."));
        }

        // Read payload bytes
        const totalBitsToRead = msgByteLength * 8;
        const msgBytes = new Uint8Array(msgByteLength);
        let currentByte = 0;
        let bitCount = 0;
        let byteIdx = 0;

        for (; pIndex < pixels.length && bitCount < totalBitsToRead; pIndex++) {
          if ((pIndex + 1) % 4 === 0) continue;

          currentByte = (currentByte << 1) | (pixels[pIndex] & 1);
          bitCount++;

          if (bitCount % 8 === 0) {
            msgBytes[byteIdx++] = currentByte;
            currentByte = 0;
          }
        }

        const decoder = new TextDecoder();
        const decodedStr = decoder.decode(msgBytes);

        if (!decodedStr.startsWith(this.MAGIC_HEADER)) {
          return reject(new Error("No valid hidden message found or image has been modified."));
        }

        const hiddenText = decodedStr.slice(this.MAGIC_HEADER.length);
        resolve(hiddenText);
      };

      img.onerror = () => reject(new Error("Failed to load target image."));
      img.src = imageSrc;
    });
  }
}
