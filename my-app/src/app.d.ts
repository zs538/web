/// <reference types="lucia" />

// Declare the App namespace with Locals interface
declare namespace App {
  interface Locals {
    user: import("lucia").User | null;
    session: import("lucia").Session | null;
  }
  // Add other SvelteKit interfaces as needed
}

// Add Lucia type augmentation
declare namespace Lucia {
  type Auth = import("$lib/server/auth/lucia").Auth;
  
  interface DatabaseUserAttributes {
    username: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
  }
}