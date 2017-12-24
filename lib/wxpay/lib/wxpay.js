/**
 * Created by walter on 2016/6/15.
 */
const validator = require('validator');
const _ = require('lodash');
const crypto = require('crypto');
const xml2js = require('xml2js');
const request = require('request');
const fs = require('fs');
const moment = require('moment');
var config = require('../config');

function WXPay() {
  
}

/**
 * 生成随机字符串
 * @param {int} [length] 字符串长度
 * @returns {string}
 */
var getNonceStr = function (length) {
  if(_.isNil(length)){
    length = 32;
  }else {
    length = _.parseInt(length);
  }
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var str = '';
  for (var i=0;i<length;i++){
    str += chars.substr(_.random(0,chars.length-1),1);
  }
  return str;
};


/**
 * 获取签名
 * @param {object} param
 * @returns {string}
 */
var sign = function (param) {
  var querystring = Object.keys(param).filter(function (key) {
    return param[key] !== undefined && param[key] !== '' && ['pfx', 'partner_key', 'sign', 'key'].indexOf(key)<0;
  }).sort().map(function (key) {
    return key + '=' + param[key];
  }).join("&") + '&key=' + config.KEY;
  var md5 = crypto.createHash('md5');
  md5.update(querystring);
  return md5.digest('hex').toUpperCase();
};

/**
 * Object转XML
 * @param param
 * @returns {string}
 */
var toXML = function (param) {
  var builder = new xml2js.Builder({
    rootName:'xml',
    headless:true,
    cdata:true
  });
  var xml = builder.buildObject(param);
  return xml;
};

/**
 * XML转Object
 * @param {string} xml
 * @param {function} callback
 */
var toObject = function (xml, callback) {
  var parseString = xml2js.parseString;
  parseString(xml,callback);
};

/**
 * POST 方法
 * @param url
 * @param data
 * @param callback
 */
var post = function (url,data,callback) {
  var self = this;
  var request_data = {
    url:url,
    method:'POST',
    body:data,
    agentOptions:{
      // cert:fs.readFileSync(config.SSLCERT_PATH),
      // key:fs.readFileSync(config.SSLKEY_PATH),
      pfx:fs.readFileSync(config.PFX_PATH),
      passphrase:config.MCHID,
      securityOptions: 'SSLv3_method'
    }
  };
  request(request_data,function (err, response, body) {
    if(err) return callback(err);
    if(!body){
      var error = new Error("微信请求支付失败");
      return callback(error);
    }
    self.toObject(body,callback);
  });
};

/******************************************************/

WXPay.prototype.getNonceStr = getNonceStr;
WXPay.prototype.sign = sign;
WXPay.prototype.toXML = toXML;
WXPay.prototype.toObject = toObject;
WXPay.prototype.post = post;

/**
 *微信支付
 * @param order_no
 * @param txnTime
 * @param {float} fee 价格 单位：元
 * @param {string} body 订单说明
 * @param {string} client_ip 用户端IP
 * @param {string} notify_url 回调地址
 * @param callback
 */
WXPay.prototype.unifiedOrder = function (order_no, txnTime, fee, body, client_ip, notify_url, callback) {
  var url = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
  var request_data = {
    'appid':config.APPID,
    'mch_id':config.MCHID,
    'nonce_str':this.getNonceStr(),
    'body':_.trim(body),
    'out_trade_no':_.trim(order_no),
    'total_fee':_.round(fee*100),
    'spbill_create_ip':_.trim(client_ip),
    'notify_url':notify_url,
    'trade_type':'APP'
  };
  var sign_str = this.sign(request_data);
  request_data['sign'] = sign_str;
  var request_xml = this.toXML(request_data);
  this.post(url,request_xml,function (err, xml) {
    if(err) return callback(err);

    var data = xml['xml'];
    if(data['return_code'][0]!='SUCCESS'){
      var error = new Error(data['return_msg'][0]);
      return callback(error);
    }else if(data['result_code']!='SUCCESS'){
      var error = new Error(data['err_code_des'][0]);
      return callback(error);
    }else {
      callback(null,data);
    }
  });
};

/**
 * 获取APP端所需的数据
 * @param {string} prepayId
 * @returns {{appid: string, partnerid: string, prepayid: *, package: string, noncestr: (string|*), timestamp: number}}
 */
WXPay.prototype.getAppRequest = function (prepayId) {
  var data = {
    'appid':config.APPID,
    'partnerid':config.MCHID,
    'prepayid':prepayId,
    'package':'Sign=WXPay',
    'noncestr':this.getNonceStr(),
    'timestamp':moment().unix()
  };
  var sign_str = this.sign(data);
  data['sign'] = sign_str;
  return data;
};

/**
 * 退款接口
 * @param {string} trade_no 微信生成的订单号，在支付通知中有返回
 * @param {string} batch_no 退款批次号
 * @param {float} fee 金额 单位：元
 * @param {function} callback
 */
WXPay.prototype.refund = function (trade_no, batch_no, fee, callback) {
  var url = 'https://api.mch.weixin.qq.com/secapi/pay/refund';
  var data = {
    'appid':config.APPID,
    'mch_id':config.MCHID,
    'nonce_str':this.getNonceStr(),
    'transaction_id':trade_no,
    'out_refund_no':batch_no,
    'total_fee':fee*100,
    'refund_fee':fee*100,
    'op_user_id':config.MCHID
  };
  var sign_str = this.sign(data);
  data['sign'] = sign_str;
  var request_xml = this.toXML(data);
  this.post(url,request_xml,function (err, xml) {
    if(err) return callback(err);

    var data = xml['xml'];
    if(data['return_code'][0]!='SUCCESS'){
      var error = new Error(data['return_msg'][0]);
      return callback(error);
    }else if(data['result_code']!='SUCCESS'){
      var error = new Error(data['err_code_des'][0]);
      return callback(error);
    }else {
      callback(null,data);
    }
  });
};

module.exports = WXPay;