/**
 * Created by walter on 2016/6/16.
 */
const util = require('util');
const _ = require('lodash');

var baseModel = require('./baseModel');

/*场地*/
function Court() {
  this.table = 'court';
  baseModel.call(this);
  this.primary_key = 'court_id';

  this.insert_require = ['venue_id','name','type','phone','intro','lng','lat','address'];
  this.rules = [
    {
      'key':'phone',
      'function':'isMobilePhone',
      'arg':'zh-CN',
      'msg':'手机号格式错误'
    }
  ];
}

util.inherits(Court,baseModel);


Court.prototype.search = function (queryParams,callback) {
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
  condition['order'] = order+' '+sort;

  this.select(queryParams,condition,callback);

};


Court.prototype.getById = function (id, callback) {
  var param = {
    "court_id":id|0
  };
  this.find(param,function (err, data) {
    if(err) return callback(err);

    if(data.image){
      data.image = JSON.parse(data.image);
    }else {
      data.image = [];
    }
    callback(null,data);
  })
};

/**
 * 新增场地
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
Court.prototype.addCourt = function (data, callback) {

  try {
    this.checkRequire(data);
    this.checkRule(data);
  } catch (err) {
    return callback(err);
  }

  this.add(data,callback);
};

module.exports = Court;