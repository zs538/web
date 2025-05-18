import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user, session, auditLog } from '$lib/server/db/schema';
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
      // Delete all sessions for this user
      await tx.delete(session).where(eq(session.userId, userId));

      // Log the deletion in audit log
      await tx.insert(auditLog).values({
        id: nanoid(),
        userId: locals.user.id,
        action: 'DELETE_USER',
        targetTable: 'user',
        targetId: userId,
        details: JSON.stringify({
          deletedUsername: userToDelete.username,
          deletedByUserId: locals.user.id
        }),
        timestamp: new Date()
      });

      // Finally, delete the user
      await tx.delete(user).where(eq(user.id, userId));
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

    throw error(500, 'Failed to delete user');
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
