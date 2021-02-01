"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
// allows us require('whatever.sql') as strings
require.extensions['.sql'] = function (module, filename) {
    module.exports = fs_1.readFileSync(filename, 'utf8');
};
const Metric_1 = require("./Metric");
/*
const client = new Client({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || '192.168.8.220',
    database: process.env.PGDATABASE || 'postgres',
    password: process.env.PGPASSWORD || 'onesky',
    port: 5432
})

client.connect()
*/
const metric = new Metric_1.Metric('total_traffic');
console.log(metric.createQueryString());
