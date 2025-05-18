import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { protectRoute } from '$lib/server/auth/protect';
import { db } from '$lib/server/db';
import { post, media, user } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';

/**
 * Server load function for the user's posts page
 * Fetches an initial batch of the user's posts with their media
 * Protected route - only accessible to logged-in users
 */
export const load: PageServerLoad = async (event) => {
  // Set comprehensive cache control headers to prevent caching
  event.setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // Ensure user is logged in
  protectRoute(event);

  const { locals } = event;
  const userId = locals.user?.id;

  if (!userId) {
    throw redirect(302, '/login');
  }

  // Initial batch size - slightly increased but still reasonable
  const initialLimit = 5;

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
    .where(eq(post.authorId, userId))
    // No isDeleted filter - using hard deletion
    .orderBy(desc(post.createdAt))
    .limit(initialLimit + 1); // Fetch one extra to check if there are more

    // Check if there are more posts
    const hasMore = postBasics.length > initialLimit;

    // Remove the extra post if we fetched more than our limit
    const postsToUse = hasMore ? postBasics.slice(0, initialLimit) : postBasics;

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

    return {
      posts: postsWithMedia,
      user: locals.user,
      pagination: {
        initialLimit,
        hasMore
      }
    };
  } catch (error) {
    console.error('Error loading user posts:', error);
    // Return empty data to prevent 500 error
    return {
      posts: [],
      user: locals.user,
      pagination: {
        initialLimit,
        hasMore: false
      }
    };
  }
};
