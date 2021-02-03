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
const ConnectionPool = require("../ConnectionPool");
const alertTemplate = require('../sql_templates/alert.template.sql');
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
        this.identifier = alertIdentifier;
        this.metricIdentifier = metric.identifier;
        this.alertName = alertName || alertIdentifier;
        this.offset = offset;
        this.alertLevel = alertLevel;
        this.period = period || metric.period;
    }
    createQuery() {
        // renaming class property names requires doing the same in template
        return mustache_1.render(alertTemplate, Object.assign({}, this));
    }
    static all() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield ConnectionPool.sharedInstance.query(userdefinedJobs);
            console.log(result);
        });
    }
}
exports.Alert = Alert;
