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
exports.Metric = exports.LogRecordProperty = exports.MetricStatistic = void 0;
const mustache_1 = require("mustache");
const ConnectionPool = require("./ConnectionPool");
const metricTemplate = require('../sql_templates/metric.template.sql');
const observationsQueryTemplate = require('../sql_templates/metric_observations.template.sql');
const continiousAggregatesQuery = require('../sql/continuous_aggregates.sql');
const continiousAggregateInfoQueryPattern = /SELECT\s*(?<customSegmentExpression>.*)\s*,?time_bucket\('(?<period>.*?)'::interval,\s*logrecords\.ts\)\s*AS\s*tbucket,\s*(?<statistic>[a-z]*)\((?<property>[a-z_\*]*)\)\s*AS\s*(?<identifier>[a-z_]*)\s*.*/;
const DEFAULT_METRIC_PERIOD = 60;
const DEFAULT_METRIC_START_OFFSET = 60 * 60 * 24;
/**
 * @param interval postgres string interval HH:MM:SS
 * @returns seconds
 */
const parsePGInterval = (interval) => interval.split(':').reduce((acc, time) => (60 * acc) + parseInt(time), 0);
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
var LogRecordProperty;
(function (LogRecordProperty) {
    LogRecordProperty["EntireRow"] = "*";
    LogRecordProperty["Timestamp"] = "ts";
    LogRecordProperty["Host"] = "host";
    LogRecordProperty["IndentLogname"] = "indent_logname";
    LogRecordProperty["User"] = "ruser";
    LogRecordProperty["RequestMethod"] = "request_method";
    LogRecordProperty["RequestRoute"] = "request_route";
    LogRecordProperty["RequestProto"] = "request_proto";
    LogRecordProperty["StatusCode"] = "status_code";
    LogRecordProperty["ResponseSize"] = "response_bsize";
})(LogRecordProperty = exports.LogRecordProperty || (exports.LogRecordProperty = {}));
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
    constructor(identifier, statistic = MetricStatistic.Sum, property = LogRecordProperty.EntireRow, period = DEFAULT_METRIC_PERIOD, startOffset = DEFAULT_METRIC_START_OFFSET, endOffset = null, refreshInterval = null, segmentExpression = "") {
        /**
         * identifier of timescaledb hypertable, set when metric gets persisted
         */
        this.hypertableId = null;
        if (period === 0) {
            console.warn(`Metric has been initialized with 0-seconds period, resseting it to default ${DEFAULT_METRIC_PERIOD}`);
        }
        this.identifier = identifier;
        this.statistic = statistic;
        this.property = property;
        this.period = period || DEFAULT_METRIC_PERIOD;
        this.startOffset = startOffset;
        this.endOffset = endOffset === null ? this.period : endOffset;
        this.refreshInterval = refreshInterval || this.period;
        this.segmentExpression = segmentExpression;
    }
    /**
     * is current metric persisted and materialized?
     */
    get isPersisted() {
        return this.hypertableId !== null;
    }
    /** a query to create a new row backing this model instance */
    createQuery() {
        // TODO: we should escape the values we are rendering
        // renaming class property names requires doing the same in template
        return mustache_1.render(metricTemplate, Object.assign(Object.assign({}, this), { customSegmentExpression: this.segmentExpression + ',' }));
    }
    /** a query to list all continious aggregates with job metadata */
    static listQuery() {
        return continiousAggregatesQuery;
    }
    /**
     * transforms sql query result row to model abstraction instance
     */
    static fromRepsentation(row) {
        const config = row.config;
        const identifier = row.view_name;
        const query = row.view_definition.split('\n').map(line => line.trim()).join(' ');
        const match = continiousAggregateInfoQueryPattern.exec(query);
        if (match === null) {
            console.error(`Ignored materialized view query: ${query}`);
            return null;
        }
        // check available capturing groups in query pattern
        const period = match.groups.period;
        const statistic = match.groups.statistic;
        const property = match.groups.property;
        const segmentExpression = match.groups.customSegmentExpression;
        const metric = new Metric(identifier, statistic, property, parsePGInterval(period), parsePGInterval(config.start_offset), parsePGInterval(config.end_offset), 
        // FIXME: need to parse this from query aswell, assume period for now
        parsePGInterval(period), segmentExpression.includes('AS') ? segmentExpression.split('AS')[0].trim() : segmentExpression.trim());
        metric.hypertableId = config.mat_hypertable_id;
        return metric;
    }
    /**
     * fetches all persisted metrics
     */
    static all() {
        return __awaiter(this, void 0, void 0, function* () {
            // we don't really need to have another table to store Metric metadata 
            // as we can retrieve original queries that generated continious aggregate
            const result = yield ConnectionPool.sharedInstance.query(continiousAggregatesQuery);
            return result.rows.map(row => Metric.fromRepsentation(row)).filter(repr => repr !== null);
        });
    }
    /**
     * persists this Metric by creating and populating timescale continuous aggregate
     */
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            // we need to split into individual queries as pg will automatically wrap into transaction otherwise
            const [createMaterializedViewQuery, addRefreshPolicyQuery, ..._] = this.createQuery().split(';');
            const _createMaterializedViewResult = yield ConnectionPool.sharedInstance.query(createMaterializedViewQuery);
            const _addPolicyResult = yield ConnectionPool.sharedInstance.query(addRefreshPolicyQuery);
            const meta = yield ConnectionPool.sharedInstance.query(`${continiousAggregatesQuery} WHERE view_name = $1`, [this.identifier]);
            this.hypertableId = meta.rows[0].config.mat_hypertable_id;
        });
    }
    delete() {
        return __awaiter(this, void 0, void 0, function* () {
            yield ConnectionPool.sharedInstance.query(mustache_1.render('DROP MATERIALIZED VIEW {{id}}', { id: this.identifier }));
            this.hypertableId = null;
        });
    }
    /**
     * fetches all observations for this metric
     */
    observations() {
        return __awaiter(this, void 0, void 0, function* () {
            const observationsQuery = mustache_1.render(observationsQueryTemplate, { identifier: this.identifier });
            const result = yield ConnectionPool.sharedInstance.query(observationsQuery);
            return result.rows.map(row => ({ ts: new Date(row.tbucket), value: row.total_logs }));
        });
    }
}
exports.Metric = Metric;
