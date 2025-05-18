import { db } from './index';
import { sql } from 'drizzle-orm';
import Database from 'better-sqlite3';

/**
 * Apply manual migrations to the database
 */
export async function applyMigrations() {
  console.log('Applying manual migrations...');

  try {
    // Get the database path from the environment
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './data.db';
    console.log(`Using database at: ${dbPath}`);

    // Create a direct connection to the SQLite database
    const sqlite = new Database(dbPath);

    // Check if is_deleted column exists in post table
    const tableInfo = sqlite.prepare('PRAGMA table_info(post)').all();
    const hasIsDeletedColumn = tableInfo.some((column: any) => column.name === 'is_deleted');

    if (hasIsDeletedColumn) {
      console.log('Removing is_deleted column from post table...');

      // Run the migration as a transaction
      sqlite.exec(`
        PRAGMA foreign_keys=OFF;

        BEGIN TRANSACTION;

        CREATE TABLE __new_post (
          id TEXT PRIMARY KEY NOT NULL,
          author_id TEXT NOT NULL,
          text TEXT,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
          FOREIGN KEY (author_id) REFERENCES user(id)
        );

        INSERT INTO __new_post (id, author_id, text, created_at, updated_at)
        SELECT id, author_id, text, created_at, updated_at
        FROM post;

        DROP TABLE post;

        ALTER TABLE __new_post RENAME TO post;

        COMMIT;

        PRAGMA foreign_keys=ON;
      `);

      console.log('Migration completed successfully');
    } else {
      console.log('is_deleted column does not exist, no migration needed');
    }

    // Close the database connection
    sqlite.close();
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
