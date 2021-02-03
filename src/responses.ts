import { Metric, supportedLogRecordProperties, supportedStatistic } from './Metric'
import * as ConnectionPool from './ConnectionPool';
import { totalTrafficPerRoute, totalTraffic, totalTrafficAlert } from './defaults'
import { Alert } from './Alert';
import { sign } from 'crypto';

export const metricsGeneralListResponse = async () => {
  try {
    const metrics = await Metric.all()
    let result = ''
    if(metrics.length === 0){
      result += [
        'No metrics have been yet added. A good starting point would be to create default metrics and alert set with:',
        `monitor metrics create --default`
      ].join('\n')
    } else {
      result += [
        'Available metrics:',
        metrics.map(metric => metric.identifier).join('\n')
      ].join('\n')
    }

    result += [
      '\n',
      'To view metric details run:',
      'monitor metrics get <metric name>',
      'monitor metrics meta <metric name>'
    ].join('\n')

    console.log(result)
  } catch(err){
    console.error(err)
  } finally {
    ConnectionPool.sharedInstance.end()
  }
}

export const createDefaultMetricsAlarmsSetResponse = async () => {
  try {
    await totalTrafficPerRoute.save()
    await totalTraffic.save()
    await totalTrafficAlert.save()

    let result = [
      `Created metric ${totalTrafficPerRoute.identifier}`,
      `Created metric ${totalTraffic.identifier}`,
      `Created alert ${totalTrafficAlert.identifier}`
    ].join('\n')
    console.log(result)

  } catch(err) {
    if(err.code === '42P07'){
      console.log(`Default metrics/alert set should already be created`)
    } else {
      console.error(err)
    }
  } finally {
    ConnectionPool.sharedInstance.end()
  }
}

export const createNewMetricAndResponse = async (args: any) => {
  if(args.identifier === undefined){
    console.log('id is required when creating a new metric')
    return
  }
  if(args.stat !== undefined && !supportedStatistic.includes(args.stat)){
    console.log(`Statistic(${args.Stat}) is not supported, please use one from (count/avg/min/max/stddev/variance)`)
    return
  }
  if(args.prop !== undefined && !supportedLogRecordProperties.includes(args.prop)){
    console.log(`Property(${args.prop}) is not supported, please use one from (*/ts/host/indent_logname/ruser/request_method/request_route/request_proto/status_code/response_bsize)`)
    return
  }
  if(args.period !== undefined && isNaN(args.period)){
    console.log(`Period is not a valid number`)
    return
  }
  if(args.refresh_rate !== undefined && isNaN(args.refresh_rate)){
    console.log(`Refresh rate is not a valid number`)
    return
  }

  const period = args.period !== undefined ? parseInt(args.period) : undefined
  const refreshInterval = args.refresh_rate !== undefined ? parseInt(args.refresh_rate) : undefined
  const newMetric = new Metric(
    args.identifier,
    {
      statistic: args.stat,
      property: args.prop,
      period,
      refreshInterval,
      segmentExpression: args.segment_expression
    }
  )

  try {
    await newMetric.save()
    console.log(`Metric(${newMetric.identifier}) created succesfully`)
  } catch(err){
    console.error(err)
  } finally {
    ConnectionPool.sharedInstance.end()
  }
  
}

export const createMetricDetailResponse = async (metricId: string) => {
  try {
    const metric = (await Metric.all()).find(metric => metric.identifier === metricId)
    if(metric === undefined){
      console.log(`Metric(${metricId}) has not been found`)
    } else {
      const observations = await metric.observations()
      if(observations.length === 0){
        console.log(`Metric(${metricId}) has no observations yet`)
      } else {
        const result = [
          `Metric(${metricId}):`,
          ...observations.map(obs => `${obs.ts.toISOString()}: ${obs.value}`)
        ].join('\n')
        console.log(result)
      }
    }
  } catch(err) {
    console.error(err)
  } finally {
    ConnectionPool.sharedInstance.end()
  }
}

export const createMetricMetaResponse = async (metricId: string) => {
  try {
    const metric = (await Metric.all()).find(metric => metric.identifier === metricId)
    if(metric === undefined){
      console.log(`Metric(${metricId}) has not been found`)
    } else {
      console.log(metric)
    }
  } catch(err) {
    console.error(err)
  } finally {
    ConnectionPool.sharedInstance.end()
  }
}

export const alertsGeneralListResponse = async () => {
  try {
    const alerts = await Alert.all()
    let result = ''
    if(alerts.length === 0){
      result += [
        'No alerts have been yet added. A good starting point would be to create default metrics and alert set with:',
        `monitor metrics create --default`
      ].join('\n')
    } else {
      result += [
        'Available alerts:',
        alerts.map(alert => alert.identifier).join('\n')
      ].join('\n')
    }

    result += [
      '\n',
      'To view alert details run:',
      'monitor alerts get <alert name>',
      'monitor alerts meta <alert name>'
    ].join('\n')

    console.log(result)
  } catch(err){
    console.error(err)
  } finally {
    ConnectionPool.sharedInstance.end()
  }
}

export const createAlertDetailResponse = async (alertId: string) => {
  try {
    const alert = (await Alert.all()).find(alert => alert.identifier === alertId)
    if(alert === undefined){
      console.log(`Alert(${alertId}) has not been found`)
    } else {
      const signals = await alert.signals()
      if (signals.length === 0){
        console.log(`Alert(${alertId}) has not yet emitted any signals`)
      } else {
        const result = [
          `Alert(${alertId}):`,
          ...signals.map(signal => `${signal.trigger_ts.toISOString()}: ${signal.observed_level} (alert: above ${signal.alert_level})`)
        ].join('\n')
        console.log(result)
      }
    }
  } catch(err) {
    console.error(err)
  } finally {
    ConnectionPool.sharedInstance.end()
  } 
}

export const createAlertMetaResponse = async (alertId: string) => {
  try {
    const alert = (await Alert.all()).find(alert => alert.identifier === alertId)
    if(alert === undefined){
      console.log(`Alert(${alertId}) has not been found`)
    } else {
      console.log(alert)
    }
  } catch(err) {
    console.error(err)
  } finally {
    ConnectionPool.sharedInstance.end()
  }
}