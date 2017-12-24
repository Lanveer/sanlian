/**
 * Created by walter on 2016/6/16.
 */
const util = require('util');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');

var baseModel = require('./baseModel');

/*球队成员*/
function Qualifying() {
  this.table = 'qualifying';
  baseModel.call(this);
  this.primary_key = 'qualifying_id';

  this.insert_require = ['home_team_id','home_color','court_id','referee_id','start_time','end_time','fee'];
  this.rules = [];
}

util.inherits(Qualifying,baseModel);


Qualifying.prototype.search = function (queryParams,callback) {
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
  


  var ballTeamModel = require('./index').BallTeam;
  async.auto({
    "total":function (callback) {
      self.count(queryParams,callback);
    },
    "data":function (callback) {
      self.select(queryParams,condition,function (err, data) {
        async.forEachOf(data,function (value,index,callback) {
          async.auto({
            "home_team":function (callback) {
              ballTeamModel.find({"ball_team_id":value.home_team_id|0},callback);
            },
            "guest_team":function (callback) {
              ballTeamModel.find({"ball_team_id":value.guest_team_id|0},callback);
            }
          },function (err, results) {
            if(err) return callback(err);

            data[index]['home_team'] = results['home_team'];
            data[index]['guest_team'] = results['guest_team'];
            callback();
          });
        },function (err) {
          if(err) return callback(err);
          
          callback(null,data);
        });
      });
    }
  },function (err, result) {
    if(err) return callback(err);
    
    callback(null,result);
  });
  
};



/**
 * 添加排位赛
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
Qualifying.prototype.addQualifying = function (data, callback) {

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
Qualifying.prototype.addQualifying2 = function (connection, data, callback) {

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


module.exports = Qualifying;

