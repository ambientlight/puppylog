"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withConnection = exports.sharedInstance = void 0;
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
function withConnection(op) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = yield exports.sharedInstance.connect();
        const result = op(connection);
        connection.release();
        return result;
    });
}
exports.withConnection = withConnection;
