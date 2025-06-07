import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user, auditLog } from '$lib/server/db/schema';
import { desc, like, asc, eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { generateUserId } from '$lib/server/utils/id-generator';

/**
 * API endpoint for fetching users
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

    // Calculate default rows if not provided
    function calculateDefaultRows() {
      const assumedViewportHeight = 900;
      let otherElementsHeight = 64 + 53 + 60 + 55 + 50 + 30 + 60; // 372px
      const availableHeight = assumedViewportHeight - otherElementsHeight;
      const rowHeight = 36;
      const maxRows = Math.floor(availableHeight / rowHeight);
      return Math.max(2, maxRows).toString();
    }

    // Get pagination parameters
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || calculateDefaultRows())));
    const offset = (page - 1) * limit;

    // Get filter parameters
    const role = url.searchParams.get('role') || '';
    const status = url.searchParams.get('status') || '';

    // Get sort parameters
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // Build the base query
    let query = db.select().from(user);

    // Build the count query (for total records)
    let countQuery = db.select({
      count: sql<number>`count(*)`
    }).from(user);

    // Build conditions array
    const conditions = [];

    // Add search filter if provided
    if (search) {
      conditions.push(like(user.username, `%${search}%`));
    }

    // Add role filter if provided
    if (role && role !== 'all') {
      conditions.push(eq(user.role, role));
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      const isActive = status === 'active';
      conditions.push(eq(user.isActive, isActive));
    }

    // Apply conditions to both queries
    if (conditions.length > 0) {
      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    // Add sorting
    if (sortOrder === 'asc') {
      if (sortBy === 'username') {
        query = query.orderBy(asc(user.username));
      } else if (sortBy === 'role') {
        query = query.orderBy(asc(user.role));
      } else {
        query = query.orderBy(asc(user.createdAt));
      }
    } else {
      if (sortBy === 'username') {
        query = query.orderBy(desc(user.username));
      } else if (sortBy === 'role') {
        query = query.orderBy(desc(user.role));
      } else {
        query = query.orderBy(desc(user.createdAt));
      }
    }

    // Add pagination
    query = query.limit(limit).offset(offset);

    // Execute queries
    const [users, countResult] = await Promise.all([
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
      users: users || [],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    throw error(500, 'Failed to fetch users');
  }
};

/**
 * API endpoint for creating a new user
 * Protected endpoint - only accessible to admin users
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  // Check if user is logged in and has admin role
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Forbidden - Admin access required');
  }

  try {
    const { username, password, role } = await request.json();

    // Validate input
    if (!username || typeof username !== 'string') {
      throw error(400, 'Username is required');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw error(400, 'Password must be at least 6 characters');
    }

    if (role !== 'user' && role !== 'admin') {
      throw error(400, 'Role must be either "user" or "admin"');
    }

    // Check if username already exists
    const existingUser = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.username, username)
    });

    if (existingUser) {
      throw error(400, 'Username already exists');
    }

    // Hash password
    const { Argon2id } = await import('oslo/password');
    const hasher = new Argon2id();
    const passwordHash = await hasher.hash(password);

    // Generate a new user ID that includes the username
    const newUserId = generateUserId(username);

    // Create new user
    const newUser = await db.insert(user).values({
      id: newUserId,
      username,
      passwordHash,
      role,
      isActive: true,
      createdAt: new Date()
    }).returning();

    // Log the user creation in audit log
    await db.insert(auditLog).values({
      id: nanoid(),
      userId: locals.user.id,
      action: 'CREATE_USER',
      targetTable: 'user',
      targetId: newUserId,
      details: JSON.stringify({
        createdByUserId: locals.user.id,
        createdUsername: username,
        assignedRole: role,
        timestamp: new Date().toISOString()
      }),
      timestamp: new Date()
    });

    return json({
      message: `User "${username}" created successfully`,
      user: newUser[0]
    });
  } catch (err) {
    console.error('Error creating user:', err);

    // If the error is already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    throw error(500, 'Failed to create user');
  }
};
