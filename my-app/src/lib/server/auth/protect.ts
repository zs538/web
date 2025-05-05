import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export function protectRoute(event: RequestEvent) {
  if (!event.locals.user) {
    const returnTo = encodeURIComponent(event.url.pathname);
    throw redirect(302, `/login?returnTo=${returnTo}`);
  }
}

export function protectRouteWithRole(event: RequestEvent, allowedRoles: string[]) {
  protectRoute(event);
  
  const userRole = event.locals.user?.role;
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw redirect(302, '/unauthorized');
  }
}
