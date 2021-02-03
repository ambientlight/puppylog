import { readFileSync } from 'fs'

// allows us require('whatever.sql') as strings
require.extensions['.sql'] = function (module, filename) {
  module.exports = readFileSync(filename, 'utf8');
};

import { program } from 'commander'
import { metricsGeneralListResponse, createDefaultMetricsAlarmsSetResponse } from './responses'

const puppylog = program
  .description('Puppylog(A tiny distributed log collector) monitor')

const metrics = puppylog
  .command('metrics')
//   .option('-p, --peppers', 'Add peppers')
//   .option('-c, --cheese <type>', 'Add the specified type of cheese', 'marble')
//   .option('-C, --no-cheese', 'You do not want any cheese')
  .action(async args => {
    await metricsGeneralListResponse()
  })

metrics
  .command('create')
  .option('-d, --default', 'Create default metric set')
  .action(async args => {
    if(args.default === true){
      await createDefaultMetricsAlarmsSetResponse()
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