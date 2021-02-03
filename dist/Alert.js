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
exports.Alert = void 0;
const mustache_1 = require("mustache");
const ConnectionPool = require("./ConnectionPool");
const alertTemplate = require('../sql_templates/alert.template.sql');
const alertHistoryTemplate = require('../sql_templates/alerthistory.template.sql');
const userdefinedJobs = require('../sql/userdefined_jobs.sql');
const DEFAULT_ALERT_OFFSET = 60;
/**
 * A rule that is set against a certain level of underlying metric value
 *
 * Represented via a postgres stored procedure and timescale job that is checked against a metric on a schedule
 */
class Alert {
    /**
     * creates a new alert for a given metric
     * @param metric a metric that alert is attached to
     */
    constructor(metric, alertLevel, alertIdentifier, alertName = null, offset = DEFAULT_ALERT_OFFSET, period = null) {
        /**
         * identifier of timescaledb job backing this alert
         */
        this.jobId = null;
        this.identifier = alertIdentifier;
        this.metricIdentifier = metric.identifier;
        this.alertName = alertName || alertIdentifier;
        this.offset = offset;
        this.alertLevel = alertLevel;
        this.period = period || metric.period;
    }
    /**
     * is current alert persisted and running
     */
    get isPersisted() {
        return this.jobId !== null;
    }
    createQuery() {
        // renaming class property names requires doing the same in template
        return mustache_1.render(alertTemplate, Object.assign({}, this));
    }
    static fromRepsentation(row) {
        const alert = new Alert(
        // FIXME: small hack to reuse existing constructor
        { identifier: row.config.metric_identifier, period: row.schedule_interval.seconds }, row.config.level, row.proc_name, row.config.alert_name, parseInt(row.config.offset), row.schedule_interval.seconds);
        alert.jobId = row.job_id;
        return alert;
    }
    static all() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield ConnectionPool.sharedInstance.query(userdefinedJobs);
            return result.rows.map(row => Alert.fromRepsentation(row));
        });
    }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            const _createResult = yield ConnectionPool.sharedInstance.query(this.createQuery());
            const meta = yield ConnectionPool.sharedInstance.query(`${userdefinedJobs} AND proc_name = $1`, [this.identifier]);
            this.jobId = meta.rows[0].job_id;
        });
    }
    delete() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isPersisted) {
                console.warn(`Alert(${this.identifier}) is not persisted. Delete nothing`);
                return;
            }
            yield ConnectionPool.sharedInstance.query(mustache_1.render('SELECT delete_job({{id}})', { id: this.jobId }));
            this.jobId = null;
        });
    }
    /**
     * fetches all signals triggered for this alert
     */
    signals() {
        return __awaiter(this, void 0, void 0, function* () {
            const aleryHistory = mustache_1.render(alertHistoryTemplate, { identifier: this.identifier });
            const result = yield ConnectionPool.sharedInstance.query(aleryHistory);
            return result.rows;
        });
    }
}
exports.Alert = Alert;
