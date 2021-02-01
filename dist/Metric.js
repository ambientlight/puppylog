"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Metric = exports.MetricStatistic = void 0;
const mustache_1 = require("mustache");
const metricTemplate = require('../sql_templates/metric.template.sql');
const DEFAULT_METRIC_PERIOD = 60;
const DEFAULT_METRIC_START_OFFSET = 60 * 60 * 24;
/**
 * A statistic that metric is collecting. Maps to SQL function.
 * NOTE: Take into account the period that is applied to this metric
 */
var MetricStatistic;
(function (MetricStatistic) {
    MetricStatistic["Sum"] = "COUNT";
    MetricStatistic["Average"] = "AVG";
    MetricStatistic["Min"] = "MIN";
    MetricStatistic["Max"] = "MAX";
    MetricStatistic["StdDev"] = "STDDEV";
    MetricStatistic["Variance"] = "VARIANCE";
})(MetricStatistic = exports.MetricStatistic || (exports.MetricStatistic = {}));
/**
 * Essential aggregated measument of interest over a numeric sequence
 * Each metric is persisted in a form of auto-updating materialized view
 *
 * Immutable, you cannot change the value in existing persisted metric
 * (We need to delete and recreate again)
 *
 * WARNING: mustache template maps directly to property names, renaming property names require also doing same in template
 */
class Metric {
    /**
     * creates a new metric but DOES NOT PERSIST it, call save() to persist
     *
     * @param identifier unique metric identifier
     * @param statistic static of interest
     * @param period metric period in seconds
     */
    constructor(identifier, statistic = MetricStatistic.Sum, period = DEFAULT_METRIC_PERIOD, startOffset = DEFAULT_METRIC_START_OFFSET, endOffset = null, refreshInterval = null) {
        if (period === 0) {
            console.warn(`Metric has been initialized with 0-seconds period, resseting it to default ${DEFAULT_METRIC_PERIOD}`);
        }
        this.identifier = identifier;
        this.statistic = statistic;
        this.period = period || DEFAULT_METRIC_PERIOD;
        this.startOffset = startOffset;
        this.endOffset = endOffset === null ? this.period : endOffset;
        this.refreshInterval = refreshInterval || this.period;
    }
    createQueryString() {
        return mustache_1.render(metricTemplate, Object.assign({}, this));
    }
}
exports.Metric = Metric;
