import type { PageServerLoad } from './$types';
import { protectRoute } from '$lib/server/auth/protect';

// Protect this route - only logged in users can access
export const load: PageServerLoad = async (event) => {
  protectRoute(event);
  return {};
};
