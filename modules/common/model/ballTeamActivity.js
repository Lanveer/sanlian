/**
 * Created by walter on 2016/6/16.
 */
const util = require('util');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');

var baseModel = require('./baseModel');

/*球队活动*/
function BallTeamActivity() {
  this.table = 'ball_team_activity';
  baseModel.call(this);
  this.primary_key = 'id';

  this.insert_require = ['ball_team_id','user_id','create_time','name','activity_time','ensure_money','addr','plan_person_num','intro'];
  this.rules = [];
}

util.inherits(BallTeamActivity,baseModel);


BallTeamActivity.prototype.search = function (queryParams,callback) {
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

BallTeamActivity.prototype.getById = function (id, callback) {
  var query = {};
  query['id'] = id;
  query['field'] = [
      't_ball_team_activity.*',
      'b.name AS ball_team_name,b.logo AS ball_team_logo'
  ];
  query['join'] = [
      'join t_ball_team AS b on t_ball_team_activity.ball_team_id = b.ball_team_id'
  ];
  this.find(query,callback);

};



/**
 * 添加球队活动
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
BallTeamActivity.prototype.addBallTeamActivity = function (data, callback) {

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
BallTeamActivity.prototype.addBallTeamActivity2 = function (connection, data, callback) {

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

module.exports = BallTeamActivity;