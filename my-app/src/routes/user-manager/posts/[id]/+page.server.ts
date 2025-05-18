import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { protectRouteWithRole } from '$lib/server/auth/protect';
import { db } from '$lib/server/db';
import { post, media, user } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
  // Ensure user is logged in and has admin role
  protectRouteWithRole(event, ['admin']);

  const userId = event.params.id;

  try {
    // Fetch the user
    const targetUser = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, userId)
    });

    if (!targetUser) {
      throw error(404, 'User not found');
    }

    // Fetch the user's posts with media
    const posts = await db.select({
      id: post.id,
      text: post.text,
      authorId: post.authorId,
      createdAt: post.createdAt,
      author: {
        id: user.id,
        username: user.username
      }
    })
    .from(post)
    .innerJoin(user, eq(post.authorId, user.id))
    .where(eq(post.authorId, userId))
    .orderBy(desc(post.createdAt))
    .limit(20);

    // If we have posts, fetch their media separately
    const postsWithMedia = [];

    for (const postItem of posts) {
      const mediaItems = await db.select().from(media)
        .where(eq(media.postId, postItem.id))
        .orderBy(media.position);

      postsWithMedia.push({
        ...postItem,
        media: mediaItems
      });
    }

    return {
      targetUser: targetUser,
      currentUser: event.locals.user,
      posts: postsWithMedia
    };
  } catch (err) {
    console.error('Error loading user posts:', err);

    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    throw error(500, 'Failed to load user posts');
  }
};
