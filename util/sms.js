/**
 * Created by walter on 2016/6/8.
 */
const _ = require('lodash');
const request = require('request');
const paresString = require('xml2js').parseString;
const config = require('../config');

const url = 'https://106.ihuyi.com/webservice/sms.php?method=Submit';

var basic = {
  account:config.huyi.account,
  password:config.huyi.password
};

/**
 * 发送验证短信
 * @param mobile 手机号
 * @param code 验证码
 * @param callback
 */
var sendVerify = function (mobile, code, callback) {
  var content = '您的验证码是：【'+code+'】 。请不要把验证码泄露给其他人。';
  var main = {
    mobile:mobile,
    content:content
  };
  var option = {
    url:url,
    form:_.merge(basic,main)
  };

  post(option,callback);
};
exports.sendVerify = sendVerify;

/**
 * 向球场管理员发送球场被预定消息
 * @param mobile 管理员手机号
 * @param manager 球场管理员
 * @param user_mobile 用户手机号
 * @param callback
 */
var sendToManager = function (mobile, manager, user_mobile, callback) {
  var content = '订单通知：您好，【'+manager+'】管理员，您的球场已被手机号为【'+user_mobile+'】的用户预定，请您确认订单信息。 ';
  var main = {
    mobile:mobile,
    content:content
  };
  var option = {
    url:url,
    form:_.merge(basic,main)
  };

  post(option,callback);
};
exports.sendToManager = sendToManager;

/**
 * 发送Post
 * @param option
 * @param callback
 */
function post(option, callback) {
  request.post(option,function (err, res, body) {
    if(err){
      return callback(err);
    }

    try {
      paresString(body, {trim: true}, function (err, data) {
        if (err) return callback(err);

        if (data.SubmitResult.code != '2') {
          var error = new Error(data.SubmitResult.msg);
          return callback(error);
        }
        callback(null, data.SubmitResult);
        });
    } catch (e) {
      return callback(e);
    }
  });
}

