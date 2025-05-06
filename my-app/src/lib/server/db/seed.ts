import 'dotenv/config';
import { db } from './index';
import { user, post, media } from './schema';
import { Argon2id } from "oslo/password";


// Posts with hard-coded, readable timestamps (UTC)
const POSTS = [
  {
    id: 'p1',
    authorId: 'u1',
    text: 'Hello, world! This is a simple text post.',
    isDeleted: false,
    createdAt: new Date(1746086400000), // May 1, 2025, 08:00 UTC
  },
  {
    id: 'p2',
    authorId: 'u1',
    text: 'A post with multiple media types!',
    isDeleted: false,
    createdAt: new Date(1746239100000), // May 2, 2025, 15:45 UTC
  },
  {
    id: 'p3',
    authorId: 'u2',
    text: 'Check out this cool YouTube video.',
    isDeleted: false,
    createdAt: new Date(1746357600000), // May 3, 2025, 19:20 UTC
  },
  {
    id: 'p4',
    authorId: 'u2',
    text: 'A gallery-style image post.',
    isDeleted: false,
    createdAt: new Date(1746495300000), // May 4, 2025, 23:55 UTC
  }
];

// Media: no timestamps needed unless you want them for testing
const MEDIA = [
  // Media for post p2 - mixed types
  {
    id: 'm1',
    postId: 'p2',
    type: 'image',
    url: 'https://picsum.photos/600/400',
    caption: 'A beautiful landscape',
    position: 0,
  },
  {
    id: 'm2',
    postId: 'p2',
    type: 'video',
    url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    caption: 'Sample video',
    position: 1,
  },
  {
    id: 'm3',
    postId: 'p2',
    type: 'audio',
    url: 'https://sample-videos.com/audio/mp3/crowd-cheering.mp3',
    caption: 'Sample audio clip',
    position: 2,
  },
  // Media for post p3 - embed
  {
    id: 'm4',
    postId: 'p3',
    type: 'embed',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    caption: 'Rick Astley - Never Gonna Give You Up',
    position: 0,
  },
  // Media for post p4 - gallery of images (max 4)
  {
    id: 'm5',
    postId: 'p4',
    type: 'image',
    url: 'https://picsum.photos/seed/p4img1/600/400',
    caption: 'Gallery image 1',
    position: 0,
  },
  {
    id: 'm6',
    postId: 'p4',
    type: 'image',
    url: 'https://picsum.photos/seed/p4img2/600/400',
    caption: 'Gallery image 2',
    position: 1,
  },
  {
    id: 'm7',
    postId: 'p4',
    type: 'image',
    url: 'https://picsum.photos/seed/p4img3/600/400',
    caption: null,
    position: 2,
  },
  {
    id: 'm8',
    postId: 'p4',
    type: 'image',
    url: 'https://picsum.photos/seed/p4img4/600/400',
    caption: 'Fourth image!',
    position: 3,
  },
];

async function seed() {
  // 1. Clear all data in dependency order
  await db.delete(media);
  await db.delete(post);
  await db.delete(user);

  console.log('Deleted existing data.');

  // 2. Create password hashes properly using Argon2id
  const hasher = new Argon2id();
  const alicePasswordHash = await hasher.hash('alicepassword'); // Set a real password here
  const adminPasswordHash = await hasher.hash('password123'); // Set a real admin password here

  // 3. Insert users (batch) with proper password hashes
  await db.insert(user).values([
    {
      id: 'u1',
      username: 'alice',
      passwordHash: alicePasswordHash,
      role: 'user',
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'u2',
      username: 'bob',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date()
    }
  ]);

  console.log('Created test users.');

  // 4. Insert posts (batch, all fields correct, createdAt as Date)
  await db.insert(post).values(POSTS);

  console.log('Created test posts.');

  // 5. Insert media (batch)
  await db.insert(media).values(MEDIA);

  console.log('Created test media attachments.');
  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});