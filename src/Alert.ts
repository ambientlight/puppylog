import { parse, render } from "mustache"
import { Metric } from "./Metric"
import * as ConnectionPool from './ConnectionPool'
import { QueryResult } from "pg"

const alertTemplate = require('../sql_templates/alert.template.sql')
const alertHistoryTemplate = require('../sql_templates/alerthistory.template.sql')
const userdefinedJobs = require('../sql/userdefined_jobs.sql')

const DEFAULT_ALERT_OFFSET = 60

export interface UserdefinedJobsQueryResult {
  job_id: number,
  application_name: string,
  schedule_interval: { seconds: number },
  proc_name: string,
  config: {
    level: number,
    offset: string,
    alert_name: string,
    metric_identifier: string
  }
}

export interface AlertHistoryQueryResult {
  job_id: number, 
  name: string, 
  trigger_ts: Date,
  alert_level: string,
  observed_level: string,
  metric: string 
}

/**
 * A rule that is set against a certain level of underlying metric value
 * 
 * Represented via a postgres stored procedure and timescale job that is checked against a metric on a schedule
 */
export class Alert {
  /** 
   * unique alert identifier, 
   * attempting to persist an alert with already existing key will throw 
   * (postgres procedure name, should not clash with other procedures in same namespace)
   */
  readonly identifier: string
  
  /**
   * metric identifier that this alert is going to be attached to
   */
  readonly metricIdentifier: string

  readonly alertName: string

  /**
   * offset in seconds: alert will fetch the latest value above this offset
   */
  readonly offset: number

  /**
   * a boundary level which exceeded will satisfy the alert
   */
  readonly alertLevel: number

  /**
   * alert job period in seconds: how frequently does this alert is checked
   * DEFAULTS to underlying metrics period 
   */
  readonly period: number

  /**
   * identifier of timescaledb job backing this alert
   */
  private jobId: number | null = null  

  /**
   * creates a new alert for a given metric
   * @param metric a metric that alert is attached to
   */
  constructor(metric: Metric, alertLevel: number, alertIdentifier: string, alertName: string | null = null, offset: number = DEFAULT_ALERT_OFFSET, period: number | null = null){
    this.identifier = alertIdentifier
    this.metricIdentifier = metric.identifier
    this.alertName = alertName || alertIdentifier
    this.offset = offset
    this.alertLevel = alertLevel
    this.period = period || metric.period
  }

  /**
   * is current alert persisted and running
   */
  get isPersisted(){
    return this.jobId !== null
  }

  createQuery(){
    // renaming class property names requires doing the same in template
    return render(alertTemplate, {...this}) 
  }

  static fromRepsentation(row: UserdefinedJobsQueryResult){
    const alert = new Alert(
      // FIXME: small hack to reuse existing constructor
      { identifier: row.config.metric_identifier, period: row.schedule_interval.seconds } as Metric,
      row.config.level,
      row.proc_name,
      row.config.alert_name,
      parseInt(row.config.offset),
      row.schedule_interval.seconds
    )

    alert.jobId = row.job_id
    return alert
  }

  static async all(){
    const result: QueryResult<UserdefinedJobsQueryResult> = await ConnectionPool.sharedInstance.query(userdefinedJobs)
    return result.rows.map(row => Alert.fromRepsentation(row))
  }

  async save(){
    const _createResult = await ConnectionPool.sharedInstance.query(this.createQuery())
    const meta: QueryResult<UserdefinedJobsQueryResult> = await ConnectionPool.sharedInstance.query(`${userdefinedJobs} AND proc_name = $1`, [this.identifier])
    this.jobId = meta.rows[0].job_id
  }

  async delete(){
    if(!this.isPersisted){
      console.warn(`Alert(${this.identifier}) is not persisted. Delete nothing`)
      return
    }

    await ConnectionPool.sharedInstance.query(render('SELECT delete_job({{id}})', {id: this.jobId}))
    this.jobId = null    
  }

  /**
   * fetches all signals triggered for this alert
   */
  async signals(){
    const aleryHistory = render(alertHistoryTemplate, { identifier: this.identifier })
    const result: QueryResult<AlertHistoryQueryResult> = await ConnectionPool.sharedInstance.query(aleryHistory)
    return result.rows
  }
}