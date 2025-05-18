/**
 * Utility functions for generating IDs
 */

/**
 * Generates a user ID that includes the username for easier identification
 * Format: username_[random-string]
 * 
 * @param username The username to include in the ID
 * @returns A unique ID that includes the username
 */
export function generateUserId(username: string): string {
  // Sanitize username to ensure it's safe to use in an ID
  // Replace spaces and special characters with underscores
  const sanitizedUsername = username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_'); // Replace multiple consecutive underscores with a single one
  
  // Generate a random string (shorter than UUID)
  const randomPart = crypto.randomUUID().split('-')[0]; // Use first segment of UUID
  
  // Combine username and random string
  return `${sanitizedUsername}_${randomPart}`;
}
