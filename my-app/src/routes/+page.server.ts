import { db } from '$lib/server/db/index';
import { post, media, user } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function load() {
  // Initial batch size - just enough for fast loading
  const initialLimit = 2;

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
    .where(eq(post.isDeleted, false))
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
      pagination: {
        initialLimit,
        hasMore
      }
    };
  } catch (error) {
    console.error('Error loading posts:', error);
    // Return empty data to prevent 500 error
    return {
      posts: [],
      pagination: {
        initialLimit,
        hasMore: false
      }
    };
  }
}
