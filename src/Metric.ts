import { render } from 'mustache'
import { withConnection } from './ConnectionPool'
import * as ConnectionPool from './ConnectionPool'
import { QueryResult, Client, Connection, Pool } from 'pg'
import { parsePGInterval } from './utils'

const metricTemplate = require('../sql_templates/metric.template.sql')
const observationsQueryTemplate = require('../sql_templates/metric_observations.template.sql')

const continiousAggregatesQuery = require('../sql/continuous_aggregates.sql')
const continiousAggregateInfoQueryPattern = /SELECT\s*(?<customSegmentExpression>.*)\s*,?time_bucket\('(?<period>.*?)'::interval,\s*logrecords\.ts\)\s*AS\s*tbucket,\s*(?<statistic>[a-z]*)\((?<property>[a-z_\*]*)\)\s*AS\s*(?<identifier>[a-z_]*)\s*.*/
    
interface ContiniousAggregatesQueryResult { 
  view_name: string, 
  view_definition: string, 
  materialization_hypertable_name: string, 
  config: { 
    end_offset: string, 
    start_offset: string, 
    mat_hypertable_id: number} 
}

const DEFAULT_METRIC_PERIOD = 60
const DEFAULT_METRIC_START_OFFSET = 60 * 60 * 24

/**
 * A statistic that metric is collecting. Maps to SQL function.
 * NOTE: Take into account the period that is applied to this metric
 */
export enum MetricStatistic {
  Sum = "count",
  Average = "avg",
  Min = "min",
  Max = "max",
  StdDev = "stddev",
  Variance = "variance"
}

export const supportedStatistic: MetricStatistic[] = [
  MetricStatistic.Sum,
  MetricStatistic.Average,
  MetricStatistic.Min,
  MetricStatistic.Max,
  MetricStatistic.StdDev,
  MetricStatistic.Variance
]


export enum LogRecordProperty {
  EntireRow = "*",
  Timestamp = "ts",
  Host = "host",
  IndentLogname = "indent_logname",
  User = "ruser",
  RequestMethod = "request_method",
  RequestRoute = "request_route",
  RequestProto = "request_proto",
  StatusCode = "status_code",
  ResponseSize = "response_bsize"
}

export const supportedLogRecordProperties: LogRecordProperty[] = [
  LogRecordProperty.EntireRow,
  LogRecordProperty.Timestamp,
  LogRecordProperty.Host,
  LogRecordProperty.IndentLogname,
  LogRecordProperty.User,
  LogRecordProperty.RequestMethod,
  LogRecordProperty.RequestRoute,
  LogRecordProperty.RequestProto,
  LogRecordProperty.StatusCode,
  LogRecordProperty.ResponseSize
]

export interface CreateMetricOptions {
  identifier?: string, 
  statistic?: MetricStatistic, 
  property?: LogRecordProperty,
  period?: number, 
  startOffset?: number,
  endOffset?: number | null,
  refreshInterval?: number | null,
  segmentExpression?: LogRecordProperty | string
}

/**
 * Essential aggregated measument of interest over a numeric sequence
 * Each metric is persisted in a form of auto-updating materialized view
 * 
 * Immutable, you cannot change the value in existing persisted metric
 * (We need to delete and recreate again)
 * 
 * WARNING: mustache template maps directly to property names, renaming property names require also doing same in template
 */
export class Metric {
  /** 
   * unique metric identifier, 
   * attempting to persist a metric with already existing key will throw
   */
  readonly identifier: string
  readonly statistic: MetricStatistic

  /** metric period in seconds (time-range that we subsample from: i.e: time bucket) */
  readonly period: number

  /** 
   * start time offset in seconds of refresh window relative to current time 
   * NOTE: we often don't want to refresh really old data, unless we are injecting old logs
   */
  readonly startOffset: number

  /**
   * end time offset in seconds of refresh window
   * NOTE: used to exclude the most recent time bucket since its still getting updated as we material
   * (usually we would want to set this to same as period)
   */
  readonly endOffset: number

  /** 
   * how often metrics gets materialized
   * NOTE: most likely set to period (or to larger value if materialization is heavy)
   */
  readonly refreshInterval: number 

  /**
   * identifier of timescaledb hypertable, set when metric gets persisted
   */
  private hypertableId: number | null = null

  /**
   * log property that our metrics is calculated on 
   */
  readonly property: LogRecordProperty

  /**
   * the metrics will be normally grouped based on time buckets (period), 
   * use a segment expression when grouping based on combination of values is needed
   */
  readonly segmentExpression: LogRecordProperty | string

