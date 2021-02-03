import { readFileSync } from 'fs'

// allows us require('whatever.sql') as strings
require.extensions['.sql'] = function (module, filename) {
  module.exports = readFileSync(filename, 'utf8');
};

import { program } from 'commander'
import { metricsGeneralListResponse, createDefaultMetricsAlarmsSetResponse, createMetricDetailResponse, createMetricMetaResponse, createNewMetricAndResponse } from './responses'
import { supportedStatistic } from './Metric';

const puppylog = program
  .description('Puppylog(A tiny distributed log collector) monitor')

const metrics = puppylog
  .command('metrics')
//   .option('-c, --cheese <type>', 'Add the specified type of cheese', 'marble')
  .action(async args => {
    await metricsGeneralListResponse()
  })

metrics
  .command('get <metrics_identifier>')
  .description('display latest metric observations')
  .action(async metricId => {
    await createMetricDetailResponse(metricId)
  })

metrics
  .command('meta <metrics_identifier>')
  .description('display metric metadata')
  .action(async metricId => {
    await createMetricMetaResponse(metricId)
  })

// node ./dist/monitor.js metrics create -id magic -s count --prop \* --period 60 --refresh_rate 60

metrics
  .command('create')
  .description('create new metrics')
  .option('--default', 'Create default metric set')
  .requiredOption('-id, --identifier <string>', 'new metric id')
  .option('-s, --stat [stat]', 'new metric statistic (count/avg/min/max/stddev/variance)')
  .option('-p, --prop [prop]', 'new metric underlying property (*/ts/host/indent_logname/ruser/request_method/request_route/request_proto/status_code/response_bsize)')
  .option('-pr, --period [period]', 'new metric time bucket period (seconds)')
  .option('-rr, --refresh_rate [refresh]', 'new metric refresh rate (seconds)')
  .option('-seg, --segment_expression [segment]', 'new metric custom segment expression (pg function)')
  .action(async args => {
    if(args.default === true){
      await createDefaultMetricsAlarmsSetResponse()
    } else {
      await createNewMetricAndResponse(args)
    }
  })

puppylog.parse()

/*
program.parse();

const options = program.opts();
console.log('you ordered a pizza with:');
if (options.peppers) console.log('  - peppers');
const cheese = !options.cheese ? 'no' : options.cheese;
console.log('  - %s cheese', cheese);
*/