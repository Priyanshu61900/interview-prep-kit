import mongoose from "mongoose";

// Cached across hot reloads in dev and across warm serverless invocations in
// production, so we don't open a new connection pool on every request.
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

function isPlaceholderUri(uri: string): boolean {
  return uri.includes("<user>") || uri.includes("<password>") || uri.includes("<cluster>");
}

/**
 * Dev fallback: if MONGODB_URI is missing or still the .env.example
 * placeholder and we're not in production, spin up an in-memory MongoDB
 * (mongodb-memory-server) instead of failing every request. Data doesn't
 * persist across restarts, but it unblocks local development and the
 * batch/test paths without requiring an Atlas cluster to exist yet.
 */
async function resolveUri(): Promise<string> {
  const uri = process.env.MONGODB_URI;
  if (uri && !isPlaceholderUri(uri)) return uri;
  if (process.env.NODE_ENV === "production") {
    throw new Error("MONGODB_URI is not set (or still a placeholder) in production.");
  }

  const { MongoMemoryServer } = await import("mongodb-memory-server");
  // eslint-disable-next-line no-console
  console.warn("[db] MONGODB_URI not configured — using an in-memory MongoDB for local dev. Data will not persist.");
  const mem = await MongoMemoryServer.create();
  return mem.getUri();
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = resolveUri().then((uri) => mongoose.connect(uri, { bufferCommands: false }));
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
