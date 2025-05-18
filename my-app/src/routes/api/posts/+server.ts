import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { post, media, user } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * API endpoint for fetching paginated posts
 * Supports pagination with page and limit parameters
 */
export const GET: RequestHandler = async ({ url }) => {
  // Get pagination parameters from URL with validation
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get('limit') || '5')));
  const offset = (page - 1) * limit;

  try {
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
    // No isDeleted filter - using hard deletion
    .orderBy(desc(post.createdAt))
    .offset(offset)
    .limit(limit + 1); // Fetch one extra to check if there are more

    // Check if there are more posts
    const hasMore = postBasics.length > limit;

    // Remove the extra post if we fetched more than our limit
    const postsToUse = hasMore ? postBasics.slice(0, limit) : postBasics;

    // If we have posts, fetch their media separately
    const postsWithMedia = [];

    for (const postInfo of postsToUse) {
      // Fetch media for this post
      const mediaItems = await db.select()
        .from(media)
        .where(eq(media.postId, postInfo.id))
        .orderBy(media.position);

      // Construct the full post object
      postsWithMedia.push({
        id: postInfo.id,
        text: postInfo.text,
        authorId: postInfo.authorId,
        createdAt: postInfo.createdAt,
        author: {
          id: postInfo.authorId,
          username: postInfo.authorName
        },
        media: mediaItems
      });
    }

    // Return posts with comprehensive cache control headers
    return json({
      posts: postsWithMedia,
      hasMore
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (err) {
    console.error('Error fetching posts from API:', err);
    // Return empty result with cache control headers
    return json({
      posts: [],
      hasMore: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
};
