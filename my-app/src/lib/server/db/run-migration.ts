import { applyMigrations } from './migrate';

// Run the migrations
applyMigrations()
  .then(() => {
    console.log('Migrations completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
