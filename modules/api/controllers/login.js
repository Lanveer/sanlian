/**
 * Created by walter on 2016/6/8.
 */
const validator = require('validator');
const uuid = require('uuid');
const moment = require('moment');
const _ = require('lodash');
const crypto = require('crypto');
const async = require('async');
const fs = require('fs');
const util = require('util');

var verifyTool = require('../../../util/verify');

var userModel = require('../../common/model').User;
var hotPointRecordModel = require('../../common/model').HotPointRecord;

/**
 * 发送短信验证码
 * @param req
 * @param res
 * @param next
 */


var sendVerify = function (req, res, next) {
  var phone = req.data.phone;

  verifyTool.sendVerify(phone,function (err, result) {
    if(err) return res.error(err);
    res.success(result);
  });
  
};
exports.sendVerify = sendVerify;

/*验证短信验证码*/
var verifySms = function (req, res, next) {
  var sms_id = req.data.sms_id;
  var code = req.data.code;
  verifyTool.verifySms(sms_id,code,function (err) {
    if(err) return res.error(err);

    res.success();
  });
  
};
exports.verifySms = verifySms;

/*注册*/
var register = function (req, res, next) {
  var data = {
    phone: req.data.phone,
    password: req.data.password,
    nickname:req.data.nickname,
    sms_id:req.data.sms_id,
    code:req.data.code,
    device:req.data.device,
    ver:req.data.ver,
    deviceuuid:req.data.deviceuuid,
    province_id:req.data.province_id,
    city_id:req.data.city_id,
    county_id:req.data.county_id
  };
  async.auto({
    "check_phone":function (callback) {
      if(!validator.isMobilePhone(data.phone,'zh-CN')){
        var err = new Error('手机号码错误!');
        err.code = 401;
        return callback(err);
      }
      callback(null);
    },
    "check_code":function (callback) {
      verifyTool.verifySms(data.sms_id,data.code,function (err) {
        if(err) return callback(err);
        callback(null);
      });
    },
    "phone_unique":function (callback) {
      userModel.count({phone:data.phone},function (err, result) {
        if(err) return callback(err);
        if(result){
          var error = new Error('该手机号已注册！');
          error.code = 408;
          return callback(error);
        }
        callback(null);
      });
    },
    "nickname_unique":function (callback) {
      userModel.count({nickname:data.nickname},function (err, result) {
        if(err) return callback(err);
        if(result){
          var error = new Error('该昵称已存在!');
          error.code = 406;
          return callback(error);
        }
        callback(null);
      });
    },
    "md5_pwd":function (callback) {
      var md5 = crypto.createHash('md5');
      var md5_password = '';
      md5.update(data.password);
      md5_password = md5.digest('hex');
      callback(null,data.password);
    },
    "add_user":['check_phone','check_code','phone_unique','nickname_unique','md5_pwd',function (results, callback) {
      console.log(results);
      data.password = results['md5_pwd'];
      data.token = uuid.v4();
      userModel.addUser(data,function (err, newId) {
        if(err){
          var error = new Error(err.message);
          error.code = 407;
          return callback(error);
        }
        callback(null,newId);
      });
    }]
  },function (err, results) {
    if(err) return res.error(err);
    var user_id = results['add_user'];

    if(_.isNil(user_id)){
      return res.error(407,'注册失败');
    }
    userModel.find({user_id:user_id},function (err, userInfo) {
      if(err) return res.error(err);

      res.success(userInfo);
    });
  });
};
exports.register = register;

