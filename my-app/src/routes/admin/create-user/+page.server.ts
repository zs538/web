import { fail, redirect } from '@sveltejs/kit';
import type { Actions, RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { Argon2id } from 'oslo/password';
import { user } from '$lib/server/db/schema'; // Adjust path as needed

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
      await db.insert(user).values({
        id: crypto.randomUUID(),
        username,
        passwordHash: hash,
        role,
        isActive: true,
        createdAt: new Date()
      });
      return { success: true };
    } catch (e) {
      return fail(400, { message: 'Failed to create user (maybe that username exists?)' });
    }
  }
};
