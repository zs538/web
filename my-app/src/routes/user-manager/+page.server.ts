import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { protectRouteWithRole } from '$lib/server/auth/protect';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

// Protect this route - only admin users can access
export const load: PageServerLoad = async (event) => {
  // Ensure user is logged in and has admin role
  protectRouteWithRole(event, ['admin']);

  // Get initial users for server-side rendering
  const users = await db.query.user.findMany({
    orderBy: [desc(user.createdAt)],
    limit: 20
  });

  return {
    users
  };
};
