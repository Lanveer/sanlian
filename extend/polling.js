/**
 * Created by walter on 2016/8/16.
 */
require('../db_server');


var moment = require('moment');
var async = require('async');
var refund_task_lock  =0;
var status_task_lock  =0;
var remove_nonpay_lock = 0;
var i = 0;

var refund_task = require('./order_task').refund_task;
var status_tasks = require('./order_task').status_tasks;
var remove_nonpay = require('./order_task').remove_nonpay;

var timer = setInterval(function () {
    if(refund_task_lock) return 0;
    refund_task_lock = 1;
    refund_task(function (err) {
        refund_task_lock = 0;
    });
},30*1000);

setInterval(function () {
    if(status_task_lock) return 0;
    status_task_lock = 1;
    status_tasks(function (err) {
        // console.log(err);
        status_task_lock = 0;
    });
},30*1000);

setInterval(function () {
    if(remove_nonpay_lock) return 0;
    remove_nonpay_lock = 1;
    remove_nonpay(function (err) {
        remove_nonpay_lock = 0;
    });
},30*1000);

process.on("uncaughtException",function (err) {
    console.log(err);
    process.kill(process.pid,'HAS_ERROR');
});