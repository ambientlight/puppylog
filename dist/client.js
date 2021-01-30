"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PostgresPubSub_1 = require("./PostgresPubSub");
const pg_1 = require("pg");
const client = new pg_1.Client({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || '192.168.8.220',
    database: process.env.PGDATABASE || 'postgres',
    password: process.env.PGPASSWORD || 'onesky',
    port: 5432
});
client.connect();
const ipc = PostgresPubSub_1.createPgEventEmitter(client);
ipc.on('error', console.error);
ipc.on('end', function () {
    client.end();
});
ipc.on('magic', function (msg) {
    console.log(msg);
});
setInterval(() => {
    client.query("CALL run_job(1009);").then(result => console.log("___")).catch(err => console.error(err));
}, 120 * 1000);
