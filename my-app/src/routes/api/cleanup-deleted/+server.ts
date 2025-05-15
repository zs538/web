import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { post, media } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Simple endpoint to clean up soft-deleted posts
// This is a direct approach without complex authorization
export const GET: RequestHandler = async () => {
  try {
    // 1. Find all posts marked as deleted
    const postsToDelete = await db.select()
      .from(post)
      .where(eq(post.isDeleted, true));

    if (postsToDelete.length === 0) {
      return json({
        success: true,
        message: 'No soft-deleted posts found to clean up',
        count: 0
      });
    }

    // 2. Process each post individually
    const results = [];
    
    for (const postToDelete of postsToDelete) {
      try {
        // Delete media for this post
        await db.delete(media)
          .where(eq(media.postId, postToDelete.id));
        
        // Delete the post itself
        await db.delete(post)
          .where(eq(post.id, postToDelete.id));
        
        results.push({
          id: postToDelete.id,
          success: true
        });
      } catch (err) {
        console.error(`Error deleting post ${postToDelete.id}:`, err);
        results.push({
          id: postToDelete.id,
          success: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    // 3. Return results
    const successCount = results.filter(r => r.success).length;
    
    return json({
      success: true,
      message: `Processed ${results.length} posts, successfully deleted ${successCount}`,
      totalProcessed: results.length,
      successfullyDeleted: successCount,
      details: results
    });
  } catch (err) {
    console.error('Error in cleanup operation:', err);
    return json({
      success: false,
      message: 'Error in cleanup operation',
      error: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
};
