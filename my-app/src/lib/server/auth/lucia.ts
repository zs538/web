import { Lucia } from "lucia";
import { BetterSqlite3Adapter } from "@lucia-auth/adapter-sqlite";
import { sqlite } from "$lib/server/db";

export const auth = new Lucia(
  new BetterSqlite3Adapter(sqlite, {
    user: "user",
    session: "session"
  }),
  {
    sessionCookie: { expires: false },
    getUserAttributes: (attributes) => ({
      username: attributes.username,
      role: attributes.role,
      isActive: attributes.isActive,
      createdAt: attributes.createdAt
    })
  }
);