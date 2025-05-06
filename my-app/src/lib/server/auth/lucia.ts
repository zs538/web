// src/lib/server/auth/lucia.ts
import { Lucia } from "./lucia-types";
import { BetterSqlite3Adapter } from "@lucia-auth/adapter-sqlite";
import { sqlite } from "$lib/server/db";

export const auth = new Lucia(
  new BetterSqlite3Adapter(sqlite, {
    user: "user",
    session: "session"
  }),
  {
    sessionCookie: { expires: false },
    getUserAttributes: (attributes: any) => ({
      username: attributes.username,
      role: attributes.role,
      isActive: attributes.isActive, 
      createdAt: attributes.createdAt
    })
  }
);

export type Auth = typeof auth;