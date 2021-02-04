import { readFileSync, createReadStream, statSync, existsSync, watchFile } from 'fs'
import * as es from 'event-stream'
import { spawn } from 'child_process'

require.extensions['.sql'] = function (module, filename) {
  module.exports = readFileSync(filename, 'utf8');
};

import { program } from 'commander'
import { LogRecord } from './LogRecord';
import { LogStream } from './LogStream';
import * as ConnectionPool from './ConnectionPool'

/**
 * inject parses read stream into LogRecords which gets turned into sql commands
 * that are piped into child psql process
 * 
 * generated LogStream entity stores the byte size of already procesed logs 
 */
const inject = async (args: { source: string }, keepPoolOpen = false) => {
  let logStream = await LogStream.query(args.source)
  if(logStream === null){
    // no log stream found, lets create a new one
    logStream = new LogStream('file://' + args.source)
    await logStream.save()
  }

  const psql = spawn('psql')
  const initialOffset = logStream.streamBOffset || 0 
  const readStream = createReadStream(args.source, { start: initialOffset })
    readStream.on('error', (error: Error) => console.error(error.message))
    readStream.on('end', async () => {
      // record the file size into stream byte offset so we don't reparse from the start on subsequent runs
      const stats = statSync(args.source)
      logStream!.streamBOffset = stats.size
      console.log(`Read ${logStream!.streamBOffset - initialOffset} bytes`)
      await logStream!.save()

      if(!keepPoolOpen){
        ConnectionPool.sharedInstance.end()
      }
    })
    readStream
      .pipe(es.split())
      .pipe(es.mapSync((line: string) => LogRecord.fromCLF(logStream!.id!, line)))
      // FIXME: for now we just skip invalid lines, better redirect to stderr
      .pipe((es as any).filterSync((entry: LogRecord | null) => entry !== null))
      .pipe(es.map((entry: LogRecord, cb: any) => {
        cb(null, entry.createQuery() + '\n')
      }))
      .pipe(psql.stdin)
}

const puppylog = program
  .description('Puppylog collector')
  .option('-s, --source <source path>', 'source log path', '/tmp/access.log')
  .option('-w, --watch', 'continiously monitor file changes', false)
  .action(async (args: { source: string, watch: boolean }) => {
    if(!existsSync(args.source)){
      console.error(`File does not exists at ${args.source}`)
      return
    }

    if(args.watch){
      console.log(`Waiting for changes at ${args.source}`)
      watchFile(args.source, async (_event, _filename) => await inject(args, true))
    } else {
      await inject(args)
    }
  })

puppylog.parse()