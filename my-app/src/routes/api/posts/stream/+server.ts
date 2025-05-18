import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { post, media, user } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
  // Get pagination parameters from URL
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '5');
  const offset = (page - 1) * limit;

  // Create a ReadableStream to stream posts as they're fetched
  const stream = new ReadableStream({
    async start(controller) {
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

        // Send metadata first
        controller.enqueue(
          new TextEncoder().encode(
            JSON.stringify({
              type: 'metadata',
              hasMore,
              total: postsToUse.length
            }) + '\n'
          )
        );

        // Process each post individually
        for (const postInfo of postsToUse) {
          // Fetch media for this post
          const mediaItems = await db.select()
            .from(media)
            .where(eq(media.postId, postInfo.id))
            .orderBy(media.position);

          // Construct the full post object
          const fullPost = {
            id: postInfo.id,
            text: postInfo.text,
            authorId: postInfo.authorId,
            createdAt: postInfo.createdAt,
            author: {
              id: postInfo.authorId,
              username: postInfo.authorName
            },
            media: mediaItems
          };

          // Send this post immediately
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                type: 'post',
                post: fullPost
              }) + '\n'
            )
          );

          // Small delay to allow browser to process
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Signal completion
        controller.enqueue(
          new TextEncoder().encode(
            JSON.stringify({
              type: 'complete'
            }) + '\n'
          )
        );

        controller.close();
      } catch (error) {
        console.error('Error streaming posts:', error);
        controller.enqueue(
          new TextEncoder().encode(
            JSON.stringify({
              type: 'error',
              message: 'Failed to load posts'
            }) + '\n'
          )
        );
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache'
    }
  });
};
