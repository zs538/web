/**
 * Local filesystem storage service implementation
 * Includes content validation and error handling
 */

import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import type { StorageService } from '.';
import { validateFileContent, detectMimeType } from './content-validator';

// Define the upload directory - this will be in the static folder so files are served directly
const UPLOAD_DIR = 'static/uploads';
const PUBLIC_PATH = '/uploads';

// Ensure the upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(path.join(process.cwd(), UPLOAD_DIR), { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
    throw error;
  }
}

// Get file extension from MIME type
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav'
  };

  return mimeToExt[mimeType] || 'bin';
}

// Error class for file validation failures
class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

// Maximum number of upload retries
const MAX_RETRIES = 3;

// Local storage service implementation
export const localStorageService: StorageService = {
  async uploadFile(file: Buffer | Blob, fileType: string, fileName?: string): Promise<{ url: string; id: string }> {
    // Convert Blob to Buffer if needed
    let fileBuffer: Buffer;
    if (file instanceof Buffer) {
      fileBuffer = file;
    } else {
      // For browser Blob objects
      try {
        fileBuffer = Buffer.from(await file.arrayBuffer());
      } catch (error) {
        console.error('Error converting Blob to Buffer:', error);
        throw new Error('Failed to process file: Invalid file format');
      }
    }

    // Validate file content matches claimed MIME type
    if (!validateFileContent(fileBuffer, fileType)) {
      // Try to detect the actual MIME type
      const detectedType = detectMimeType(fileBuffer);

      if (detectedType) {
        console.warn(`File claimed to be ${fileType} but appears to be ${detectedType}`);
        throw new FileValidationError(`Invalid file format: File appears to be ${detectedType} but was claimed to be ${fileType}`);
      } else {
        console.warn(`File claimed to be ${fileType} but doesn't match any known format`);
        throw new FileValidationError(`Invalid file format: File doesn't match the claimed type ${fileType}`);
      }
    }

    // Ensure upload directory exists
    await ensureUploadDir();

    // Generate a unique ID for the file
    const fileId = nanoid();

    // Get the file extension
    const ext = getExtensionFromMimeType(fileType);

    // Create the filename
    const finalFileName = `${fileId}.${ext}`;

    // Create the full path
    const filePath = path.join(process.cwd(), UPLOAD_DIR, finalFileName);

    // Implement retry logic for file writing
    let retries = 0;
    let lastError: Error | null = null;

    while (retries < MAX_RETRIES) {
      try {
        // Write the file
        await fs.writeFile(filePath, fileBuffer);

        // Return the public URL and ID
        return {
          url: `${PUBLIC_PATH}/${finalFileName}`,
          id: fileId
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`Error writing file (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
        retries++;

        // Wait a bit before retrying (exponential backoff)
        if (retries < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
        }
      }
    }

    // If we get here, all retries failed
    console.error('All upload attempts failed');
    throw new Error(`Failed to upload file after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
  },

  async deleteFile(fileUrl: string): Promise<boolean> {
    // Extract the filename from the URL
    const fileName = path.basename(fileUrl);

    // Create the full path
    const filePath = path.join(process.cwd(), UPLOAD_DIR, fileName);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, consider it already deleted
      console.log(`File ${fileName} doesn't exist, considering it already deleted`);
      return true;
    }

    // Implement retry logic for file deletion
    let retries = 0;
    let lastError: Error | null = null;

    while (retries < MAX_RETRIES) {
      try {
        // Delete the file
        await fs.unlink(filePath);
        console.log(`Successfully deleted file: ${fileName}`);
        return true;
      } catch (error) {
        lastError = error as Error;
        console.error(`Error deleting file (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
        retries++;

        // Wait a bit before retrying (exponential backoff)
        if (retries < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
        }
      }
    }

    // If we get here, all retries failed
    console.error(`Failed to delete file ${fileName} after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
    return false;
  },

  getPublicUrl(fileId: string): string {
    // This is a simple implementation that assumes the fileId is the filename without extension
    // In a real implementation, you might need to query a database to get the full path
    return `${PUBLIC_PATH}/${fileId}`;
  }
};
