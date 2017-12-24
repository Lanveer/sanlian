/**
 * Created by walter on 2016/6/13.
 */

const validator = require('validator');
const uuid = require('uuid');
const sms = require('./sms');

/**
 * 发送短信验证码
 * @param {string} mobile
 * @param {function} callback
 * @returns {*}
 */
var sendVerify = function (mobile, callback) {
  var code = Math.random()*1000000|0;
  var sms_id = uuid.v1();
  var error = new Error();
  if(!validator.isMobilePhone(mobile,'zh-CN')){
    error.message = '手机号码错误!';
    error.code = 401;
    return callback(error);
  }
  sms.sendVerify(mobile,code,function (err, data) {
    if(err){
      error.message = err.message;
      error.code = 402;
      return callback(error);
    } 
    Redis.set('SMS:'+sms_id,code,'EX',600);
    var result = {
      sms_id:sms_id,
      code:code
    };
    callback(null,result);
  });
};
exports.sendVerify = sendVerify;

/**
 * 验证短信验证码
 * @param {string} sms_id
 * @param {string} code
 * @param callback
 * @returns {*}
 */
var verifySms = function (sms_id, code, callback) {
  var error = new Error();
  if(!sms_id||!code){
    error.message = '短信ID或验证码必须';
    error.code = 400;
    return callback(error);
  }
  Redis.get('SMS:'+sms_id,function (err, data) {
    var real_code = data |0;
    if(real_code!=code){
      error.message = '验证码错误';
      error.code = 403;
      return callback(error)
    }
    callback(null)
  })
};
exports.verifySms = verifySms;