/*普通登录*/
var login = function (req, res, next) {
  var log_path = "log/login.log";
  var ip = req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;
  fs.appendFileSync(log_path,moment().format("MM-DD H:m:s")+" phone=="+req.data.phone+"   ip  "+ip+"==="+JSON.stringify(req.headers)+"\n");
  if(!req.data.phone){
    var err = new Error("参数不完整");
    return res.error(err);
  }
  var phone = validator.trim(req.data.phone);
  var password = validator.trim(req.data.password);
  var ver = validator.trim(req.data.ver);
  var device = validator.trim(req.data.device);
  var deviceuuid = validator.trim(req.data.deviceuuid);

  var is_first_login = 0;
  async.auto({
    "user_info":function (callback) {
      userModel.find({"phone":phone},function (err, userInfo) {
        if(err) return callback(err);
        if(_.isEmpty(userInfo)){
          var error = new Error('该用户不存在！');
          error.code = 409;
          return callback(error);
        }
        callback(null,userInfo);
      });
    },
    "check_password":["user_info",function (results,callback) {
      var userInfo = results['user_info'];
      if(userInfo['password'] !== password){
        var error = new Error('密码错误！');
        error.code = 410;
        return callback(error);
      }
      callback();
    }],
    "update_user":["check_password",function (results, callback) {
      var userInfo = results['user_info'];
      var data = {
        "token":uuid.v4(),
        "last_login_time":moment().unix(),
        "device": device,
        "deviceuuid": deviceuuid,
        "ver": ver
      };

      userModel.updateUser({user_id: userInfo.user_id},data,function (err, result) {
        if(err) return callback(err);

        callback(null,userInfo,data);
      });
    }],
    "add_hot_point":["check_password",function (results, callback) {
      var userInfo = results['user_info'];
      var today = moment().format("YYYY-MM-DD");
      var data = {};
      var last_login_day = moment.unix(userInfo['last_login_time']|0).format("YYYY-MM-DD");
      if(today==last_login_day){
        return callback(null,0);
      }
      data['hot_point'] = ["hot_point+",3];
      data['total_hot_point'] = ["total_hot_point+",3];
      userModel.updateUser({user_id:userInfo.user_id},data,function (err, result) {
        callback(err,1);
      });
    }],
    "add_hot_point_record":["add_hot_point",function (results, callback) {
      var is_add = results['add_hot_point'];
      var userInfo = results['user_info'];
      is_first_login = is_add;
      if(!is_add){
        return callback();
      }
      var data ={
        "user_id":userInfo.user_id,
        "hot_point":3,
        "type":0,
        "remark":util.format("%s登录赠送",moment().format("YYYY-MM-DD")),
        "last_hot_point":userInfo.hot_point
      };
      hotPointRecordModel.addRecord(data,callback);
    }],
    "get_info":["update_user","add_hot_point",function (results, callback) {
      var userInfo = results['user_info'];
      userModel.getById(userInfo['user_id'],callback);
    }]
  },function (err, results) {
    if(err) return res.error(err);
    var result = results['get_info'];
    result['is_first_login'] = is_first_login;
    res.success(result);
  });
};
exports.login = login;

/*三方登录*/
var otherLogin = function (req, res, next) {
  var ver = validator.trim(req.data.ver);
  var device = validator.trim(req.data.device);
  var deviceuuid = validator.trim(req.data.deviceuuid);
  var open_id = validator.trim(req.data.open_id);
  var type = req.data.type|0;
  var queryParams = {};
  var is_first_login = 0;
  switch (type){
    case 0:
      queryParams['qq_id'] = open_id;
      break;
    case 1:
      queryParams['weixin_id'] = open_id;
      break;
    case 2:
      queryParams['weibo_id'] = open_id;
      break;
    default:
      return res.error(400,'三方登录类型未知');
      break;
  }
  async.auto({
    "user_info":function (callback) {
      userModel.find(queryParams,callback);
    },
    "update_user":["user_info",function (results, callback) {
      var userInfo = results['user_info'];
      if(_.isEmpty(userInfo)){
        return callback();
      }
      var data = {
        "token":uuid.v4(),
        "last_login_time":moment().unix(),
        "device": device,
        "deviceuuid": deviceuuid,
        "ver": ver
      };
      userModel.updateUser({user_id: userInfo.user_id},data,function (err, result) {
        if(err) return callback(err);

        callback(null);
      });
    }],
    "add_hot_point":["user_info",function (results, callback) {
      var userInfo = results['user_info'];
      if(_.isEmpty(userInfo)){
        return callback();
      }
      var today = moment().format("YYYY-MM-DD");
      var data = {};
      var last_login_day = moment.unix(userInfo['last_login_time']|0).format("YYYY-MM-DD");
      if(today==last_login_day){
        return callback(null,0);
      }
      data['hot_point'] = ["hot_point+",3];
      data['total_hot_point'] = ["total_hot_point+",3];
      userModel.updateUser({user_id:userInfo.user_id},data,function (err, result) {
        callback(err,1);
      });
    }],
    "add_hot_point_record":["add_hot_point",function (results, callback) {
      var is_add = results['add_hot_point'];
      var userInfo = results['user_info'];
      if(_.isEmpty(userInfo)){
        return callback();
      }
      is_first_login = is_add;
      if(!is_add){
        return callback();
      }
      var data ={
        "user_id":userInfo.user_id,
        "hot_point":3,
        "type":0,
        "remark":util.format("%s登录赠送",moment().format("YYYY-MM-DD")),
        "last_hot_point":userInfo.hot_point
      };
      hotPointRecordModel.addRecord(data,callback);
    }],
    "get_info":["update_user","add_hot_point",function (results, callback) {
      var userInfo = results['user_info'];
      if(_.isEmpty(userInfo)){
        return callback(null,{"user_exist":0});
      }
      userModel.getById(userInfo['user_id'],function (err, data) {
        data['user_exist'] = 1;
        callback(err,data);
      });
    }]
  },function (err, results) {
    if(err) return res.error(err);
    var data = results['get_info'];
    data['is_first_login'] = is_first_login;
    res.success(data);
  });
};
exports.otherLogin = otherLogin;

