import { db } from '$lib/server/db';

export const load = async () => {
  // Fetch posts with both author and media information
  const posts = await db.query.post.findMany({
    with: {
      author: true,
      media: {
        orderBy: (media, { asc }) => [asc(media.position)]  // Order by position field
      }
    },
    where: (post, { eq }) => eq(post.isDeleted, false),
    orderBy: (post, { desc }) => [desc(post.createdAt)],
    limit: 10  // Start with a reasonable limit for performance
  });
  
  return { posts };
};