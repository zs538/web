import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user, session, auditLog, post, media } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * GET endpoint for fetching a single user
 * Protected endpoint - only accessible to admin users
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  // Check if user is logged in and has admin role
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Forbidden - Admin access required');
  }

  const userId = params.id;

  try {
    // Fetch the user
    const foundUser = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, userId)
    });

    if (!foundUser) {
      throw error(404, 'User not found');
    }

    return json({ user: foundUser });
  } catch (err) {
    console.error('Error fetching user:', err);

    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    throw error(500, 'Failed to fetch user');
  }
};

/**
 * DELETE endpoint for deleting a user
 * Protected endpoint - only accessible to admin users
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
  // Check if user is logged in and has admin role
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Forbidden - Admin access required');
  }

  const userId = params.id;

  // Prevent deleting yourself
  if (userId === locals.user.id) {
    throw error(400, 'Cannot delete your own account');
  }

  try {
    // Fetch the user to make sure they exist
    const userToDelete = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, userId)
    });

    if (!userToDelete) {
      throw error(404, 'User not found');
    }

    // Start a transaction to ensure all related data is deleted
    await db.transaction(async (tx) => {
      try {
        // 1. Get all post IDs by this user
        const userPosts = await db.select({ id: post.id })
          .from(post)
          .where(eq(post.authorId, userId));

        const postIds = userPosts.map(p => p.id);

        // 2. For each post by this user, delete associated media
        for (const postId of postIds) {
          try {
            await tx.delete(media).where(eq(media.postId, postId));
          } catch (mediaErr) {
            console.log(`Error deleting media for post ${postId}:`, mediaErr);
            // Continue with other posts
          }
        }

        // 3. Delete all posts by this user
        await tx.delete(post).where(eq(post.authorId, userId));

        // 4. Delete all sessions for this user
        await tx.delete(session).where(eq(session.userId, userId));

        // 5. Delete audit logs where this user is referenced
        // Note: We need to handle this carefully to avoid deleting the current admin's actions
        // Only delete logs where the deleted user is the actor (userId), not the target
        await tx.delete(auditLog).where(eq(auditLog.userId, userId));

        // 6. Log the deletion in audit log
        await tx.insert(auditLog).values({
          id: nanoid(),
          userId: locals.user.id,
          action: 'DELETE_USER',
          targetTable: 'user',
          targetId: userId,
          details: JSON.stringify({
            deletedUsername: userToDelete.username,
            deletedByUserId: locals.user.id,
            deletedPostCount: postIds.length
          }),
          timestamp: new Date()
        });

        // 7. Finally, delete the user
        await tx.delete(user).where(eq(user.id, userId));
      } catch (txErr) {
        console.error('Error in delete transaction:', txErr);
        throw txErr; // Re-throw to be caught by the outer try-catch
      }
    });

    return json({
      success: true,
      message: `User "${userToDelete.username}" has been deleted`
    });
  } catch (err) {
    console.error('Error deleting user:', err);

    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    // Check for SQLite constraint errors
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('FOREIGN KEY constraint failed')) {
      console.error('Foreign key constraint error when deleting user. This might indicate there are still references to this user in the database.');
      throw error(500, 'Failed to delete user: Database constraint error. There might be data still linked to this user.');
    }

    throw error(500, 'Failed to delete user: ' + errorMessage);
  }
};

/**
 * PATCH endpoint for updating a user
 * Protected endpoint - only accessible to admin users
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  // Check if user is logged in and has admin role
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Forbidden - Admin access required');
  }

  const userId = params.id;

  try {
    const updates = await request.json();

    // Fetch the user to make sure they exist
    const userToUpdate = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, userId)
    });

    if (!userToUpdate) {
      throw error(404, 'User not found');
    }

    // Validate updates
    const validUpdates: any = {};

    if ('isActive' in updates && typeof updates.isActive === 'boolean') {
      validUpdates.isActive = updates.isActive;
    }

    if ('role' in updates) {
      // Only allow valid roles
      if (updates.role !== 'user' && updates.role !== 'admin') {
        throw error(400, 'Role must be either "user" or "admin"');
      }

      // Prevent removing your own admin role
      if (userId === locals.user.id && updates.role !== 'admin' && userToUpdate.role === 'admin') {
        throw error(400, 'Cannot remove your own admin role');
      }

      validUpdates.role = updates.role;
    }

    // If there are no valid updates, return an error
    if (Object.keys(validUpdates).length === 0) {
      throw error(400, 'No valid updates provided');
    }

    // Update the user
    await db.update(user)
      .set(validUpdates)
      .where(eq(user.id, userId));

    // Log the update in audit log
    await db.insert(auditLog).values({
      id: nanoid(),
      userId: locals.user.id,
      action: 'UPDATE_USER',
      targetTable: 'user',
      targetId: userId,
      details: JSON.stringify({
        updatedFields: Object.keys(validUpdates),
        updatedByUserId: locals.user.id
      }),
      timestamp: new Date()
    });

    return json({
      success: true,
      message: `User "${userToUpdate.username}" has been updated`
    });
  } catch (err) {
    console.error('Error updating user:', err);

    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    throw error(500, 'Failed to update user');
  }
};
