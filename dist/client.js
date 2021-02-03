"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const ConnectionPool = require("./ConnectionPool");
// allows us require('whatever.sql') as strings
require.extensions['.sql'] = function (module, filename) {
    module.exports = fs_1.readFileSync(filename, 'utf8');
};
const Metric_1 = require("./Metric");
const Alert_1 = require("./Alert");
(() => __awaiter(void 0, void 0, void 0, function* () {
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
    const metrics = yield Metric_1.Metric.all();
    const metric = metrics[0];
    const alert = new Alert_1.Alert(metric, 10, 'high_traffic_per_route');
    yield alert.save();
    console.log(alert);
    console.log(alert.isPersisted);
    yield alert.delete();
    console.log(alert.isPersisted);
    ConnectionPool.sharedInstance.end();
}))();
