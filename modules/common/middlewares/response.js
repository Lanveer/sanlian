/**
 * Created by walter on 2016/6/8.
 */
const _ = require('lodash');
const moment = require('moment');

var response = function (req, res, next) {

  res.success = function (data,isObject) {
    if(!data){
      if(isObject){
        data = {};
      }else {
        data = [];
      }
    }
    var response = {
      code:200,
      server_time:moment().unix(),
      msg:'',
      data:data
    };
    res.json(response);
  };

  res.error = function (code, msg) {
    var response = {};
    var err = new Error();
    if(_.isError(code)){
      err = code;
      if(_.isNil(err.code)||_.isString(err.code)){
        err.code = 500;       //服务端未知错误
      }
      response = {
        code:err.code,
        server_time:moment().unix(),
        msg:err.message,
        data:{}
      };
    }else {
      response = {
        code:code,
        server_time:moment().unix(),
        msg:msg,
        data:{}
      };
    }
    
    res.json(response);
  };

  res.wrong = function (msg) {
    var response = {
      msg:msg
    };
    res.status(501).json(response);
  };
  
  next();
};

exports.response = response;
