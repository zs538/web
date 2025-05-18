import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user, post, media, auditLog } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * POST endpoint for deleting all posts by a user
 * Protected endpoint - only accessible to admin users
 */
export const POST: RequestHandler = async ({ params, locals }) => {
  // Check if user is logged in and has admin role
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Forbidden - Admin access required');
  }

  const userId = params.id;

  try {
    // Fetch the user to make sure they exist
    const targetUser = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, userId)
    });

    if (!targetUser) {
      throw error(404, 'User not found');
    }

    // Get all post IDs by this user
    const userPosts = await db.select({ id: post.id })
      .from(post)
      .where(eq(post.authorId, userId));

    const postIds = userPosts.map(p => p.id);

    // If no posts found, return early
    if (postIds.length === 0) {
      return json({
        success: true,
        message: `No posts found for user "${targetUser.username}"`,
        count: 0
      });
    }

    // Start a transaction to delete all posts and their media
    let deletedCount = 0;

    await db.transaction(async (tx) => {
      // For each post, delete its media first
      for (const postId of postIds) {
        // Delete media for this post
        await tx.delete(media).where(eq(media.postId, postId));

        // Delete the post
        await tx.delete(post).where(eq(post.id, postId));

        deletedCount++;
      }

      // Log the mass deletion in audit log
      await tx.insert(auditLog).values({
        id: nanoid(),
        userId: locals.user.id,
        action: 'DELETE_ALL_USER_POSTS',
        targetTable: 'post',
        targetId: userId, // Using user ID as the target since we're deleting multiple posts
        details: JSON.stringify({
          deletedByUserId: locals.user.id,
          targetUsername: targetUser.username,
          postCount: deletedCount,
          timestamp: new Date().toISOString()
        }),
        timestamp: new Date()
      });
    });

    return json({
      success: true,
      message: `Deleted ${deletedCount} posts by user "${targetUser.username}"`,
      count: deletedCount
    });
  } catch (err) {
    console.error('Error deleting user posts:', err);

    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    throw error(500, 'Failed to delete user posts');
  }
};
