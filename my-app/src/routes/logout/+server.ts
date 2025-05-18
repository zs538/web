// routes/logout/+server.ts
import { auth } from '$lib/server/auth/lucia';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async ({ locals, cookies }) => {
  // Get the current session
  const session = locals.session;

  if (!session) {
    // If no session exists, redirect to home
    throw redirect(302, '/');
  }

  // Get user information before invalidating the session
  const userId = locals.user?.id;
  const username = locals.user?.username;

  // Invalidate the session
  await auth.invalidateSession(session.id);

  // Remove the session cookie
  const sessionCookie = auth.createBlankSessionCookie();
  cookies.set(sessionCookie.name, sessionCookie.value, {
    path: '/',
    ...sessionCookie.attributes
  });

  // Log the logout action in the audit log if we have a user ID
  if (userId) {
    await db.insert(auditLog).values({
      id: nanoid(),
      userId: userId,
      action: 'LOGOUT',
      targetTable: 'user',
      targetId: userId,
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
        username: username
      }),
      timestamp: new Date()
    });
  }

  // Clear locals
  locals.user = null;
  locals.session = null;

  // Redirect to home page after logout
  throw redirect(302, '/');
};