import { app } from './app.js';
import { checkDatabaseConnection, closeDatabase } from './config/database.js';
import { env } from './config/env.js';

async function bootstrap(): Promise<void> {
  await checkDatabaseConnection();
  console.log('Database connection established');

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    console.log(`${signal} received, shutting down gracefully...`);

    server.close(() => {
      closeDatabase()
        .then(() => {
          console.log('Database connection closed');
          process.exit(0);
        })
        .catch((error: unknown) => {
          console.error('Failed to close database connection', error);
          process.exit(1);
        });
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
