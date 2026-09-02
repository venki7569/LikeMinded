/**
 * Test bootstrap. Environment variables are assigned before any application
 * module is imported, because `src/config/env.js` validates them at import
 * time. The suite runs against an in-memory MongoDB, so no real database or
 * SMTP server is ever required.
 */
const TEST_SECRET = 'test-secret-value-that-is-long-enough-for-validation';

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.API_PREFIX = '/api/v1';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/likeminded_placeholder';
process.env.JWT_ACCESS_SECRET = `${TEST_SECRET}-access`;
process.env.JWT_REFRESH_SECRET = `${TEST_SECRET}-refresh`;
process.env.COOKIE_SECRET = `${TEST_SECRET}-cookie`;
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.CLIENT_ORIGINS = 'http://localhost:5173';
process.env.SMTP_HOST = '';

const { afterAll, afterEach, beforeAll } = await import('vitest');
const mongoose = (await import('mongoose')).default;
const { MongoMemoryServer } = await import('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri('likeminded_test'));
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});