/*通过三方注册*/
var otherRegister = function (req, res, next) {
  var ver = validator.trim(req.data.ver);
  var device = validator.trim(req.data.device);
  var deviceuuid = validator.trim(req.data.deviceuuid);
  var phone = validator.trim(req.data.phone);
  var sms_id = validator.trim(req.data.sms_id);
  var code = validator.trim(req.data.code);
  var type = req.data.type|0;
  var open_id = validator.trim(req.data.open_id);

  var open_data = {};
  switch (type){
    case 0:
      open_data['qq_id'] = open_id;
      break;
    case 1:
      open_data['weixin_id'] = open_id;
      break;
    case 2:
      open_data['weibo_id'] = open_id;
      break;
    default:
      return res.error(400,'三方登录类型未知');
      break;
  }

  async.waterfall([
    function (callback) {
      verifyTool.verifySms(sms_id,code,function (err) {
        if(err) return callback(err);

        callback(null);
      });
    },
    function (callback) {
      userModel.find({phone:phone},function (err, userInfo) {
        if(err) return callback(err);

        if(_.isEmpty(userInfo)){
          return callback(null,null);
        }else {
          var data = {
            "token":uuid.v4(),
            "ver":ver,
            "device": device,
            "deviceuuid": deviceuuid
          };
          data = _.merge(data,open_data);
          userModel.updateUser({user_id:userInfo['user_id']},data,function (err, result) {
            if(err) return callback(err);

            return callback(null,userInfo['user_id']);
          })
        }
      });
    }
  ],function (err, user_id) {
    if(err) return res.error(err);

    if(_.isNil(user_id)){
      return res.success({
        user_exist: 0
      });
    }
    userModel.find({user_id:user_id},function (err, userInfo) {
      if(err) return res.error(err);

      userInfo['user_exist'] = 1;
      res.success(userInfo);
    });
  });
};
exports.otherRegister = otherRegister;

/*通过三方注册——用户不存在时*/
var otherRegister2 = function (req, res, next) {
  var ver = validator.trim(req.data.ver);
  var device = validator.trim(req.data.device);
  var deviceuuid = validator.trim(req.data.deviceuuid);
  var phone = validator.trim(req.data.phone);
  // var sms_id = validator.trim(req.data.sms_id);
  // var code = validator.trim(req.data.code);
  var type = req.data.type|0;
  var open_id = validator.trim(req.data.open_id);
  var nickname = validator.trim(req.data.nickname);
  var province_id = req.data.province_id;
  var city_id = req.data.city_id;
  var county_id = req.data.county_id;

  var open_data = {};
  switch (type){
    case 0:
      open_data['qq_id'] = open_id;
      break;
    case 1:
      open_data['weixin_id'] = open_id;
      break;
    case 2:
      open_data['weibo_id'] = open_id;
      break;
    default:
      return res.error(400,'三方登录类型未知');
      break;
  }

  async.waterfall([
    // function (callback) {
    //   verifyTool.verifySms(sms_id,code,function (err) {
    //     if(err) return callback(err);
    //
    //     callback(null);
    //   });
    // },
    function (callback) {
      userModel.find({phone:phone},function (err, userInfo) {
        if(err) return callback(err);

        if(_.isEmpty(userInfo)){
          userModel.count({nickname:nickname},function (err, result) {
            if(err) return callback(err);

            var data = {
              "token":uuid.v4(),
              "ver":ver,
              "device": device,
              "deviceuuid": deviceuuid,
              "phone": phone,
              "nickname":nickname,
              "province_id":province_id,
              "city_id":city_id,
              "county_id":county_id
            };
            data = _.merge(data,open_data);
            userModel.addUser(data,function (err, newId) {
              if(err) return callback(err);

              return callback(null,newId);
            });
          });
        }else {
          var error = new Error('该用户已存在！');
          error.code = 400;
          return callback(error);
        }
      });
    }
  ],function (err, user_id) {
    if(err) return res.error(err);

    userModel.find({user_id:user_id},function (err, userInfo) {
      if(err) return res.error(err);

      res.success(userInfo);
    });
  });
};
exports.otherRegister2 = otherRegister2;

/*忘记密码*/
var forgetPWD = function (req, res, next) {
  var phone = validator.trim(req.data.phone);
  var password = validator.trim(req.data.password);
  var sms_id = req.data.sms_id;
  var code = req.data.code;

  async.auto({
    "check_code":function (callback) {
      verifyTool.verifySms(sms_id,code,function (err) {
        if(err) return callback(err);

        callback(null);
      })
    },
    "check_phone":function (callback) {
      userModel.count({phone:phone},function (err, result) {
        if(err) return callback(err);

        if(!result){
          var error = new Error('该用户未注册!');
          error.code = 409;
          return callback(error);
        }
        callback(null);
      })
    },
    "change_pwd":["check_code","check_phone",function (results,callback) {
      userModel.updateUser({phone:phone},{password:password},function (err, result) {
        if(err) return callback(err);

        callback(null);
      })
    }]
  },function (err, results) {
    if(err) return res.error(err);

    res.success();
  })
};
exports.forgetPWD = forgetPWD;
