import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Redirect to login if not authenticated
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // Return user data for the settings page
  return {
    user: locals.user
  };
};
