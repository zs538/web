import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { protectRouteWithRole } from '$lib/server/auth/protect';
import { db } from '$lib/server/db';
import { auditLog, user } from '$lib/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

/**
 * Server load function for the audit log page
 * Fetches initial audit logs for server-side rendering
 * Protected route - only accessible to admin users
 */
export const load: PageServerLoad = async (event) => {
  // Set cache control headers to prevent caching
  event.setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // Ensure user is logged in and has admin role
  protectRouteWithRole(event, ['admin']);

  // Get initial logs for server-side rendering
  const logs = await db.select({
    id: auditLog.id,
    userId: auditLog.userId,
    username: user.username,
    action: auditLog.action,
    targetTable: auditLog.targetTable,
    targetId: auditLog.targetId,
    details: auditLog.details,
    timestamp: auditLog.timestamp
  })
  .from(auditLog)
  .leftJoin(user, eq(auditLog.userId, user.id))
  .orderBy(desc(auditLog.timestamp))
  .limit(15);

  // Get unique actions and target tables for filter dropdowns
  const [actions, targetTables, totalCountResult] = await Promise.all([
    db.selectDistinct({ action: auditLog.action }).from(auditLog),
    db.selectDistinct({ targetTable: auditLog.targetTable }).from(auditLog),
    db.select({ count: sql<number>`count(*)` }).from(auditLog)
  ]);

  // Get total count safely
  const totalCount = totalCountResult && totalCountResult[0] &&
    typeof totalCountResult[0].count !== 'undefined' ?
    Number(totalCountResult[0].count) : 0;

  return {
    logs,
    filterOptions: {
      actions: actions.map(a => a.action).sort(),
      targetTables: targetTables.map(t => t.targetTable).sort()
    },
    totalCount
  };
};
