import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { post, media, user, auditLog } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// DELETE endpoint for post deletion
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const postId = params.id;
  
  // Check if user is logged in
  if (!locals.user) {
    throw error(401, 'Unauthorized - You must be logged in to delete posts');
  }

  try {
    // Fetch the post to check ownership
    const postToDelete = await db.query.post.findFirst({
      where: (post, { eq }) => eq(post.id, postId),
      with: {
        author: true
      }
    });

    // Check if post exists
    if (!postToDelete) {
      throw error(404, 'Post not found');
    }

    // Check authorization:
    // 1. Admin can delete any post
    // 2. Regular user can only delete their own posts
    const isAdmin = locals.user.role === 'admin';
    const isAuthor = postToDelete.authorId === locals.user.id;

    if (!isAdmin && !isAuthor) {
      throw error(403, 'Forbidden - You do not have permission to delete this post');
    }

    // Soft delete the post by setting isDeleted to true
    await db.update(post)
      .set({ isDeleted: true })
      .where(eq(post.id, postId));

    // Log the deletion in audit log
    await db.insert(auditLog).values({
      id: nanoid(),
      userId: locals.user.id,
      action: 'DELETE',
      targetTable: 'post',
      targetId: postId,
      details: JSON.stringify({
        deletedBy: locals.user.id,
        deletedByRole: locals.user.role,
        isAuthorDelete: isAuthor
      }),
      timestamp: new Date()
    });

    return json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    
    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    
    // Otherwise, return a generic error
    throw error(500, 'Failed to delete post');
  }
};
