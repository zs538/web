import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { post, media, auditLog } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { storageService } from '$lib/server/storage';

// DELETE endpoint for post deletion
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const postId = params.id;

  // Check if user is logged in
  if (!locals.user) {
    throw error(401, 'Unauthorized - You must be logged in to delete posts');
  }

  try {
    // Fetch the post to check ownership
    const postToDelete = await db.query.post.findFirst({
      where: (post, { eq }) => eq(post.id, postId),
      with: {
        author: true
      }
    });

    // Check if post exists
    if (!postToDelete) {
      throw error(404, 'Post not found');
    }

    // Check authorization:
    // 1. Admin can delete any post
    // 2. Regular user can only delete their own posts
    const isAdmin = locals.user.role === 'admin';
    const isAuthor = postToDelete.authorId === locals.user.id;

    if (!isAdmin && !isAuthor) {
      throw error(403, 'Forbidden - You do not have permission to delete this post');
    }

    // First, fetch all media associated with this post
    const mediaItems = await db.select()
      .from(media)
      .where(eq(media.postId, postId));

    // Track any media files that failed to delete
    const failedDeletions: string[] = [];

    // Delete media files from storage
    for (const item of mediaItems) {
      // Only delete files that are stored in our storage system (not external URLs or embeds)
      if (item.url.startsWith('/uploads/')) {
        try {
          const success = await storageService.deleteFile(item.url);
          if (success) {
            console.log(`Deleted media file: ${item.url}`);
          } else {
            console.warn(`Failed to delete media file: ${item.url}`);
            failedDeletions.push(item.url);
          }
        } catch (deleteError) {
          console.error(`Error deleting media file ${item.url}:`, deleteError);
          failedDeletions.push(item.url);
          // Continue with deletion even if file removal fails
        }
      }
    }

    // Use a transaction for database operations to ensure consistency
    try {
      // Start a transaction
      await db.transaction(async (tx) => {
        // First delete media records from database
        await tx.delete(media)
          .where(eq(media.postId, postId));

        // Then delete the post itself
        await tx.delete(post)
          .where(eq(post.id, postId));

        // Log the permanent deletion in audit log
        await tx.insert(auditLog).values({
          id: nanoid(),
          userId: locals.user.id,
          action: 'PERMANENT_DELETE',
          targetTable: 'post',
          targetId: postId,
          details: JSON.stringify({
            deletedBy: locals.user.id,
            deletedByRole: locals.user.role,
            isAuthorDelete: isAuthor,
            isPermanentDelete: true,
            failedMediaDeletions: failedDeletions.length > 0 ? failedDeletions : undefined
          }),
          timestamp: new Date()
        });
      });
    } catch (txError) {
      console.error('Transaction failed during post deletion:', txError);
      throw error(500, 'Database error during post deletion');
    }

    // Return success response
    return json({
      success: true,
      message: 'Post permanently deleted',
      warnings: failedDeletions.length > 0 ?
        { mediaFiles: `${failedDeletions.length} media files could not be deleted` } :
        undefined
    });
  } catch (err) {
    console.error('Error deleting post:', err);

    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    // Otherwise, return a generic error
    throw error(500, 'Failed to delete post');
  }
};
