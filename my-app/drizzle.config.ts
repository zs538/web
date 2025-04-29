import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  dialect: 'sqlite',                           // <--- THIS IS THE KEY!
  dbCredentials: {
    url: './my-app.sqlite',
  },
  out: './drizzle/migrations',
  verbose: true,
  strict: true,
});