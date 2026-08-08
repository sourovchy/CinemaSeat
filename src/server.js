import { buildApp } from './app.js';
import { migrateAndSeed } from './platform/migrate.js';
import { pool } from './platform/db.js';
import { config } from './platform/config.js';
import { startSweeper } from './booking/sweeper.js';

const app = buildApp();

// Compose starts us only after Postgres reports healthy, but retry anyway so
// restarts and bare `node src/server.js` runs behave the same.
async function migrateWithRetry(attempts = 30) {
  for (let i = 1; ; i++) {
    try {
      await migrateAndSeed();
      return;
    } catch (err) {
      if (i >= attempts) throw err;
      app.log.warn(
        { attempt: i, err: err.message },
        'database not ready, retrying in 1s'
      );
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

try {
  await migrateWithRetry();
  const stopSweeper = startSweeper(app.log);
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(
    {
      holdTtlSeconds: config.holdTtlSeconds,
      sweepIntervalSeconds: config.sweepIntervalSeconds,
      gatewayUrl: config.gatewayUrl,
      publicCallbackUrl: config.publicCallbackUrl,
    },
    'cinemaseat is up'
  );

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'shutting down');
    stopSweeper();
    await app.close().catch(() => {});
    await pool.end().catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch (err) {
  app.log.error(err, 'failed to start');
  process.exit(1);
}
