"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePGInterval = void 0;
/**
 * @param interval postgres string interval HH:MM:SS
 * @returns seconds
 */
exports.parsePGInterval = (interval) => interval.split(':').reduce((acc, time) => (60 * acc) + parseInt(time), 0);
