import { auth } from '$lib/server/auth/lucia';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { Argon2id } from 'oslo/password';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { nanoid } from 'nanoid';

// Redirect to main feed if already logged in
export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(302, '/');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const username = form.get('username');
    const password = form.get('password');

    // Validate input
    if (typeof username !== 'string' || username.length < 1) {
      return fail(400, { message: 'Username must be at least 1 character' });
    }
    if (typeof password !== 'string' || password.length < 1) {
      return fail(400, { message: 'Password must be at least 1 character' });
    }

    // Find user
    const existingUser = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.username, username)
    });

    if (!existingUser) {
      return fail(400, { message: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await new Argon2id().verify(
      existingUser.passwordHash,
      password
    );
    if (!validPassword) {
      return fail(400, { message: 'Invalid credentials' });
    }

    // Create session
    const session = await auth.createSession(existingUser.id, {});
    const sessionCookie = auth.createSessionCookie(session.id);

    cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      {
        path: '/',
        ...sessionCookie.attributes
      }
    );

    // Log the login action in the audit log
    await db.insert(auditLog).values({
      id: nanoid(),
      userId: existingUser.id,
      action: 'LOGIN',
      targetTable: 'user',
      targetId: existingUser.id,
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
        username: existingUser.username
      }),
      timestamp: new Date()
    });

    // Redirect to main feed after login
    throw redirect(303, '/');
  }
};
