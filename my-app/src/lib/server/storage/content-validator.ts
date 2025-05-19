/**
 * Content validator for uploaded files
 * Validates that files match their claimed MIME types by checking file signatures
 */

// File signatures (magic numbers) for common file types
const FILE_SIGNATURES: Record<string, Array<{ bytes: number[], offset?: number }>> = {
  // Images
  'image/jpeg': [
    { bytes: [0xFF, 0xD8, 0xFF] } // JPEG signature
  ],
  'image/png': [
    { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] } // PNG signature
  ],
  'image/gif': [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }  // GIF89a
  ],
  'image/webp': [
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
    { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }  // WEBP
  ],
  
  // Videos
  'video/mp4': [
    { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 } // MP4 ftyp box
  ],
  'video/webm': [
    { bytes: [0x1A, 0x45, 0xDF, 0xA3] } // WEBM signature
  ],
  
  // Audio
  'audio/mpeg': [
    { bytes: [0x49, 0x44, 0x33] }, // ID3 tag (MP3)
    { bytes: [0xFF, 0xFB] }        // MP3 without ID3
  ],
  'audio/ogg': [
    { bytes: [0x4F, 0x67, 0x67, 0x53] } // OGG signature
  ],
  'audio/wav': [
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
    { bytes: [0x57, 0x41, 0x56, 0x45], offset: 8 }  // WAVE
  ]
};

/**
 * Validates that a file's content matches its claimed MIME type
 * @param buffer The file buffer to validate
 * @param mimeType The claimed MIME type
 * @returns True if the file content matches the MIME type, false otherwise
 */
export function validateFileContent(buffer: Buffer, mimeType: string): boolean {
  // If we don't have a signature for this MIME type, assume it's valid
  if (!FILE_SIGNATURES[mimeType]) {
    console.warn(`No signature defined for MIME type: ${mimeType}`);
    return true;
  }
  
  // Check each possible signature for this MIME type
  return FILE_SIGNATURES[mimeType].some(signature => {
    const offset = signature.offset || 0;
    
    // Make sure the buffer is large enough
    if (buffer.length < offset + signature.bytes.length) {
      return false;
    }
    
    // Check if the bytes match the signature
    for (let i = 0; i < signature.bytes.length; i++) {
      if (buffer[offset + i] !== signature.bytes[i]) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Gets the actual MIME type of a file based on its content
 * @param buffer The file buffer to analyze
 * @returns The detected MIME type, or null if unknown
 */
export function detectMimeType(buffer: Buffer): string | null {
  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    if (signatures.some(signature => {
      const offset = signature.offset || 0;
      
      // Make sure the buffer is large enough
      if (buffer.length < offset + signature.bytes.length) {
        return false;
      }
      
      // Check if the bytes match the signature
      for (let i = 0; i < signature.bytes.length; i++) {
        if (buffer[offset + i] !== signature.bytes[i]) {
          return false;
        }
      }
      
      return true;
    })) {
      return mimeType;
    }
  }
  
  return null;
}
