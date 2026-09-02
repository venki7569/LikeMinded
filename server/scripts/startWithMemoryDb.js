/**
 * Starts the API against a throwaway in-memory MongoDB.
 *
 * Useful before MongoDB Atlas credentials exist, or for a clean database on
 * every run. Data is discarded when the process exits — never use in
 * production. Run with: npm run dev:memory
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongoServer = await MongoMemoryServer.create();

// Must be assigned before src/server.js is imported, because the config module
// validates the environment at import time.
process.env.MONGODB_URI = mongoServer.getUri('likeminded_dev');

console.log(`In-memory MongoDB started at ${process.env.MONGODB_URI}`);
console.log('Data in this database is discarded when the process exits.\n');

const stop = async () => {
  await mongoServer.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

await import('../src/server.js');
