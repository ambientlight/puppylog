import { render } from 'mustache'
import * as ConnectionPool from './ConnectionPool'
const logStreamTemplate = require('../sql_templates/logstream.template.sql')

export class LogStream {
  private _id: number | null = null
  get id(): number | null {
    return this._id
  }

  /** path to the log file prefixed with file:// */
  readonly sourceURI: string
  streamBOffset: number | null = null
 
  constructor(uri: string){
    if(uri === undefined || uri.length === 0){
      throw 'Cannot instantiate LogStream with empty sourceURI'
    }

    this.sourceURI = uri
  }

  // for now use default log group
  private logGroupId = 1

  get isPersisted(){
    return this.id !== null
  }

  createQuery(){
    return render(logStreamTemplate, { ...this })
  }

  async save(){
    if(this.isPersisted){
      await ConnectionPool.sharedInstance.query('UPDATE logstreams SET stream_boffset = $1 WHERE source_uri = $2', [this.streamBOffset, this.sourceURI])
    } else {
      console.log(this.createQuery())
      const _createResult = await ConnectionPool.sharedInstance.query(this.createQuery())
      let queryResult = await ConnectionPool.sharedInstance.query('SELECT * from logstreams WHERE source_uri = $1 LIMIT 1', [this.sourceURI])
      this._id = queryResult.rows[0].id
    }
  }

  static async query(filepath: string): Promise<LogStream | null> {
    let result = await ConnectionPool.sharedInstance.query('SELECT * from logstreams WHERE source_uri = $1 LIMIT 1', ['file://' + filepath])
    if(result.rows.length == 0){
      return null
    } else {
      const row = result.rows[0]
      const stream = new LogStream(row.source_uri)
      stream.logGroupId = row.loggroup_id
      stream._id = row.id
      stream.streamBOffset = parseInt(row.stream_boffset)
      return stream
    }
  }
}