import mongoose from "mongoose";

// Cached across hot reloads in dev and across warm serverless invocations in
// production, so we don't open a new connection pool on every request.
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
   
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
// Managed-database integrations name the variable they inject themselves, and
// the name depends on the prefix chosen when the store is linked. Accept the
// usual spellings so provisioning through a marketplace integration does not
// require hand-copying the connection string.
const URI_VARS = ["MONGODB_URI", "MONGODB_URL", "ATLAS_URL", "DATABASE_URL"] as const;

async function resolveUri(): Promise<string> {
  for (const name of URI_VARS) {
    const value = process.env[name];
    if (value && !isPlaceholderUri(value)) return value;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(`No usable MongoDB connection string in production. Set one of: ${URI_VARS.join(", ")}.`);
  }

  const { MongoMemoryServer } = await import("mongodb-memory-server");
   
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
