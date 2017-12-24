/**
 * Created by walter on 2016/6/15.
 */
var WXPay = require('./lib/wxpay');
var wx_config = require('./config');

exports.WXPay = new WXPay();
exports.config = wx_config;