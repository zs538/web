import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { protectRoute } from '$lib/server/auth/protect';
import { db } from '$lib/server/db';
import { post, media } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// Protect this route - only logged in users can access
export const load: PageServerLoad = async (event) => {
  // Ensure user is logged in
  protectRoute(event);
  
  const { locals } = event;
  const userId = locals.user?.id;

  if (!userId) {
    throw redirect(302, '/login');
  }

  // Fetch only posts by the current user, newest first
  const userPosts = await db.query.post.findMany({
    orderBy: [desc(post.createdAt)],
    with: {
      author: true,
      media: { orderBy: [media.position] },
    },
    where: (fields, { eq, and }) => 
      and(
        eq(fields.authorId, userId),
        eq(fields.isDeleted, false)
      ),
  });

  return { 
    posts: userPosts,
    user: locals.user
  };
};