  /**
   * creates a new metric but DOES NOT PERSIST it, call save() to persist
   * 
   * @param identifier unique metric identifier
   * @param statistic static of interest
   * @param period metric period in seconds
   */
  constructor(
    identifier: string, 
    options: CreateMetricOptions = {}
  ){
    const defaultOptions = {
      statistic: MetricStatistic.Sum, 
      property: LogRecordProperty.EntireRow,
      period: DEFAULT_METRIC_PERIOD, 
      startOffset: DEFAULT_METRIC_START_OFFSET,
      endOffset: null,
      refreshInterval: null,
      segmentExpression: ""  
    }

    const opts = {...defaultOptions, ...options}

    if(identifier.length === 0){
      throw 'Cannot instantiate Metric with empty identifier'
    }

    if(opts.period === 0){
      console.warn(`Metric has been initialized with 0-seconds period, resseting it to default ${DEFAULT_METRIC_PERIOD}`)
    }

    this.identifier = identifier
    this.statistic = opts.statistic
    this.property = opts.property
    this.period = opts.period || DEFAULT_METRIC_PERIOD
    this.startOffset = opts.startOffset
    this.endOffset = opts.endOffset === null ? this.period : opts.endOffset
    this.refreshInterval = opts.refreshInterval || this.period
    this.segmentExpression = opts.segmentExpression
  }

  /**
   * is current metric persisted and materialized?
   */
  get isPersisted(){
    return this.hypertableId !== null
  }

  /** a query to create a new row backing this model instance */
  createQuery(){
    // TODO: we should escape the values we are rendering
    // renaming class property names requires doing the same in template
    return render(metricTemplate, { ...this, customSegmentExpression: this.segmentExpression ? (this.segmentExpression + ',') : '' })
  }

  /** a query to list all continious aggregates with job metadata */
  static listQuery(){
    return continiousAggregatesQuery
  }

  /**
   * transforms sql query result row to model abstraction instance
   */
  static fromRepsentation(row: ContiniousAggregatesQueryResult){
    const config = row.config
    const identifier = row.view_name
    const query = row.view_definition.split('\n').map(line => line.trim()).join(' ')
    const match = continiousAggregateInfoQueryPattern.exec(query)
    if(match === null){ 
      console.error(`Ignored materialized view query: ${query}`)
      return null
    }
     
    // check available capturing groups in query pattern
    const period = match!.groups!.period
    const statistic = match!.groups!.statistic
    const property = match!.groups!.property
    const segmentExpression = match!.groups!.customSegmentExpression
    
    const metric = new Metric(
      identifier, 
      {
        statistic: statistic as MetricStatistic, 
        property: property as LogRecordProperty,
        period: parsePGInterval(period),
        startOffset: parsePGInterval(config.start_offset),
        endOffset: parsePGInterval(config.end_offset),
        // FIXME: need to parse this from query aswell, assume period for now
        refreshInterval: parsePGInterval(period),
        segmentExpression: segmentExpression.includes('AS') ? segmentExpression.split('AS')[0].trim() : segmentExpression.trim()
      }
    )

    metric.hypertableId = config.mat_hypertable_id
    return metric
  }

  /**
   * fetches all persisted metrics
   */
  static async all(){
    // we don't really need to have another table to store Metric metadata 
    // as we can retrieve original queries that generated continious aggregate
    const result: QueryResult<ContiniousAggregatesQueryResult> = await ConnectionPool.sharedInstance.query(continiousAggregatesQuery)
    return result.rows.map(row => Metric.fromRepsentation(row)).filter(repr => repr !== null) as Metric[]
  }

  /**
   * persists this Metric by creating and populating timescale continuous aggregate
   */
  async save(){
    // we need to split into individual queries as pg will automatically wrap into transaction otherwise
    const [createMaterializedViewQuery, addRefreshPolicyQuery, ..._] = this.createQuery().split(';')
    const _createMaterializedViewResult = await ConnectionPool.sharedInstance.query(createMaterializedViewQuery)
    const _addPolicyResult = await ConnectionPool.sharedInstance.query(addRefreshPolicyQuery)
    const meta = await ConnectionPool.sharedInstance.query(`${continiousAggregatesQuery} WHERE view_name = $1`, [this.identifier.toLowerCase()])
    this.hypertableId = meta.rows[0].config.mat_hypertable_id
  }

  async delete(){
    await ConnectionPool.sharedInstance.query(render('DROP MATERIALIZED VIEW {{id}}', {id: this.identifier}))
    this.hypertableId = null
  }

  /**
   * fetches all observations for this metric
   */
  async observations(limit = 100){
    const observationsQuery = render(observationsQueryTemplate, { identifier: this.identifier })
    const result: QueryResult<{ tbucket: string, observation: number }> = await ConnectionPool.sharedInstance.query(`${observationsQuery} ORDER BY tbucket DESC LIMIT ${limit}`)
    return result.rows.map(row => ({ ts: new Date(row.tbucket), value: row.observation }))
  }
}