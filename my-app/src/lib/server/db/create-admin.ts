import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema'; // Adjust path as needed
import { Argon2id } from 'oslo/password';

// Run this script once to create your admin user
async function createAdmin() {
  const username = 'admin';
  const password = 'adminpassword'; // CHANGE THIS!
  
  // Check if admin already exists
  const existingAdmin = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.username, username)
  });
  
  if (existingAdmin) {
    console.log('Admin user already exists');
    return;
  }
  
  // Hash the password
  const hasher = new Argon2id();
  const passwordHash = await hasher.hash(password);
  
  // Insert the admin user
  await db.insert(user).values({
    id: crypto.randomUUID(),
    username,
    passwordHash,
    role: 'admin',
    isActive: true,
    createdAt: new Date()
  });
  
  console.log('Admin user created successfully!');
}

// Execute the function
createAdmin().catch(console.error);