import mongoose from 'mongoose';

function topologySupportsTransactions() {
  const type = mongoose.connection?.client?.topology?.description?.type;
  return type === 'ReplicaSetWithPrimary' || type === 'Sharded' || type === 'LoadBalanced';
}

function isTransactionUnsupported(error) {
  const message = String(error?.message ?? '');
  return (
    error?.code === 20 ||
    error?.codeName === 'IllegalOperation' ||
    /replica set|mongos|Transaction numbers are only allowed|not supported/i.test(message)
  );
}

/**
 * Runs `work(session)` inside a MongoDB transaction when the deployment
 * supports it (Atlas / replica set). mongodb-memory-server standalone used by
 * tests cannot, so the same work runs without a session and unique indexes
 * plus `$inc` keep membership consistent.
 */
export async function runInTransaction(work) {
  if (!topologySupportsTransactions()) {
    return work(null);
  }

  let session;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return work(null);
    }
    throw error;
  } finally {
    await session?.endSession();
  }
}

export function sessionOptions(session) {
  return session ? { session } : {};
}

export default runInTransaction;
