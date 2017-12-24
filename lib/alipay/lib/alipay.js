/**
 * Created by walter on 2016/6/16.
 */
const _ = require('lodash');
const crypto = require('crypto');
const fs = require('fs');
const qs = require('querystring');
const moment = require('moment');
var config = require('../config');

function AliPay() {
  this.HTTPS_VERIFY_URL = 'https://mapi.alipay.com/gateway.do?service=notify_verify&';
  this.HTTP_VERIFY_URL = 'http://notify.alipay.com/trade/notify_query.do?';
  this.TRADE_URL = 'https://mapi.alipay.com/gateway.do?';
}

/**
 * 获取请求的参数
 * @param {object} request
 * @returns {string}
 */
var getRequestStr = function (request) {
  var str = '';
  _.forEach(request,function (value, key) {
    str += (key+'=\"'+value+'\"&');
  });
  str = _.trim(str,'&');
  return str;
};


/**
 * RSA签名
 * @param {string} request_str
 * @returns {*|string}
 */
var sign = function (request_str) {
  var signTool = crypto.createSign('RSA-SHA1');

  signTool.update(request_str);
  var private_pem = fs.readFileSync(config.PRIVATE_KEY_PATH);
  var sign_str = signTool.sign(private_pem,'base64');
  return sign_str;
};

/**
 * RSA 验证签名
 * @param data
 * @param sign
 */
var rsaVerify = function (data, sign) {
  var verifyTool = crypto.createVerify('RSA-SHA1');

  verifyTool.update(data);
  var public_pem = fs.readFileSync(config.ALI_PUBLIC_KEY_PATH);
  return verifyTool.verify(public_pem,sign,'base64');
};

/**
 * 验证签名
 * @param param
 * @param sign
 * @returns {number}
 */
var verifySign = function (param, sign) {
  var data = {};
  var str = "";
  var result = 0;
  _.each(param,function (value,key) {
    if(key=='sign'||key=='sign_type'||value==""){

    }else {
      data[key] = value;
    }
  });
  data = sortObject(data);
  str = createLinkString(data);
  result = rsaVerify(str,sign);
  return result;
};

/**
 * 对象根据key排序
 * @param {object} params
 * @returns {object}
 */
var sortObject = function (params) {
  var object = {};
  _.keys(params).sort().forEach(function (key) {
    object[key] = params[key];
  });
  return object;
};

/**
 * 转请求字符串
 * @param {object} params
 * @returns {string}
 */
var createLinkString = function (params) {
  var array = [];
  var str = '';
  _.forEach(params,function (value, key) {
    array.push(key+'='+value);
  });
  str = array.join('&');
  return str;
};

/*********************************************************************************/
AliPay.prototype.getRequestStr = getRequestStr;
AliPay.prototype.sign = sign;
AliPay.prototype.verifySign = verifySign;
AliPay.prototype.sortObject = sortObject;
AliPay.prototype.createLinkString = createLinkString;


/**
 * 获取APP所需参数
 * @param {string} order_no 订单号
 * @param {float} fee 交易金额 单位：元
 * @param {string} body 订单说明
 * @param {string} notify_url 回调URL地址
 * @returns {string|*}
 */
AliPay.prototype.getAppRequest = function (order_no, fee, body, notify_url) {
  var data = {
    'partner':config.PARTNER,
    'seller_id':config.SELLER_ID,
    'out_trade_no':_.trim(order_no),
    'subject': _.trim(body),
    'body':_.trim(body),
    'total_fee':fee,
    'notify_url':notify_url,
    'service':'mobile.securitypay.pay',
    'payment_type':'1',
    '_input_charset':'utf-8',
    'it_b_pay':'30m'
  };
  var request_str = this.getRequestStr(data);
  var sign_str = this.sign(request_str);
  data['sign'] = qs.escape(sign_str);
  data['sign_type'] = 'RSA';
  request_str = this.getRequestStr(data);
  return request_str;
};

/**
 * 获取退款URL
 * @param {string} batch_no 退款批号
 * @param {string} trade_no 原付款支付宝交易号
 * @param {float} fee 交易金额 元
 * @returns {string}
 */
AliPay.prototype.refund = function (batch_no, trade_no, fee) {
  var data = {
    'service':'refund_fastpay_by_platform_pwd',
    'partner':config.PARTNER,
    'seller_email':config.SELLER_ID,
    'seller_user_id':config.PARTNER,
    '_input_charset':'utf-8',
    'notify_url':config.REFUND_NOTIFY_URL,
    'refund_date':moment().format('YYYYMMDDHHmmss'),
    'batch_num':'1',
    'batch_no':batch_no,
    'detail_data':trade_no+'^'+fee+'^协商退款'
  };
  data = this.sortObject(data);
  var request_str = this.createLinkString(data);
  var sign_str = this.sign(request_str);
  data['sign'] = sign_str;
  data['sign_type'] = 'RSA';
  request_str = qs.encode(data);
  var request_url = this.TRADE_URL+request_str;
  return request_url;
};


module.exports = AliPay;
