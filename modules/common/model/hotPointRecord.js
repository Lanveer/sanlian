/**
 * Created by walter on 2016/6/15.
 */
const util = require('util');
const async = require('async');
const _ = require('lodash');
const moment = require('moment');
var baseModel = require('./baseModel');

/*钱包变化记录*/
function HotPointRecord() {
  this.table = 'hot_point_record';
  baseModel.call(this);
  this.primary_key = 'id';

  this.insert_require = ['user_id','create_time','type','remark','hot_point'];
  this.rules = [];
}

util.inherits(HotPointRecord,baseModel);


HotPointRecord.prototype.search = function (queryParams,callback) {
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
 * 添加热点记录
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
HotPointRecord.prototype.addRecord = function (data, callback) {

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
HotPointRecord.prototype.addRecord2 = function (connection, data, callback) {

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

module.exports = HotPointRecord;