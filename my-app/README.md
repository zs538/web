# aicum Web Application

This is a Svelte-based web application using SvelteKit.

## Database Setup

This project uses SQLite with Drizzle ORM for database management. The database file (`my-app.sqlite`) is not included in the repository.

### Setting up the database

1. Create a new SQLite database:

```bash
# From the my-app directory
touch my-app.sqlite
```

2. Run database migrations to create the schema:

```bash
npm run db:migrate
```

3. Seed the database with initial data:

```bash
# Run the seed script
node --loader ts-node/esm src/lib/server/db/seed.ts
```
### Development Tools

The project includes several database-related npm scripts:
- `npm run db:push`: Push schema changes to the database
- `npm run db:migrate`: Run migrations
- `npm run db:studio`: Open Drizzle Studio to view and manage database content

## Developing

Once you've created a project and installed dependencies with `npm install`, start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of the app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed.
