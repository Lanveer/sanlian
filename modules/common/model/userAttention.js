/**
 * Created by walter on 2016/6/16.
 */
const util = require('util');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');

var baseModel = require('./baseModel');

/*用户关注*/
function UserAttention() {
  this.table = 'user_attention';
  baseModel.call(this);
  this.primary_key = 'attention_id';

  this.insert_require = ['user_id','type','type_id','create_time'];
  this.rules = [];
}

util.inherits(UserAttention,baseModel);


UserAttention.prototype.search = function (queryParams,callback) {
  var self = this;
  var condition = {};
  var offset = 0;
  var limit = 5;
  var order = this.primary_key;
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
    order = _.trim(queryParams['order']);
    queryParams['order'] = undefined;
  }
  if(!_.isNil(queryParams['sort'])){
    sort = _.trim(queryParams['sort']);
    queryParams['sort'] = undefined;
  }
  condition['order'] = self.table+'.'+order+' '+sort;


  async.auto({
    "total":function (callback) {
      self.count(queryParams,callback);
    },
    "data":function (callback) {
      self.select(queryParams,condition,callback);
    }
  },function (err, result) {
    if(err) return callback(err);
    
    callback(null,result);
  });
  
};

/**
 * 用户是否关注
 * @param user_id
 * @param type
 * @param type_id
 * @param callback
 */
UserAttention.prototype.isAttention = function (user_id, type, type_id, callback) {
  this.count({user_id:user_id,type:type,type_id:type_id},callback);
};



/**
 * 添加用户关注
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
UserAttention.prototype.addUserAttention= function (data, callback) {

  if(_.isNil(data.create_time)){
    data.create_time = moment().unix();
  }

  try {
    this.checkRequire(data);
    this.checkRule(data);
  } catch (err) {
    return callback(err);
  }
  this.add(data,callback);
};

/**
 * 
 * @param connection
 * @param data
 * @param callback
 * @returns {*}
 */
UserAttention.prototype.addUserAttention2 = function (connection, data, callback) {

  if(_.isNil(data.create_time)){
    data.create_time = moment().unix();
  }

  try {
    this.checkRequire(data);
    this.checkRule(data);
  } catch (err) {
    return callback(err);
  }
  this.add2(connection,data,callback);
};

module.exports = UserAttention;