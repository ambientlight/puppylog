import { readFileSync } from 'fs' 

// allows us require('whatever.sql') as strings
require.extensions['.sql'] = function (module, filename) {
  module.exports = readFileSync(filename, 'utf8');
};

import { Metric } from './Metric'
import { Client } from 'pg'

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

const metric = new Metric('total_traffic')
console.log(metric.createQueryString())