import { Pool } from 'pg'

const dbConfig = {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || '192.168.8.220',
  database: process.env.PGDATABASE || 'postgres',
  password: process.env.PGPASSWORD || 'onesky',
  port: 5432
};

export const sharedInstance = new Pool({
  ...dbConfig,

  // number of milliseconds a client must sit idle in the pool and not be checked out
  // before it is disconnected from the backend and discarded
  idleTimeoutMillis: 30000,
  max: 32
});
