/**
 * Created by walter on 2016/6/16.
 */
var baseConfig = require('../../config');

var config = {
  'PARTNER':'2088911944368555',
  'SELLER_ID':'sanlian@scsanlian.com.cn',
  'ALI_APPID':'2016050501365198',
  'ALI_KEY':'u1lkwioo6ln5lsd3luf634jjq83no6jd',
  'PRIVATE_KEY_PATH':__dirname+'/cert/rsa_private_key.pem',
  'ALI_PUBLIC_KEY_PATH':__dirname+'/cert/alipay_public_key.pem',
  'CACERT_PATH':__dirname+'/cert/cacert.pem',

  'PAY_NOTIFY_URL':baseConfig.host+'/api/callback/aliPayPay',
  'RECHARGE_NOTIFY_URL':baseConfig.host+'/api/callback/alipayRecharge',
  'CHALLENGE_NOTIFY_URL':baseConfig.host+'/api/callback/alipayChallenge',
  'ENTERCOMPETITION_NOTIFY_URL':baseConfig.host+'/api/callback/alipayEnterCompetition',
  'REFUND_NOTIFY_URL':baseConfig.host+'/api/callback/alipayRefund',
  'ALI_POST_CHARSET':'UTF-8',
  'input_charset':'utf-8'
};

module.exports = config;