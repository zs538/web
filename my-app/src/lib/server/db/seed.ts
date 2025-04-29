import 'dotenv/config';
import { db } from './index';
import { user, post } from './schema';

async function seed() {
  // Delete old data first (in right order to avoid FK errors)
  await db.delete(post);
  await db.delete(user);

  // Insert user
  await db.insert(user).values([
    {
      id: 'u1',
      username: 'alice',
      passwordHash: 'somehashedpassword',
      role: 'user',
      bio: 'Hi, I am Alice!',
      isActive: true, // <-- Use boolean here!
    },
  ]);
  
  // Insert post
  await db.insert(post).values([
    {
      id: 'p1',
      authorId: 'u1',
      text: 'Hello, world!',
      isDeleted: false, // <-- Use boolean here!
    },
  ]);

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});