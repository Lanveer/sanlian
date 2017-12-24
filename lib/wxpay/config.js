/**
 * Created by walter on 2016/6/15.
 */
var baseConfig = require('../../config');

var config = {
  'APPID': 'wx7790f99abb7c7158',
  'MCHID':'1251428601',
  'KEY':'dsfhsdiofvnvuidvd243soe7a93hn8d9',
  'APPSECRET':'4a7b43141f6150bcfdbab4e2460abba3',
  'PAY_NOTIFY_URL':baseConfig.host+'/api/callback/wxPay',
  'RECHARGE_NOTIFY_URL':baseConfig.host+'/api/callback/wxRecharge',
  'CHALLENGE_NOTIFY_URL':baseConfig.host+'/api/callback/wxChallenge',
  'ENTERCOMPETITION_NOTIFY_URL':baseConfig.host+'/api/callback/wxEnterCompetition',
  'REFUND_NOTIFY_URL':baseConfig.host+'/api/callback/wxRefund',
  'SSLCERT_PATH':__dirname+'/cert/apiclient_cert.pem',
  'SSLKEY_PATH':__dirname+'/cert/apiclient_key.pem',
  'PFX_PATH':__dirname+'/cert/apiclient_cert.p12'
};

module.exports = config;