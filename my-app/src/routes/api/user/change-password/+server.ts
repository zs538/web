import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user, session, auditLog } from '$lib/server/db/schema';
import { eq, ne } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * POST endpoint for changing user password
 * Protected endpoint - only accessible to authenticated users for their own account
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  // Check if user is logged in
  if (!locals.user) {
    throw error(401, 'Unauthorized - Login required');
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || typeof currentPassword !== 'string') {
      throw error(400, 'Current password is required');
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw error(400, 'New password must be at least 6 characters long');
    }

    // Fetch the current user from database to get password hash
    const currentUser = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, locals.user.id)
    });

    if (!currentUser) {
      throw error(404, 'User not found');
    }

    // Verify current password
    const { Argon2id } = await import('oslo/password');
    const hasher = new Argon2id();
    const validPassword = await hasher.verify(currentUser.passwordHash, currentPassword);

    if (!validPassword) {
      throw error(400, 'Current password is incorrect');
    }

    // Hash the new password
    const newPasswordHash = await hasher.hash(newPassword);

    // Start a transaction to update password and invalidate other sessions
    await db.transaction(async (tx) => {
      // Update the user's password
      await tx.update(user)
        .set({ passwordHash: newPasswordHash })
        .where(eq(user.id, locals.user.id));

      // Invalidate all other sessions for this user for security
      // Keep the current session active so user doesn't get logged out
      if (locals.session) {
        await tx.delete(session)
          .where(eq(session.userId, locals.user.id))
          .where(ne(session.id, locals.session.id)); // Exclude current session
      }

      // Log the password change in audit log
      await tx.insert(auditLog).values({
        id: nanoid(),
        userId: locals.user.id,
        action: 'CHANGE_PASSWORD',
        targetTable: 'user',
        targetId: locals.user.id,
        details: JSON.stringify({
          timestamp: new Date().toISOString(),
          username: currentUser.username
        }),
        timestamp: new Date()
      });
    });

    return json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('Error changing password:', err);

    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    throw error(500, 'Failed to change password');
  }
};
