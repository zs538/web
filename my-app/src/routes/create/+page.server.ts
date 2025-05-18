import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { protectRoute } from '$lib/server/auth/protect';
import { db } from '$lib/server/db';
import { post, media } from '$lib/server/db/schema';
import { nanoid } from 'nanoid';

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
              // For now, we're just storing the data URLs directly
              // In a production app, you'd want to process uploads and store them properly
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
