import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { protectRoute } from '$lib/server/auth/protect';
import { db } from '$lib/server/db';
import { post, media } from '$lib/server/db/schema';
import { nanoid } from 'nanoid';
import { storageService, dataUrlToBuffer, getFileTypeFromDataUrl } from '$lib/server/storage';
import { getEmbedInfo } from '$lib/utils/embed-utils';

// Protect this route - only logged in users can access
export const load: PageServerLoad = async (event) => {
  protectRoute(event);
  return {};
};

// Handle form submission
export const actions: Actions = {
  default: async ({ request, locals }) => {
    // Ensure user is logged in
    if (!locals.user) {
      throw redirect(302, '/login');
    }

    try {
      console.log('Starting post creation process');
      const formData = await request.formData();

      // Get the post text from the form data
      const postText = formData.get('postText')?.toString() || '';

      // Validate post text
      if (!postText.trim()) {
        console.log('Post text is empty or missing');
        return { success: false, error: 'Post text is required' };
      }

      console.log('Creating post with text:', postText);

      // Create a new post ID
      const postId = nanoid();

      // Insert the post
      await db.insert(post).values({
        id: postId,
        authorId: locals.user.id,
        text: postText,
        createdAt: new Date(),
        updatedAt: new Date()
        // No isDeleted flag - using hard deletion
      });

      console.log('Post created successfully');

      // Process media items
      const mediaCount = parseInt(formData.get('mediaCount')?.toString() || '0');
      console.log(`Processing ${mediaCount} media items`);

      if (mediaCount > 0) {
        try {
          const mediaItems = [];

          for (let i = 0; i < mediaCount; i++) {
            const mediaType = formData.get(`mediaType_${i}`)?.toString();
            const mediaUrl = formData.get(`mediaUrl_${i}`)?.toString();
            const mediaCaption = formData.get(`mediaCaption_${i}`)?.toString() || null;
            const mediaPosition = parseInt(formData.get(`mediaPosition_${i}`)?.toString() || '0');

            console.log(`Media item ${i}: ${mediaType} - ${mediaUrl ? 'URL present' : 'URL missing'}`);

            if (mediaType && mediaUrl) {
              // Handle different media types
              if (mediaType === 'embed') {
                // For embeds, ensure we have a proper embed URL
                let finalUrl = mediaUrl;
                let finalCaption = mediaCaption;

                // Check if this is a regular URL that needs transformation
                if (!mediaUrl.includes('/embed/') && !mediaUrl.includes('player.')) {
                  const embedInfo = getEmbedInfo(mediaUrl);
                  if (embedInfo) {
                    finalUrl = embedInfo.embedUrl;

                    // If no caption was provided, use the platform name
                    if (!finalCaption) {
                      // For Spotify, include the content type in the caption
                      if (embedInfo.platform === 'spotify' && embedInfo.meta?.spotify?.contentType) {
                        finalCaption = `Spotify ${embedInfo.meta.spotify.contentType}`;
                      } else {
                        finalCaption = embedInfo.platform;
                      }
                    }
                  }
                }

                // Store the embed URL
                mediaItems.push({
                  id: nanoid(),
                  postId,
                  type: mediaType,
                  url: finalUrl,
                  caption: finalCaption,
                  position: mediaPosition,
                  uploadedAt: new Date()
                });
              } else if (mediaUrl.startsWith('data:')) {
                // For data URLs (uploaded files), process and store them properly
                try {
                  // Get the file type from the data URL
                  const fileType = getFileTypeFromDataUrl(mediaUrl);
                  if (!fileType) {
                    console.error(`Invalid file type for media item ${i}`);
                    continue;
                  }

                  // Convert data URL to buffer
                  const fileBuffer = dataUrlToBuffer(mediaUrl);

                  // Upload the file to storage with transaction-like behavior
                  try {
                    // Upload the file to storage
                    const { url, id } = await storageService.uploadFile(
                      fileBuffer,
                      fileType,
                      mediaCaption || undefined
                    );

                    // Add the media item with the file URL
                    mediaItems.push({
                      id,
                      postId,
                      type: mediaType,
                      url,
                      caption: mediaCaption,
                      position: mediaPosition,
                      uploadedAt: new Date()
                    });

                    console.log(`Uploaded media item ${i} to storage: ${url}`);
                  } catch (validationError) {
                    // Check if it's a validation error
                    if (validationError instanceof Error &&
                        validationError.message.includes('Invalid file format')) {
                      console.error(`File validation error for media item ${i}:`, validationError.message);

                      // Return a user-friendly error
                      return {
                        success: false,
                        error: `Invalid file format detected. Please ensure your files match their claimed types.`
                      };
                    }

                    // For other errors, rethrow to be caught by the outer catch
                    throw validationError;
                  }
                } catch (uploadError) {
                  console.error(`Error uploading media item ${i}:`, uploadError);

                  // Provide a more specific error message if possible
                  if (uploadError instanceof Error) {
                    if (uploadError.message.includes('Failed to process file')) {
                      return {
                        success: false,
                        error: `Failed to process media item ${i+1}. The file may be corrupted or in an unsupported format.`
                      };
                    }
                  }

                  // Continue with next media item for non-critical errors
                  continue;
                }
              } else {
                // For regular URLs, store them directly
                mediaItems.push({
                  id: nanoid(),
                  postId,
                  type: mediaType,
                  url: mediaUrl,
                  caption: mediaCaption,
                  position: mediaPosition,
                  uploadedAt: new Date()
                });
              }
            }
          }

          // Insert media items if any
          if (mediaItems.length > 0) {
            console.log(`Inserting ${mediaItems.length} media items`);
            await db.insert(media).values(mediaItems);
            console.log(`Media items inserted successfully`);
          }
        } catch (mediaError: any) {
          console.error('Error processing media:', mediaError);
          // Continue even if media processing fails
          // The post is already created
        }
      }

      // Return success
      return { success: true };
    } catch (error: any) {
      console.error('Error creating post:', error);
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
      return {
        success: false,
        error: 'An error occurred while creating your post. Please try again.'
      };
    }
  }
};
