"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharedInstance = void 0;
const pg_1 = require("pg");
const dbConfig = {
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || '192.168.8.220',
    database: process.env.PGDATABASE || 'postgres',
    password: process.env.PGPASSWORD || 'onesky',
    port: 5432
};
exports.sharedInstance = new pg_1.Pool(Object.assign(Object.assign({}, dbConfig), { 
    // number of milliseconds a client must sit idle in the pool and not be checked out
    // before it is disconnected from the backend and discarded
    idleTimeoutMillis: 30000, max: 32 }));
