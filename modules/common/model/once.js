/**
 * Created by walter on 2016/6/16.
 */
const util = require('util');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');

var baseModel = require('./baseModel');

/*球场价格*/
function Once() {
  this.table = 'once';
  baseModel.call(this);
  this.primary_key = 'once_id';

  this.insert_require = ['court_id','start_time','end_time','price'];
  this.rules = [];
}

util.inherits(Once,baseModel);


Once.prototype.search = function (queryParams,callback) {
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
 * 添加球场价格
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
Once.prototype.addOnce = function (data, callback) {

  // if(_.isNil(data.create_time)){
  //   data.create_time = moment().unix();
  // }

  try {
    this.checkRequire(data);
    this.checkRule(data);
  } catch (err) {
    return callback(err);
  }

  this.add(data,callback);
};

module.exports = Once;