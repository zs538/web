import { db } from '$lib/server/db/index';
import { post, user, media } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function load() {
  // Fetch posts, newest first
  const posts = await db.query.post.findMany({
    orderBy: [desc(post.createdAt)],
    with: {
      author: true,
      media: { orderBy: [media.position] },
    },
    where: (fields, { eq }) => eq(fields.isDeleted, false),
  });

  return { posts };
}
