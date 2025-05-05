import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Create the SQLite database instance
export const sqlite = new Database('my-app.sqlite');
// Create the Drizzle ORM wrapper
export const db = drizzle(sqlite, { schema });