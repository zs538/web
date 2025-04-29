import {
	mysqlTable,
	serial,
	text,
	int,
	varchar,
	datetime,
	tinyint
} from 'drizzle-orm/mysql-core';

import { sql } from 'drizzle-orm';


// --- User Table ---
export const user = mysqlTable('user', {
	id: varchar('id', { length: 255 }).primaryKey(),
	age: int('age'),
	username: varchar('username', { length: 32 }).notNull().unique(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	bio: text('bio'),
	avatarUrl: varchar('avatar_url', { length: 255 }),
	role: varchar('role', { length: 16 }).notNull().default('user'), // 'user', 'admin'
	isActive: tinyint('is_active').notNull().default(1),
	createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// --- Session Table ---
export const session = mysqlTable('session', {
	id: varchar('id', { length: 255 }).primaryKey(),
	userId: varchar('user_id', { length: 255 }).notNull().references(() => user.id),
	expiresAt: datetime('expires_at').notNull()
});

// --- Post Table ---
export const post = mysqlTable('post', {
	id: varchar('id', { length: 255 }).primaryKey(),
	authorId: varchar('author_id', { length: 255 }).notNull().references(() => user.id),
	text: text('text'), // main post body, can be empty if just media
	createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
	isDeleted: tinyint('is_deleted').notNull().default(0)
});

// --- Media Table ---
export const media = mysqlTable('media', {
	id: varchar('id', { length: 255 }).primaryKey(),
	postId: varchar('post_id', { length: 255 }).notNull().references(() => post.id),
	type: varchar('type', { length: 16 }).notNull(), // 'image', 'audio', 'video'
	url: varchar('url', { length: 255 }).notNull(),
	caption: text('caption'),
	position: int('position').notNull(), // for ordering, 0-3 if up to 4 per post
	uploadedAt: datetime('uploaded_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// --- Comment Table ---
export const comment = mysqlTable('comment', {
	id: varchar('id', { length: 255 }).primaryKey(),
	postId: varchar('post_id', { length: 255 }).notNull().references(() => post.id),
	authorId: varchar('author_id', { length: 255 }).notNull().references(() => user.id),
	content: text('content').notNull(),
	parentId: varchar('parent_id', { length: 255 }),
	createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
	isDeleted: tinyint('is_deleted').notNull().default(0)
});

// --- Audit Log Table ---
export const auditLog = mysqlTable('audit_log', {
	id: varchar('id', { length: 255 }).primaryKey(),
	userId: varchar('user_id', { length: 255 }).notNull().references(() => user.id),
	action: varchar('action', { length: 32 }).notNull(),
	targetTable: varchar('target_table', { length: 32 }).notNull(),
	targetId: varchar('target_id', { length: 255 }).notNull(),
	details: text('details'),
	timestamp: datetime('timestamp').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// --- Types ---
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Post = typeof post.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Comment = typeof comment.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;