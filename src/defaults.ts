import { Metric, MetricStatistic, LogRecordProperty } from './Metric'
import { Alert } from './Alert'

const tenSeconds = 10
const oneDay = 60 * 60 * 24

// Requirement #2: 
// stats every 10s about the traffic during those 10s: the sections of the web site with the most hits, 
// A section is defined as being what's before the second '/' in the resource section of the log line.
//
// We create a metric that has composite groups based on (root_route, 10sec timebucket) and aggregate
export const totalTrafficPerRoute = new Metric('total_traffic_per_route', {
  statistic: MetricStatistic.Sum,
  property: LogRecordProperty.EntireRow,
  period: tenSeconds,
  startOffset: oneDay,
  endOffset: tenSeconds,
  refreshInterval: tenSeconds,
  segmentExpression: `split_part(request_route, '/', 2)`
})


// Requirement #3
// aggregate total traffic in 1 second buckets
const oneSecond = 1 
export const totalTraffic = new Metric('total_traffic', {
  statistic: MetricStatistic.Sum,
  property: LogRecordProperty.EntireRow,
  period: oneSecond,
  startOffset: oneDay,
  endOffset: oneSecond,
  refreshInterval: oneSecond
})

// Requirement #3
// for total traffic minutely sums, run the periodic job that will check the average of those 1min buckets
const twoMin = 120
export const totalTrafficAlert = new Alert(totalTraffic, 10, 'totaltraffic', MetricStatistic.Average, {
  offset: twoMin
})


