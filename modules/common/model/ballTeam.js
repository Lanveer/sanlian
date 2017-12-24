/**
 * Created by walter on 2016/6/16.
 */
const util = require('util');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const mysql = require('mysql');

var baseModel = require('./baseModel');
var BallTeamMember = require('./ballTeamMember');

var ballTeamMember = new BallTeamMember();

/*场馆*/
function BallTeam() {
  this.table = 'ball_team';
  baseModel.call(this);
  this.primary_key = 'ball_team_id';

  this.insert_require = ['uid','name','intro','create_time'];
  this.rules = [];
}

util.inherits(BallTeam,baseModel);


BallTeam.prototype.search = function (queryParams,callback) {
  var self = this;
  var condition = {};
  var offset = 0;
  var limit = 5;
  var order = this.primary_key;
  var sort = 'desc';

  if(_.isNil(queryParams['field'])){
    queryParams['field'] = '*,(game_win/game_times) AS win_rate';
  }

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

BallTeam.prototype.search2 = function (queryParams, callback) {
  var self = this;
  var condition = {};
  var offset = 0;
  var limit = 5;
  var order = this.primary_key;
  var sort = 'desc';
  condition['having'] = [];
  queryParams['field'] = [
    "	t_ball_team.*,AVG(ageOfBirthday(birthday)) AS avg_age,AVG(weight) AS avg_weight, AVG(height) AS avg_height",
    "(game_win/game_times) AS win_rate",
    "COUNT(user_id) AS member_num",
    "(SELECT COUNT(*) FROM t_ball_team AS t_1 WHERE is_verify=1 AND t_1.san_score>=t_ball_team.san_score) AS ranking"
  ];
  queryParams['join'] = [
    'LEFT JOIN t_ball_team_member AS m ON t_ball_team.ball_team_id = m.ball_team_id',
    'Left JOIN t_user ON t_user.user_id = m.uid'
  ];
  condition['group'] = 'ball_team_id';

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

  if(_.isArray(queryParams['win_rate'])&&!_.isEmpty(queryParams['win_rate'])){
    condition['having'].push(_.join(queryParams['win_rate']," OR "))
  }
  queryParams['win_rate'] = undefined;

  if(_.isArray(queryParams['ranking'])&&!_.isEmpty(queryParams['ranking'])){
    condition['having'].push(_.join(queryParams['ranking']," OR "))
  }
  queryParams['ranking'] = undefined;

  if(_.isArray(queryParams['avg_age'])&&!_.isEmpty(queryParams['avg_age'])){
    condition['having'].push(_.join(queryParams['avg_age']," OR "))
  }
  queryParams['avg_age'] = undefined;


  if(_.isArray(queryParams['avg_weight'])&&!_.isEmpty(queryParams['avg_weight'])){
    condition['having'].push(_.join(queryParams['avg_weight']," OR "))
  }
  queryParams['avg_weight'] = undefined;


  if(_.isArray(queryParams['avg_height'])&&!_.isEmpty(queryParams['avg_height'])){
    condition['having'].push(_.join(queryParams['avg_height']," OR "))
  }
  queryParams['avg_height'] = undefined;

  if(queryParams['name']){
    queryParams['name'] = ['like',mysql.escape('%'+queryParams['name']+'%')];
  }


  self.select(queryParams,condition,callback);
};


/**
 * 修改球队信息
 * @param {int} ball_team_id 球队ID
 * @param {object} data 
 * @param {function} callback
 */
BallTeam.prototype.updateBallTeam = function (ball_team_id, data,callback) {
  ball_team_id |=0;
  var self = this;
  async.series({
    "check_name":function (callback) {
      var error = new Error("该队名已存在");
      error.code = 429;
      if(!_.isNil(data['name']&&data['name'])){
        var params = {
          "name":data['name']
        };
        params['ball_team_id'] = ['!=',ball_team_id];
        self.count(params,function (err, num) {
          if(num){
            return callback(error);
          }
          callback()
        });
      }else {
        callback();
      }
    },
    "update":function (callback) {
      self.update({ball_team_id:ball_team_id},data,callback);
    }
  },function (err, results) {
    if(err) return callback(err);
    
    var result = results['update'];
    var error = new Error("修改球队信息失败");
    error.code = 430;
    if(result===false){
      return callback(error);
    }
    callback(null,result);
  });
};

/**
 * 根据ID获取球队信息
 * @param ball_team_id
 * @param callback
 */
BallTeam.prototype.getById = function (ball_team_id, callback) {
  var self = this;
  var queryParams = {
    'field':'t_ball_team.*,(game_win/game_times) AS win_rate,p.province,c.city,ct.county',
    'ball_team_id':ball_team_id|0
  };

  async.auto({
    "ball_team":function (callback) {
      queryParams['join'] = [
        'left join t_province AS p on t_ball_team.province_id=p.province_id',
        'left join t_city AS c on t_ball_team.city_id=c.city_id',
        'left join t_county AS ct on t_ball_team.county_id=ct.county_id'
      ];
      self.find(queryParams,callback);
    },
    "ball_team_member":function (callback) {
      queryParams['field'] = 't_ball_team_member.*,u.phone,u.nickname,u.avatar,u.height,u.weight,u.customary,u.goodAt,u.birthday,u.deviceuuid,ageOfBirthday(u.birthday) AS age';
      queryParams['join'] = ['join t_user as u on t_ball_team_member.uid=u.user_id'];
      queryParams['limit'] = 0;
      ballTeamMember.search(queryParams,callback);
    },
    "ranking":["ball_team",function (results, callback) {
      var ball_team = results['ball_team'];
      var queryParams = {
        'is_verify':1,
        'san_score':['>=',ball_team.san_score|0]
      };
      self.count(queryParams,{'sort':'san_score desc'},callback);
    }],
    "detail":['ball_team','ball_team_member',function (results, callback) {
      var data = results['ball_team'];
      // if(_.isEmpty(data)){
      //   return callback(null,[]);
      // }
      data.members = results['ball_team_member']['data'];
      var avg_data = getAverageNum(data.members);
      data = _.merge(data,avg_data);
      callback(null,data);
    }]
  },function (err, results) {
    if(err) return callback(err);
    // console.log(results['detail']);
    var data = results['detail'];
    data.ranking = results['ranking'];
    callback(null,data);
  })
};


/**
 * 获取球队详情
 * @param {object} queryParams
 * @param callback
 */
BallTeam.prototype.getDetail = function (queryParams, callback) {
  var self = this;

  if(_.isNil(queryParams['field'])){
    queryParams['field'] = '*,(game_win/game_times) AS win_rate';
  }
  async.auto({
    "ball_team":function (callback) {
      self.find(queryParams,callback);
    },
    "ball_team_member":["ball_team",function (results,callback) {
      var ball_team = results['ball_team'];
      if(_.isEmpty(ball_team)){
        return callback(null,[]);
      }
      var param = {ball_team_id:ball_team.ball_team_id};
      param['field'] = 't_ball_team_member.*,u.phone,u.nickname,u.avatar,u.height,u.weight,u.customary,u.goodAt,u.birthday';
      param['join'] = ['join t_user as u on t_ball_team_member.uid=u.user_id'];
      ballTeamMember.select(param,callback);
    }],
    "ranking":["ball_team",function (results, callback) {
      var ball_team = results['ball_team'];
      var queryParams = {
        'is_verify':1,
        'san_score':['>=',ball_team.san_score|0]
      };
      self.count(queryParams,{'sort':'san_score desc'},callback);
    }],
    "detail":['ball_team','ball_team_member',function (results, callback) {
      var data = results['ball_team'];
      if(!_.isEmpty(data)){
        data.members = results['ball_team_member'];
        var avg_data = getAverageNum(data.members);
        data = _.merge(data,avg_data);
      }

      callback(null,data);
    }]
  },function (err, results) {
    if(err) return callback(err);
    var data = results['detail'];
    if(!_.isEmpty(data)){
      data.ranking = results['ranking'];
    }

    callback(null,data);
  })
};

/**
 * 新增球队
 * @param {object} data
 * @param {function} callback
 * @returns {*}
 */
BallTeam.prototype.addBallTeam = function (data, callback) {

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
BallTeam.prototype.addBallTeam2 = function (connection, data, callback) {

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

/**
 *  获取队员的平均数
 * @param members
 * @returns {object}
 */
function getAverageNum(members) {
  var total = members.length;
  var data = {
    avg_height:0,
    avg_weight:0,
    avg_age:0
  };
  var result = _.reduce(members,function (result, value) {
    var age = moment().year() - moment.unix(value.birthday|0).year();
    result['avg_height'] = result['avg_height'] + _.toNumber(value.height);
    result['avg_weight'] = result['avg_weight'] + _.toNumber(value.weight);
    result['avg_age'] = result['avg_age'] + age
    return result;
  },data);
  result['avg_height'] = result['avg_height']/total;
  result['avg_weight'] = result['avg_weight']/total;
  result['avg_age'] = result['avg_age']/total;
  return result;
}

module.exports = BallTeam;