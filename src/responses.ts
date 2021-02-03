import { Metric } from './Metric'
import * as ConnectionPool from './ConnectionPool';
import { totalTrafficPerRoute, totalTraffic, totalTrafficAlert } from './defaults'

export const metricsGeneralListResponse = async () => {
  const metrics = await Metric.all()
  let result = ''
  if(metrics.length === 0){
    result += [
      'No metrics have been yet added. A good starting point would be to create default metrics set with:',
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
    'monitor metrics get <metric name>'
  ].join('\n')

  console.log(result)
  ConnectionPool.sharedInstance.end()
}

export const createDefaultMetricsAlarmsSetResponse = async () => {
  try {
    await totalTrafficPerRoute.save()
    await totalTraffic.save()
    await totalTrafficAlert.save()
  } catch(err) {
    if(err.code === '42P07'){
      console.log(`Default metrics/alert set should already be created`)
    } else {
      console.log(err)
    }
    
    ConnectionPool.sharedInstance.end()
    return
  }

  let result = [
    `Created metric ${totalTrafficPerRoute.identifier}`,
    `Created metric ${totalTraffic.identifier}`,
    `Created alert ${totalTrafficAlert.identifier}`
  ].join('\n')
  console.log(result)
  ConnectionPool.sharedInstance.end()
}