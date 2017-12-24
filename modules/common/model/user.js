/**
 * Created by walter on 2016/6/12.
 */
const util = require('util');
const moment = require('moment');
const validator = require('validator');
const _ = require('lodash');
const Mysql = require("mysql");

var baseModel = require('./baseModel');

/*用户*/
function User() {
  this.table = 'user';
  baseModel.call(this);
  this.primary_key = 'user_id';

  this.insert_require = ['phone','token','province_id','city_id','county_id','create_time','device','ver','deviceuuid','last_login_time'];
  this.rules = [
    {
      'key':'phone',
      'function':'isMobilePhone',
      'arg':'zh-CN',
      'msg':'手机号格式错误'
    },
    {
      'key':'email',
      'function':'isEmail',
      'arg':undefined,
      'msg':'邮箱格式错误'
    }
  ];
}
util.inherits(User,baseModel);

User.prototype.search = function (queryParams,callback) {
  var condition = {};
  var offset = 0;
  var limit = 5;
  var order = 'create_time';
  var sort = 'desc';

  if(!_.isNil(queryParams['limit'])){
    limit = queryParams['limit'] | 0;
    queryParams['limit'] = undefined;
  }
  if(!_.isNil(queryParams['offset'])){
    offset = queryParams['offset'] | 0;
    queryParams['offset'] = undefined;
  }
  if(limit){
    condition['limit'] = offset+','+limit;
  }

  if(!_.isNil(queryParams['order'])){
    order = validator.trim(queryParams['order']);
    queryParams['order'] = undefined;
  }
  if(!_.isNil(queryParams['sort'])){
    sort = validator.trim(queryParams['sort']);
    queryParams['sort'] = undefined;
  }
  condition['order'] = order+' '+sort;

  if(!_.isNil(queryParams['nickname'])){
    // console.log(queryParams);
    queryParams['nickname'] = ['like',Mysql.escape('%'+queryParams['nickname']+'%')]
  }


  this.select(queryParams,condition,callback);
  
};

/**
 * 根据用户ID获取用户信息
 * @param user_id
 * @param callback
 */
User.prototype.getById = function (user_id, callback) {
  console.log('mine user_id ishhhhhh:'+ user_id);
  var queryParams = {
    "user_id":user_id||0
  };
  queryParams['field'] = 't_user.*,ageOfBirthday(birthday) AS age';
  this.find(queryParams,function (err, data) {
    if(err) return callback(err);

    // if(!_.isEmpty(data)){
    //   data.age = getAge(data.birthday);
    // }
    callback(null,data);
  });
};

/**
 *  更新用户
 * @param {object} queryParams
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
User.prototype.updateUser = function (queryParams, data, callback) {
  try {
    this.checkRule(data);

  } catch (err) {
    err.code = 400;
    return callback(err);
  }
  this.update(queryParams,data,callback);
};


/**
 * 新增用户
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
User.prototype.addUser = function (data, callback) {

  if(_.isNil(data.create_time)){
    data.create_time = moment().unix();
  }

  if(_.isNil(data.last_login_time)){
    data.last_login_time = 0;
  }

  try {
    this.checkRequire(data);
    this.checkRule(data);
  } catch (err) {
    return callback(err);
  }
  
  this.add(data,callback);
};


User.prototype.getAge = getAge;

module.exports = User;

/**
 * 根据生日获取年龄
 * @param {int} birthday
 * @returns {int} age
 */
function getAge(birthday) {
  var time = moment.unix(birthday|0);
  var year_dif = 0;
  if(moment().date()<time.date()){
    year_dif = 1;
  }else if (moment().date()>time.date()){
    year_dif = 0;
  }

  if(moment().month()<time.month()){
    year_dif = 1;
  }else if(moment().month()>time.month()){
    year_dif = 0;
  }
  
  var age = moment().year()-time.year() + year_dif;
  return age;
}