import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import * as schema from './schema';

// Lazy initialization to allow build without DATABASE_URL
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) {
    return _db;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not defined. Please set it in your .env file.'
    );
  }

  const sql: NeonQueryFunction<boolean, boolean> = neon(databaseUrl);
  _db = drizzle(sql, { schema });
  return _db;
}

// Export a getter for the database
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const database = getDb();
    const value = database[prop as keyof typeof database];
    if (typeof value === 'function') {
      return value.bind(database);
    }
    return value;
  },
});

// Export schema for convenience
export * from './schema';
