import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function load(event: RequestEvent) {
  if (!event.locals.user) {
    throw redirect(302, '/login');
  }
  
  return {
    user: event.locals.user
  };
}
