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
// allows us require('whatever.sql') as strings
require.extensions['.sql'] = function (module, filename) {
    module.exports = fs_1.readFileSync(filename, 'utf8');
};
const Metric_1 = require("./Metric");
(() => __awaiter(void 0, void 0, void 0, function* () {
    // const metric = new Metric('total_traffic')
    console.log(yield Metric_1.Metric.all());
}))();
