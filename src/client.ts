import { createPgEventEmitter } from './PostgresPubSub'
import { Client } from 'pg'
import { EventEmitter } from "events"

const client = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: 5432
})

client.connect()

const ipc = createPgEventEmitter(client)

ipc.on('error', console.error)
ipc.on('end', () => client.end())
ipc.on('total_traffic_alert', msg => console.log(msg))