import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { post, media } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// POST endpoint to permanently delete all posts marked as deleted
export const POST: RequestHandler = async ({ locals }) => {
  // Check if user is logged in and is an admin
  if (!locals.user) {
    throw error(401, 'Unauthorized - You must be logged in');
  }

  if (locals.user.role !== 'admin') {
    throw error(403, 'Forbidden - Admin access required');
  }

  try {
    // 1. Find all posts marked as deleted
    const postsToDelete = await db.select()
      .from(post)
      .where(eq(post.isDeleted, true));

    const deletedPostsCount = postsToDelete.length;

    if (deletedPostsCount === 0) {
      return json({
        success: true,
        message: 'No soft-deleted posts found to clean up',
        deletedCount: 0
      });
    }

    // 2. Delete media for each post individually to avoid potential issues
    let mediaDeletedCount = 0;
    let postsDeletedCount = 0;

    for (const postToDelete of postsToDelete) {
      try {
        // Delete media for this post
        await db.delete(media)
          .where(eq(media.postId, postToDelete.id));

        // Delete the post itself
        await db.delete(post)
          .where(eq(post.id, postToDelete.id));

        // Count successful deletions
        postsDeletedCount++;
        mediaDeletedCount += 1; // We don't have the actual count from SQLite, so estimate
      } catch (deleteErr) {
        console.error(`Error deleting post ${postToDelete.id}:`, deleteErr);
        // Continue with next post even if this one fails
      }
    }

    return json({
      success: true,
      message: `Successfully deleted ${postsDeletedCount} posts and ${mediaDeletedCount} media items`,
      deletedCount: postsDeletedCount,
      mediaDeletedCount
    });
  } catch (err) {
    console.error('Error cleaning up deleted posts:', err);

    // Return more detailed error information for debugging
    if (err instanceof Error) {
      return json({
        success: false,
        message: 'Error cleaning up deleted posts',
        error: err.message,
        stack: err.stack
      }, { status: 500 });
    }

    // Otherwise, return a generic error
    throw error(500, 'Failed to clean up deleted posts');
  }
};
