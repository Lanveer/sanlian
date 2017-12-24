/**
 * Created by walter on 2016/6/16.
 */
var AliPay = require('./lib/alipay');
var config = require('./config');

exports.AliPay = new AliPay();
exports.config = config;
