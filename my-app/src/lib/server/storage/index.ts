/**
 * Storage service abstraction for handling media files
 * Supports both local filesystem storage and Supabase Storage
 */

import { dev } from '$app/environment';
import { localStorageService } from './local-storage';
// Import supabaseStorageService when needed for production
// import { supabaseStorageService } from './supabase-storage';

// Define the interface for storage services
export interface StorageService {
  /**
   * Upload a file to storage
   * @param file The file to upload (as Buffer or Blob)
   * @param fileType The MIME type of the file
   * @param fileName Optional filename (will be generated if not provided)
   * @returns Promise with the file URL/path and ID
   */
  uploadFile(
    file: Buffer | Blob, 
    fileType: string, 
    fileName?: string
  ): Promise<{ url: string; id: string }>;

  /**
   * Delete a file from storage
   * @param fileUrl The URL/path of the file to delete
   * @returns Promise indicating success
   */
  deleteFile(fileUrl: string): Promise<boolean>;

  /**
   * Get the public URL for a file
   * @param fileId The ID of the file
   * @returns The public URL for the file
   */
  getPublicUrl(fileId: string): string;
}

// Export the appropriate storage service based on environment
export const storageService: StorageService = dev 
  ? localStorageService 
  : localStorageService; // Change to supabaseStorageService for production

// Helper function to determine file type from data URL
export function getFileTypeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
  return match ? match[1] : null;
}

// Helper function to convert data URL to Buffer
export function dataUrlToBuffer(dataUrl: string): Buffer {
  // Extract the base64 part of the data URL
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data) {
    throw new Error('Invalid data URL format');
  }
  return Buffer.from(base64Data, 'base64');
}
