/**
 * Created by walter on 2016/6/15.
 */
const util = require('util');
const async = require('async');
const _ = require('lodash');
const moment = require('moment');
var baseModel = require('./baseModel');

/*钱包变化记录*/
function VenueVip() {
  this.table = 'venue_vip';
  baseModel.call(this);
  this.primary_key = 'id';

  this.insert_require = ['venue_id','create_time','vip_id','discount'];
  this.rules = [];
}

util.inherits(VenueVip,baseModel);


VenueVip.prototype.search = function (queryParams,callback) {
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
 * 添加商品订单
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
VenueVip.prototype.addVenueVip = function (data, callback) {

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
VenueVip.prototype.addVenueVip2 = function (connection, data, callback) {

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

module.exports = VenueVip;