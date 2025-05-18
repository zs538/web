import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { auditLog, user } from '$lib/server/db/schema';
import { desc, asc, like, and, eq, gte, lte, sql } from 'drizzle-orm';

/**
 * API endpoint for fetching audit logs with pagination and filtering
 * Protected endpoint - only accessible to admin users
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  // Check if user is logged in and has admin role
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Forbidden - Admin access required');
  }

  try {
    // Get search query if any
    const search = url.searchParams.get('search') || '';

    // Get pagination parameters
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '15')));
    const offset = (page - 1) * limit;

    // Get filter parameters
    const action = url.searchParams.get('action') || '';
    const targetTable = url.searchParams.get('targetTable') || '';
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';

    // Get sort parameters
    const sortBy = url.searchParams.get('sortBy') || 'timestamp';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // Build the base query to get logs with user information
    let query = db.select({
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
    .leftJoin(user, eq(auditLog.userId, user.id));

    // Build the count query (for total records)
    let countQuery = db.select({
        count: sql<number>`count(*)`
      })
      .from(auditLog);

    // Add filters
    const conditions = [];

    // Search filter (across multiple columns)
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(
        sql`(${like(user.username, searchTerm)} OR
             ${like(auditLog.action, searchTerm)} OR
             ${like(auditLog.targetTable, searchTerm)} OR
             ${like(auditLog.targetId, searchTerm)} OR
             ${like(auditLog.details, searchTerm)})`
      );

      countQuery = countQuery.leftJoin(user, eq(auditLog.userId, user.id))
        .where(
          sql`(${like(user.username, searchTerm)} OR
               ${like(auditLog.action, searchTerm)} OR
               ${like(auditLog.targetTable, searchTerm)} OR
               ${like(auditLog.targetId, searchTerm)} OR
               ${like(auditLog.details, searchTerm)})`
        );
    }

    // Action filter
    if (action) {
      conditions.push(eq(auditLog.action, action));
    }

    // Target table filter
    if (targetTable) {
      conditions.push(eq(auditLog.targetTable, targetTable));
    }

    // Date range filter
    if (startDate) {
      const startDateTime = new Date(startDate);
      conditions.push(gte(auditLog.timestamp, startDateTime));
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      // Set time to end of day
      endDateTime.setHours(23, 59, 59, 999);
      conditions.push(lte(auditLog.timestamp, endDateTime));
    }

    // Apply all conditions if any
    if (conditions.length > 0) {
      const whereClause = and(...conditions);
      query = query.where(whereClause);

      // Also apply to count query
      if (!search) { // If search is already applied, we've already joined user table
        countQuery = countQuery.where(whereClause);
      } else {
        countQuery = countQuery.where(and(whereClause));
      }
    }

    // Apply sorting
    if (sortBy === 'username') {
      query = sortOrder === 'asc'
        ? query.orderBy(asc(user.username))
        : query.orderBy(desc(user.username));
    } else if (sortBy === 'action') {
      query = sortOrder === 'asc'
        ? query.orderBy(asc(auditLog.action))
        : query.orderBy(desc(auditLog.action));
    } else if (sortBy === 'targetTable') {
      query = sortOrder === 'asc'
        ? query.orderBy(asc(auditLog.targetTable))
        : query.orderBy(desc(auditLog.targetTable));
    } else {
      // Default: sort by timestamp
      query = sortOrder === 'asc'
        ? query.orderBy(asc(auditLog.timestamp))
        : query.orderBy(desc(auditLog.timestamp));
    }

    // Apply pagination
    query = query.limit(limit).offset(offset);

    // Execute queries
    const [logs, countResult] = await Promise.all([
      query,
      countQuery
    ]);

    // Get total count and handle potential undefined result
    const totalCount = countResult && countResult[0] && typeof countResult[0].count !== 'undefined'
      ? Number(countResult[0].count)
      : 0;

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    // Return the results
    return json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);

    // If it's already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    // Otherwise, return a generic error
    throw error(500, 'Failed to fetch audit logs');
  }
};
