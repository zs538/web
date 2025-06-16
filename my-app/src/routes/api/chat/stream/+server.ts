import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { chatMessage, user } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * GET endpoint for streaming chat messages
 * Protected endpoint - only accessible to logged-in users
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  // Check if user is logged in
  if (!locals.user) {
    throw error(401, 'Unauthorized - Login required');
  }

  // Get pagination parameters from URL
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Create a ReadableStream to stream messages as they're fetched
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Fetch recent chat messages with author information
        const messages = await db.select({
          id: chatMessage.id,
          message: chatMessage.message,
          authorId: chatMessage.authorId,
          createdAt: chatMessage.createdAt,
          authorName: user.username,
        })
        .from(chatMessage)
        .innerJoin(user, eq(chatMessage.authorId, user.id))
        .orderBy(desc(chatMessage.createdAt))
        .offset(offset)
        .limit(limit);

        // Send metadata first
        controller.enqueue(
          new TextEncoder().encode(
            JSON.stringify({
              type: 'metadata',
              total: messages.length
            }) + '\n'
          )
        );

        // Process each message individually (reverse order to show oldest first)
        for (const messageInfo of messages.reverse()) {
          // Construct the full message object
          const fullMessage = {
            id: messageInfo.id,
            message: messageInfo.message,
            authorId: messageInfo.authorId,
            createdAt: messageInfo.createdAt,
            author: {
              id: messageInfo.authorId,
              username: messageInfo.authorName
            }
          };

          // Send this message immediately
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({
                type: 'message',
                message: fullMessage
              }) + '\n'
            )
          );

          // Small delay to allow browser to process
          await new Promise(resolve => setTimeout(resolve, 5));
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
        console.error('Error streaming chat messages:', error);
        controller.enqueue(
          new TextEncoder().encode(
            JSON.stringify({
              type: 'error',
              message: 'Failed to load messages'
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
