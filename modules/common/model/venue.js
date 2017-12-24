/**
 * Created by walter on 2016/6/16.
 */
const util = require('util');
const _ = require('lodash');

var baseModel = require('./baseModel');

/*场馆*/
function Venue() {
  this.table = 'venue';
  baseModel.call(this);
  this.primary_key = 'venue_id';

  this.insert_require = ['name','phone','intro','lng','lat','address'];
  this.rules = [
    {
      'key':'phone',
      'function':'isMobilePhone',
      'arg':'zh-CN',
      'msg':'手机号格式错误'
    }
  ];
}

util.inherits(Venue,baseModel);


Venue.prototype.search = function (queryParams,callback) {
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

/**
 * 新增场馆
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
Venue.prototype.addVenue = function (data, callback) {

  try {
    this.checkRequire(data);
    this.checkRule(data);
  } catch (err) {
    return callback(err);
  }

  this.add(data,callback);
};

module.exports = Venue;