import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { chatMessage } from '$lib/server/db/schema';
import { nanoid } from 'nanoid';

/**
 * POST endpoint for sending chat messages
 * Protected endpoint - only accessible to logged-in users
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  // Check if user is logged in
  if (!locals.user) {
    throw error(401, 'Unauthorized - Login required');
  }

  try {
    const { message } = await request.json();

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw error(400, 'Message is required and cannot be empty');
    }

    if (message.length > 1000) {
      throw error(400, 'Message is too long (max 1000 characters)');
    }

    // Create new chat message
    const newMessage = await db.insert(chatMessage).values({
      id: nanoid(),
      authorId: locals.user.id,
      message: message.trim(),
      createdAt: new Date()
    }).returning();

    return json({
      success: true,
      message: newMessage[0]
    });

  } catch (err) {
    console.error('Error sending chat message:', err);

    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    throw error(500, 'Failed to send message');
  }
};
