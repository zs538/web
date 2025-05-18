import {
	sqliteTable,
	text,
	integer
  } from 'drizzle-orm/sqlite-core';
  import { sql } from 'drizzle-orm';
  import { relations } from 'drizzle-orm';

  // --- User Table (minimal, manual management) ---
  export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	role: text('role').notNull().default('user'), // 'user', 'admin'
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
	text: text('text'), // post text; can be empty
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
	// No isDeleted flag - using hard deletion instead
  });

  // --- Media Table (with embed support) ---
  export const media = sqliteTable('media', {
	id: text('id').primaryKey(),
	postId: text('post_id').notNull().references(() => post.id),
	type: text('type').notNull(), // 'image', 'audio', 'video', 'embed'
	url: text('url').notNull(),    // direct URL or embed source
	caption: text('caption'),
	position: integer('position').notNull(), // 0-3, for ordering media in post
	uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
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
  export type AuditLog = typeof auditLog.$inferSelect;

  // --- Relations ---
  export const postRelations = relations(post, ({ one, many }) => ({
	author: one(user, {
	  fields: [post.authorId],
	  references: [user.id]
	}),
	media: many(media)
  }));

  export const mediaRelations = relations(media, ({ one }) => ({
	post: one(post, {
	  fields: [media.postId],
	  references: [post.id]
	})
  }));
