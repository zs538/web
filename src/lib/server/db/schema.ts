import {
	sqliteTable,
	text,
	integer
  } from 'drizzle-orm/sqlite-core';

  import { sql } from 'drizzle-orm';

  
  // --- User Table ---
  export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	bio: text('bio'),
	avatarUrl: text('avatar_url'),
	role: text('role').notNull().default('user'), // 'user', 'admin'
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
  });
  
  // --- Session Table ---
  export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
  });
  
  // --- Post Table ---
  export const post = sqliteTable('post', {
	id: text('id').primaryKey(),
	authorId: text('author_id').notNull().references(() => user.id),
	text: text('text'), // main post body, can be empty if just media
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
	isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false)
  });
  
  // --- Media Table ---
  export const media = sqliteTable('media', {
	id: text('id').primaryKey(),
	postId: text('post_id').notNull().references(() => post.id),
	type: text('type').notNull(), // 'image', 'audio', 'video'
	url: text('url').notNull(),
	caption: text('caption'),
	position: integer('position').notNull(), // for ordering, 0-3 if up to 4 per post
	uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
  });
  
  // --- Comment Table ---
  export const comment = sqliteTable('comment', {
	id: text('id').primaryKey(),
	postId: text('post_id').notNull().references(() => post.id),
	authorId: text('author_id').notNull().references(() => user.id),
	content: text('content').notNull(),
	parentId: text('parent_id'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
	isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false)
  });
  
  // --- Audit Log Table ---
  export const auditLog = sqliteTable('audit_log', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	action: text('action').notNull(),
	targetTable: text('target_table').notNull(),
	targetId: text('target_id').notNull(),
	details: text('details'),
	timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
  });
  
  // --- Types ---
  export type User = typeof user.$inferSelect;
  export type Session = typeof session.$inferSelect;
  export type Post = typeof post.$inferSelect;
  export type Media = typeof media.$inferSelect;
  export type Comment = typeof comment.$inferSelect;
  export type AuditLog = typeof auditLog.$inferSelect;