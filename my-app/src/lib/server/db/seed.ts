import 'dotenv/config';
import { db } from './index';
import { user, post, media } from './schema';

async function seed() {
  // Delete old data first (in right order to avoid FK errors)
  await db.delete(media); // Delete media first (has FK to post)
  await db.delete(post);  // Delete posts next (has FK to user)
  await db.delete(user);  // Delete users last
  
  console.log('Deleted existing data.');

  // Insert user
  await db.insert(user).values([
    {
      id: 'u1',
      username: 'alice',
      passwordHash: 'somehashedpassword',
      role: 'user',
      bio: 'Hi, I am Alice!',
      isActive: true,
    },
  ]);
  
  console.log('Created test user.');

  // Insert posts
  await db.insert(post).values([
    {
      id: 'p1',
      authorId: 'u1',
      text: 'Hello, world!',
      isDeleted: false,
    },
    {
      id: 'p2',
      authorId: 'u1',
      text: 'A post with multiple media types!',
      isDeleted: false,
    },
    {
      id: 'p3',
      authorId: 'u1',
      text: 'A post with just images',
      isDeleted: false,
    },
  ]);
  
  console.log('Created test posts.');

  // Insert media for different posts
  await db.insert(media).values([
    // Media for post p2 - mixed types
    {
      id: 'm1',
      postId: 'p2',
      type: 'image',
      url: 'https://picsum.photos/600/400',  // Random placeholder image
      caption: 'A beautiful landscape',
      position: 0,
    },
    {
      id: 'm2',
      postId: 'p2',
      type: 'video',
      url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', // Sample video URL
      caption: 'Sample video',
      position: 1,
    },
    {
      id: 'm3',
      postId: 'p2',
      type: 'audio',
      url: 'https://sample-videos.com/audio/mp3/crowd-cheering.mp3', // Sample audio URL
      caption: 'Sample audio clip',
      position: 2,
    },
    
    // Media for post p3 - multiple images
    {
      id: 'm4',
      postId: 'p3',
      type: 'image',
      url: 'https://picsum.photos/600/400?random=1',
      caption: 'First random image',
      position: 0,
    },
    {
      id: 'm5',
      postId: 'p3',
      type: 'image',
      url: 'https://picsum.photos/600/400?random=2',
      caption: 'Second random image',
      position: 1,
    },
    {
      id: 'm6',
      postId: 'p3',
      type: 'image',
      url: 'https://picsum.photos/600/400?random=3',
      caption: null,
      position: 2,
    },
  ]);
  
  console.log('Created test media attachments.');

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
