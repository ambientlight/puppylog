import { render } from 'mustache'
import { SQLRepresentable } from "./SQLRepresentable"
import * as ConnectionPool from './ConnectionPool'
import { QueryResult } from 'pg'

const metricTemplate = require('../sql_templates/metric.template.sql')
const continiousAggregatesQuery = require('../sql/continuous_aggregates.sql')

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

/**
 * Essential aggregated measument of interest over a numeric sequence
 * Each metric is persisted in a form of auto-updating materialized view
 * 
 * Immutable, you cannot change the value in existing persisted metric
 * (We need to delete and recreate again)
 * 
 * WARNING: mustache template maps directly to property names, renaming property names require also doing same in template
 */
export class Metric implements SQLRepresentable {
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
   * creates a new metric but DOES NOT PERSIST it, call save() to persist
   * 
   * @param identifier unique metric identifier
   * @param statistic static of interest
   * @param period metric period in seconds
   */
  constructor(
    identifier: string, 
    statistic = MetricStatistic.Sum, 
    period = DEFAULT_METRIC_PERIOD, 
    startOffset = DEFAULT_METRIC_START_OFFSET,
    endOffset: number | null = null,
    refreshInterval: number | null = null
  ){

    if(period === 0){
      console.warn(`Metric has been initialized with 0-seconds period, resseting it to default ${DEFAULT_METRIC_PERIOD}`)
    }

    this.identifier = identifier
    this.statistic = statistic
    this.period = period || DEFAULT_METRIC_PERIOD
    this.startOffset = startOffset
    this.endOffset = endOffset === null ? this.period : endOffset
    this.refreshInterval = refreshInterval || this.period
  }

  createQueryString(){
    // TODO: we should escape the values we are rendering
    return render(metricTemplate, { ...this })
  }

  static async all(){
    const connection = await ConnectionPool.sharedInstance.connect()
    const result: QueryResult<ContiniousAggregatesQueryResult> = await connection.query(continiousAggregatesQuery)
    const queryPattern = /SELECT time_bucket\('(?<period>.*?)'::interval,\s*logrecords\.ts\)\s*AS\s*tbucket,\s*(?<statistic>[a-z]*)\(\*\)\s*AS\s*(?<identifier>[a-z_]*)\s*.*/
    
    // we don't really need to have another table to store Metric metadata 
    // as we can retrieve original queries that generated continious aggregate
    const materializedViewFragments = result.rows
      .map(row => ({
        config: row.config,
        identifier: row.view_name, 
        query: row.view_definition.split('\n').map(line => line.trim()).join(' ')
      })).filter(({identifier, query }) => { 
        const match = queryPattern.exec(query) 
        if(match === null){ 
          console.error(`Ignored materialized view query: ${query}`)
        }

        return match !== null
      }).map(({identifier, query, config }) => {
        const match = queryPattern.exec(query)!
        return {
          period: match.groups!.period,
          statistic: match.groups!.statistic,
          identifier,
          config
        }
      })

    return materializedViewFragments
  }
}