import { auth } from '$lib/server/auth/lucia';
import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
  const { locals, cookies } = event;
  
  if (locals.session) {
    await auth.invalidateSession(locals.session.id);
  }
  
  const sessionCookie = auth.createBlankSessionCookie();
  cookies.set(sessionCookie.name, sessionCookie.value, {
    path: '/',
    ...sessionCookie.attributes
  });
  
  throw redirect(303, '/login');
}
