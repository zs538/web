import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/server/auth/lucia';

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(auth.sessionCookieName);
  
  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const { user, session } = await auth.validateSession(sessionId);
  
  if (session && session.fresh) {
    const sessionCookie = auth.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });
  } else if (!session) {
    const sessionCookie = auth.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes
    });
  }

  event.locals.user = user;
  event.locals.session = session;
  return resolve(event);
};
