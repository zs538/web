// routes/logout/+server.ts
import { auth } from '$lib/server/auth/lucia';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies }) => {
  // Get the current session
  const session = locals.session;
  
  if (!session) {
    // If no session exists, redirect to home
    throw redirect(302, '/');
  }

  // Invalidate the session
  await auth.invalidateSession(session.id);
  
  // Remove the session cookie
  const sessionCookie = auth.createBlankSessionCookie();
  cookies.set(sessionCookie.name, sessionCookie.value, {
    path: '/',
    ...sessionCookie.attributes
  });

  // Clear locals
  locals.user = null;
  locals.session = null;
  
  // Redirect to home page after logout
  throw redirect(302, '/');
};