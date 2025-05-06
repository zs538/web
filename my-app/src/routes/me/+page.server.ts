import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { post, media } from '$lib/server/db/schema'; // Adjust path if needed
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  // Protect this route - redirect to login if not authenticated
  if (!locals.user) {
    throw redirect(302, '/login');
  }
  
  // Load the user's posts with their media
  const userPosts = await db.query.post.findMany({
    where: (posts, { eq }) => eq(posts.authorId, locals.user.id),
    orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    with: {
      media: {
        orderBy: (media, { asc }) => [asc(media.position)]
      }
    }
  });
  
  return {
    user: locals.user,
    posts: userPosts
  };
};

// Action to delete a post
export const actions = {
  deletePost: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(302, '/login');
    }
    
    const data = await request.formData();
    const postId = data.get('postId') as string;
    
    if (!postId) {
      return { success: false, message: 'Post ID is required' };
    }
    
    // First check if this post belongs to the user
    const existingPost = await db.query.post.findFirst({
      where: (posts, { eq, and }) => and(
        eq(posts.id, postId),
        eq(posts.authorId, locals.user.id)
      )
    });
    
    if (!existingPost) {
      return { success: false, message: 'Post not found or access denied' };
    }
    
    // Delete associated media first (foreign key constraint)
    await db.delete(media).where(eq(media.postId, postId));
    
    // Then delete the post
    await db.delete(post).where(eq(post.id, postId));
    
    return { success: true };
  }
};