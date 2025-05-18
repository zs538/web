import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { post, media, user } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * API endpoint for fetching a user's posts
 * Supports pagination with page and limit parameters
 * Protected endpoint - only accessible to admin users
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
  // Check if user is logged in and has admin role
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Forbidden - Admin access required');
  }

  const userId = params.id;

  try {
    // Verify the user exists
    const targetUser = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, userId)
    });

    if (!targetUser) {
      throw error(404, 'User not found');
    }

    // Get pagination parameters from URL with validation
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get('limit') || '5')));
    const offset = (page - 1) * limit;

    // First, fetch just the post IDs and basic info without media
    const postBasics = await db.select({
      id: post.id,
      text: post.text,
      authorId: post.authorId,
      createdAt: post.createdAt,
      authorName: user.username,
    })
    .from(post)
    .innerJoin(user, eq(post.authorId, user.id))
    .where(eq(post.authorId, userId))
    .orderBy(desc(post.createdAt))
    .offset(offset)
    .limit(limit + 1); // Fetch one extra to check if there are more

    // Check if there are more posts
    const hasMore = postBasics.length > limit;

    // Remove the extra post if we fetched more than our limit
    const postsToUse = hasMore ? postBasics.slice(0, limit) : postBasics;

    // If we have posts, fetch their media separately
    const postsWithMedia = [];

    for (const postItem of postsToUse) {
      const mediaItems = await db.select().from(media)
        .where(eq(media.postId, postItem.id))
        .orderBy(media.position);

      postsWithMedia.push({
        id: postItem.id,
        text: postItem.text,
        createdAt: postItem.createdAt,
        author: {
          id: postItem.authorId,
          username: postItem.authorName
        },
        media: mediaItems
      });
    }

    return json({
      posts: postsWithMedia,
      hasMore,
      pagination: {
        page,
        limit,
        offset
      }
    });
  } catch (err) {
    console.error('Error fetching user posts:', err);
    
    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    
    throw error(500, 'Failed to fetch user posts');
  }
};
