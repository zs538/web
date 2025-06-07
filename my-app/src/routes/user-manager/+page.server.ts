import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { protectRouteWithRole } from '$lib/server/auth/protect';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { desc, sql } from 'drizzle-orm';

// Protect this route - only admin users can access
export const load: PageServerLoad = async (event) => {
  // Ensure user is logged in and has admin role
  protectRouteWithRole(event, ['admin']);

  // Get total count for pagination - this is all we need for initial render
  const totalCountResult = await db.select({ count: sql<number>`count(*)` }).from(user);
  const totalCount = totalCountResult && totalCountResult[0] &&
    typeof totalCountResult[0].count !== 'undefined' ?
    Number(totalCountResult[0].count) : 0;

  return {
    users: [], // Start with empty array - client will fetch based on actual viewport
    totalCount
  };
};
