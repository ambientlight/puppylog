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
exports.Metric = exports.MetricStatistic = void 0;
const mustache_1 = require("mustache");
const ConnectionPool = require("./ConnectionPool");
const metricTemplate = require('../sql_templates/metric.template.sql');
const continiousAggregatesQuery = require('../sql/continuous_aggregates.sql');
const DEFAULT_METRIC_PERIOD = 60;
const DEFAULT_METRIC_START_OFFSET = 60 * 60 * 24;
/**
 * A statistic that metric is collecting. Maps to SQL function.
 * NOTE: Take into account the period that is applied to this metric
 */
var MetricStatistic;
(function (MetricStatistic) {
    MetricStatistic["Sum"] = "count";
    MetricStatistic["Average"] = "avg";
    MetricStatistic["Min"] = "min";
    MetricStatistic["Max"] = "max";
    MetricStatistic["StdDev"] = "stddev";
    MetricStatistic["Variance"] = "variance";
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
        // TODO: we should escape the values we are rendering
        return mustache_1.render(metricTemplate, Object.assign({}, this));
    }
    static all() {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield ConnectionPool.sharedInstance.connect();
            const result = yield connection.query(continiousAggregatesQuery);
            const queryPattern = /SELECT time_bucket\('(?<period>.*?)'::interval,\s*logrecords\.ts\)\s*AS\s*tbucket,\s*(?<statistic>[a-z]*)\(\*\)\s*AS\s*(?<identifier>[a-z_]*)\s*.*/;
            // we don't really need to have another table to store Metric metadata 
            // as we can retrieve original queries that generated continious aggregate
            const materializedViewFragments = result.rows
                .map(row => ({
                config: row.config,
                identifier: row.view_name,
                query: row.view_definition.split('\n').map(line => line.trim()).join(' ')
            })).filter(({ identifier, query }) => {
                const match = queryPattern.exec(query);
                if (match === null) {
                    console.error(`Ignored materialized view query: ${query}`);
                }
                return match !== null;
            }).map(({ identifier, query, config }) => {
                const match = queryPattern.exec(query);
                return {
                    period: match.groups.period,
                    statistic: match.groups.statistic,
                    identifier,
                    config
                };
            });
            return materializedViewFragments;
        });
    }
}
exports.Metric = Metric;
