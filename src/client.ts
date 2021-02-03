import { readFileSync } from 'fs' 

// allows us require('whatever.sql') as strings
require.extensions['.sql'] = function (module, filename) {
  module.exports = readFileSync(filename, 'utf8');
};

import { Metric } from './Metric'

(async () => {
  // const metric = new Metric('total_traffic')

  const metrics = await Metric.all()
  console.log(metrics[0])
})()