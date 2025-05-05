import { db } from '$lib/server/db'; // Drizzle instance
import { auth } from '$lib/server/auth/lucia';
import { fail, redirect, type Actions, type RequestEvent } from '@sveltejs/kit';
import { Argon2id } from "oslo/password";

export const actions: Actions = {
	default: async ({ request, cookies }: RequestEvent) => {
		const form = await request.formData();
		const username = String(form.get('username'));
		const password = String(form.get('password'));

		// Fetch user from DB
		const user = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.username, username)
		});
		if (!user) return fail(400, { message: "Invalid credentials" });

		// Validate password
		const valid = await new Argon2id().verify(user.passwordHash, password);
		if (!valid) return fail(400, { message: "Invalid credentials" });

		// Create session
		const session = await auth.createSession(user.id, {});
		const sessionCookie = auth.createSessionCookie(session.id);
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});

		throw redirect(303, "/me");
	}
};