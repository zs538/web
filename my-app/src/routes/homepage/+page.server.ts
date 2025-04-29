import { db } from '$lib/server/db';

// If you want to join author info, add logic here when you need it
export const load = async () => {
  // Fetch all posts, ordered by newest first
  const posts = await db.query.post.findMany({
    orderBy: (post, { desc }) => [desc(post.createdAt)]
    // Add .with({ ... }) if/when you set up relations for JOINs
  });
  return { posts };
};
