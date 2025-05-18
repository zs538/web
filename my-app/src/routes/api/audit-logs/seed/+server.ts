import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { nanoid } from 'nanoid';

/**
 * API endpoint for seeding sample audit logs (for development only)
 * Protected endpoint - only accessible to admin users
 */
export const POST: RequestHandler = async ({ locals }) => {
  // Check if user is logged in and has admin role
  if (!locals.user || locals.user.role !== 'admin') {
    throw error(403, 'Forbidden - Admin access required');
  }

  try {
    // Sample actions
    const actions = [
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'RESET_PASSWORD',
      'CREATE_POST',
      'DELETE_POST',
      'PERMANENT_DELETE',
      'DELETE_ALL_USER_POSTS',
      'LOGIN',
      'LOGOUT'
    ];

    // Sample target tables
    const targetTables = [
      'user',
      'post',
      'session',
      'media'
    ];

    // Create 50 sample logs
    const sampleLogs = [];
    const now = new Date();

    for (let i = 0; i < 50; i++) {
      // Random date within the last 30 days
      const timestamp = new Date(now);
      timestamp.setDate(now.getDate() - Math.floor(Math.random() * 30));

      // Random action and target table
      const action = actions[Math.floor(Math.random() * actions.length)];
      const targetTable = targetTables[Math.floor(Math.random() * targetTables.length)];

      // Create sample log
      sampleLogs.push({
        id: nanoid(),
        userId: locals.user.id, // Use current admin user as the actor
        action,
        targetTable,
        targetId: nanoid(8), // Random target ID
        details: JSON.stringify({
          sample: true,
          timestamp: timestamp.toISOString(),
          note: `Sample ${action} on ${targetTable}`
        }),
        timestamp
      });
    }

    // Insert sample logs
    await db.insert(auditLog).values(sampleLogs);

    return json({
      success: true,
      message: `Created ${sampleLogs.length} sample audit logs`,
      count: sampleLogs.length
    });
  } catch (err) {
    console.error('Error seeding audit logs:', err);

    // If it's already a SvelteKit error, rethrow it
    if (err instanceof Error && 'status' in err) {
      throw err;
    }

    // Otherwise, return a generic error
    throw error(500, 'Failed to seed audit logs');
  }
};
