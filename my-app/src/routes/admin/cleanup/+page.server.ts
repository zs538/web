import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { post } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Protect this route - only admins can access
export const load: PageServerLoad = async (event) => {
  // Check if user is logged in and is an admin
  if (!event.locals.user) {
    throw redirect(302, '/login');
  }

  if (event.locals.user.role !== 'admin') {
    throw redirect(302, '/unauthorized');
  }

  // Count how many posts are marked as deleted
  const deletedPosts = await db.select()
    .from(post)
    .where(eq(post.isDeleted, true));

  const deletedPostsCount = deletedPosts.length;

  return {
    deletedPostsCount,
    user: event.locals.user
  };
};
