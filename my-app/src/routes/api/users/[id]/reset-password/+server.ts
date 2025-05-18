import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user, auditLog, session } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Generate a random password
 * Creates a secure random password with letters, numbers, and special characters
 */
function generateRandomPassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let password = '';

  // Generate cryptographically secure random values
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  // Convert random values to characters from our charset
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }

  return password;
}

/**
 * POST endpoint for resetting a user's password
 * Protected endpoint - only accessible to admin users
 */
export const POST: RequestHandler = async ({ params, locals }) => {
  // Check if user is logged in and has admin role
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Forbidden - Admin access required');
  }

  const userId = params.id;

  try {
    // Fetch the user to make sure they exist
    const userToUpdate = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, userId)
    });

    if (!userToUpdate) {
      throw error(404, 'User not found');
    }

    // Generate a new random password
    const newPassword = generateRandomPassword();

    // Hash the new password
    const { Argon2id } = await import('oslo/password');
    const hasher = new Argon2id();
    const passwordHash = await hasher.hash(newPassword);

    // Start a transaction to update password and invalidate sessions
    await db.transaction(async (tx) => {
      // Update the user's password
      await tx.update(user)
        .set({ passwordHash })
        .where(eq(user.id, userId));

      // Invalidate all sessions for this user for security
      await tx.delete(session).where(eq(session.userId, userId));

      // Log the password reset in audit log
      await tx.insert(auditLog).values({
        id: nanoid(),
        userId: locals.user.id,
        action: 'RESET_PASSWORD',
        targetTable: 'user',
        targetId: userId,
        details: JSON.stringify({
          resetByUserId: locals.user.id,
          timestamp: new Date().toISOString()
        }),
        timestamp: new Date()
      });
    });

    return json({
      success: true,
      message: `Password for user "${userToUpdate.username}" has been reset`,
      newPassword // Return the new password so it can be shown to the admin
    });
  } catch (err) {
    console.error('Error resetting password:', err);

    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    throw error(500, 'Failed to reset password');
  }
};
