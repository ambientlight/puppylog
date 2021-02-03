import { readFileSync } from 'fs' 
import * as ConnectionPool from './ConnectionPool';

// allows us require('whatever.sql') as strings
require.extensions['.sql'] = function (module, filename) {
  module.exports = readFileSync(filename, 'utf8');
};

import { LogRecordProperty, Metric, MetricStatistic } from './Metric'
import { Alert } from './Alert';


(async () => {
  
  /*
  const period = 10
  const metric = new Metric(
    'route_breakdown',
    MetricStatistic.Sum,
    LogRecordProperty.EntireRow,
    // period
    period,
    // start offset
    60 * 60 * 24,
    // end offset
    period,
    // refresh interval
    period,
    `split_part(request_route, '/', 2)`
  )

  await metric.save()
  console.log(metric)
  
  await metric.delete()
  console.log(metric)
  */

  const metrics = await Metric.all()
  const metric = metrics[0]
  const alert = new Alert(metric, 10, 'high_traffic_per_route')
  await alert.save()
  console.log(alert)
  console.log(alert.isPersisted)
  await alert.delete()
  console.log(alert.isPersisted)

  ConnectionPool.sharedInstance.end()
})()