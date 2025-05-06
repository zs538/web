import { auth } from '$lib/server/auth/lucia';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { Argon2id } from 'oslo/password';
import { db } from '$lib/server/db';

// Add this load function to redirect logged-in users
export const load: PageServerLoad = async ({ locals }) => {
  // If user is already logged in, redirect to /me
  if (locals.user) {
    throw redirect(302, '/me');
  }
  
  // Otherwise, continue to the login page
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const username = form.get('username');
    const password = form.get('password');

    // Validate input
    if (typeof username !== 'string' || username.length < 1) {
      return fail(400, { 
        message: 'Username must be at least 1 character' 
      });
    }
    if (typeof password !== 'string' || password.length < 1) {
      return fail(400, { 
        message: 'Password must be at least 1 character' 
      });
    }

    // Find user
    const existingUser = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.username, username)
    });

    if (!existingUser) {
      return fail(400, { 
        message: 'Invalid credentials' 
      });
    }

    // Verify password
    const validPassword = await new Argon2id().verify(
      existingUser.passwordHash, 
      password
    );
    if (!validPassword) {
      return fail(400, { 
        message: 'Invalid credentials' 
      });
    }

    // Create session
    const session = await auth.createSession(existingUser.id, {});
    const sessionCookie = auth.createSessionCookie(session.id);
    
    cookies.set(
      sessionCookie.name, 
      sessionCookie.value, 
      {
        path: '/',
        ...sessionCookie.attributes
      }
    );

    throw redirect(303, '/me');
  }
};
