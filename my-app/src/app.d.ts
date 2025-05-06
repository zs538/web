/// <reference types="lucia" />

declare namespace App {
  interface Locals {
    user: import("lucia").User | null;
    session: import("lucia").Session | null;
  }
}

declare module "lucia" {
  interface Register {
    Lucia: typeof import("$lib/server/auth/lucia").auth;
    DatabaseUserAttributes: {
      username: string;
      role: string;
      isActive: boolean;
      createdAt: Date;
    };
  }
}

// Environment variable typings
interface ImportMetaEnv {
  // Add any VITE_ or PRIVATE_ env variables your app uses:
  VITE_PUBLIC_API_URL?: string;
  // Example:
  // PRIVATE_DB_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}