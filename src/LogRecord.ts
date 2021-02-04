import { render } from 'mustache'
const logRecordTemplate = require('../sql_templates/logrecord.template.sql')

const clf = /(?<host>.*?)\s(?<indent_logname>.*?)\s(?<ruser>.*?)\s\[(?<date>.*?)(?= )\s(?<timezone>.*?)\]\s\"(?<request_method>.*?)\s(?<request_route>.*?)(?<request_proto>\sHTTP\/.*)?\"\s(?<status_code>\d*?)\s(?<response_bsize>\d*)/

export interface CLFGroup {
  host?: string
  indent_logname?: string
  ruser?: string
  date?: string
  timezone?: string
  request_method?: string
  request_route?: string
  request_proto?: string
  status_code?: string
  response_bsize?: string
}

export interface LogRecordOptions {
  host?: string
  indent_logname?: string
  ruser?: string
  
  request_method?: string
  request_route?: string
  request_proto?: string

  status_code?: number
  response_bsize?: number  
}

export class LogRecord {
  readonly ts: Date
  readonly logStreamId: number
  
  readonly host?: string
  readonly indent_logname?: string
  readonly ruser?: string
  readonly request_method?: string
  readonly request_route?: string
  readonly request_proto?: string
  readonly status_code?: number
  readonly response_bsize?: number

  constructor(ts: Date, logStreamId: number, options: LogRecordOptions = {}){
    this.logStreamId = logStreamId
    this.ts = ts
    this.host = options.host
    this.indent_logname = options.indent_logname
    this.ruser = options.ruser
    this.request_method = options.request_method
    this.request_proto = options.request_proto
    this.request_route = options.request_route
    this.status_code = options.status_code
    this.response_bsize = options.response_bsize
  }

  static fromCLF(logStreamId: number, line: string): LogRecord | null {
    const group: CLFGroup | undefined = clf.exec(line)?.groups
    if(group === undefined){
      return null
    }

    if(
       group.status_code !== undefined && isNaN(group.status_code as unknown as number) 
    || group.response_bsize !== undefined && isNaN(group.response_bsize as unknown as number)
    ){
      return null
    }

    if(group.date === undefined || group.date.length == 0){
      return null
    }

    const statusCode = group.status_code !== undefined ? parseInt(group.status_code.trim()) : undefined
    const responseBSize = group.response_bsize !== undefined ? parseInt(group.response_bsize.trim()) : undefined

    // replace the first ';' to split date from time so Date can parse it directly
    const dateString = `${group.date} ${group.timezone || ''}`.replace(':', ' ')
    const ts = new Date(dateString)
    if(ts instanceof Date && !isNaN(ts as unknown as number)){
      return new LogRecord(ts, logStreamId, {
        ...group, 
        status_code: statusCode, 
        response_bsize: responseBSize
      })
    } else {
      return null
    }
  }

  createQuery(){
    return render(logRecordTemplate, { ...this, ts: this.ts.getTime() / 1000, status_code: this.status_code || 0, response_bsize: this.response_bsize || 0 })
  }
}