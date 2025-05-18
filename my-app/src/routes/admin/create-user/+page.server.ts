import { fail, redirect } from '@sveltejs/kit';
import type { Actions, RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { Argon2id } from 'oslo/password';
import { user, auditLog } from '$lib/server/db/schema';
import { nanoid } from 'nanoid';
import { generateUserId } from '$lib/server/utils/id-generator';

export async function load(event: RequestEvent) {
  // Only allow if logged in AND has role=admin
  if (!event.locals.user || event.locals.user.role !== 'admin') {
    throw redirect(302, '/login');
  }
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'admin') {
      throw redirect(302, '/login');
    }
    const form = await request.formData();
    const username = String(form.get('username') ?? '');
    const password = String(form.get('password') ?? '');
    const role = String(form.get('role') ?? 'user');

    if (!username || !password) {
      return fail(400, { message: 'Missing username or password' });
    }

    // Hash password
    const hash = await new Argon2id().hash(password);

    try {
      // Generate a new user ID that includes the username
      const newUserId = generateUserId(username);

      // Create the user
      await db.insert(user).values({
        id: newUserId,
        username,
        passwordHash: hash,
        role,
        isActive: true,
        createdAt: new Date()
      });

      // Log the user creation in audit log
      await db.insert(auditLog).values({
        id: nanoid(),
        userId: locals.user.id,
        action: 'CREATE_USER',
        targetTable: 'user',
        targetId: newUserId,
        details: JSON.stringify({
          createdByUserId: locals.user.id,
          createdUsername: username,
          assignedRole: role,
          timestamp: new Date().toISOString()
        }),
        timestamp: new Date()
      });

      return { success: true };
    } catch (e) {
      console.error('Error creating user:', e);
      return fail(400, { message: 'Failed to create user (maybe that username exists?)' });
    }
  }
};
