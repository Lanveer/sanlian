/**
 * Created by walter on 2016/6/24.
 */
const _ = require('lodash');
const async = require('async');
const Util = require('util');

var qualifyingModel = require('../../common/model').Qualifying;
var ballTeamModel = require('../../common/model').BallTeam;
var courtModel = require('../../common/model').Court;
var refereeModel = require('../../common/model').Referee;
var cameramanModel = require('../../common/model').Cameraman;
var userAttentionModel = require('../../common/model').UserAttention;
var VenueVip = require('../../common/model').VenueVip;
var UserModel = require('../../common/model').User;
var VipModel = require('../../common/model').Vip;


/*排位赛详情*/
exports.qualifyingInfo = function (req, res, next) {
    var qualifying_id = req.data.qualifying_id;
  var user_id = req.user.user_id;
  async.auto({
    qualifying_info:function (callback) {
      var queryParam = {};
      queryParam['field'] = "t_qualifying.*,c.type AS court_type,CONCAT(v.name,'|',c.name) AS title,FROM_UNIXTIME(t_qualifying.start_time,'%Y年%c月%e日') AS date,FROM_UNIXTIME(t_qualifying.start_time,'%H:%i') AS start_hour,FROM_UNIXTIME(t_qualifying.end_time,'%H:%i') AS end_hour";

      queryParam['join'] = [
        'join t_court as c on c.court_id=t_qualifying.court_id',
        'join t_venue as v on v.venue_id=c.venue_id'
      ];
      queryParam['qualifying_id'] = qualifying_id;
      qualifyingModel.find(queryParam,callback);
    },
    "isAttention":function (callback) {
      userAttentionModel.isAttention(user_id,3,qualifying_id,callback);
    },
    home_team:["qualifying_info",function (results, callback) {
      var home_team_id = results['qualifying_info']['home_team_id'];
      if(home_team_id){
        ballTeamModel.getById(home_team_id,callback);
      }else {
        callback(null,{});
      }
    }],
    guest_team:["qualifying_info",function (results, callback) {
      var guest_team_id = results['qualifying_info']['guest_team_id'];
      if(guest_team_id){
        ballTeamModel.getById(guest_team_id,callback);
      }else {
        callback(null,{});
      }
    }],
    location:["qualifying_info",function (results, callback) {
      var qualifyingInfo = results['qualifying_info'];
      var court_id = qualifyingInfo.court_id;
      var queryParams = {"court_id":court_id};
      queryParams['field'] = 'v.venue_id,t_court.name as court_name,t_court.type,t_court.address,v.name as venue_name';
      queryParams['join'] = ['join t_venue as v on t_court.venue_id=v.venue_id'];
      courtModel.find(queryParams,callback);
    }],
    referee:["qualifying_info",function (results, callback) {
      var qualifyingInfo = results['qualifying_info'];
      var referee_id = qualifyingInfo.referee_id;
      if(referee_id){
        refereeModel.getById(referee_id,callback);
      }else {
        callback(null,{});
      }
    }],
    cameraman:["qualifying_info",function (results, callback) {
      var qualifyingInfo = results['qualifying_info'];
      var cameraman_id = qualifyingInfo.cameraman_id;
      callback(null,cameraman_id);
      // if(cameraman_id){
      //   cameramanModel.getById(cameraman_id,callback);
      // }else {
      //   callback(null,{});
      // }
    }]
  },function (err, results) {
    if(err) return res.error(err);

    res.success(results);
  });
};

/*我的球队*/
exports.myTeam = function (req, res, next) {
  var user_id = req.data.user_id|0;
  async.auto({
    team:function (callback) {
      ballTeamModel.getDetail({'uid':user_id},callback);
    },
    ranking:["team",function (results,callback) {
      if(!_.isEmpty(results['team'])){
        var team = results['team'];
        var queryParams = {
          'san_score':['>=',team.san_score|0]
        };
        ballTeamModel.count(queryParams,{'sort':'san_score desc'},callback);
      }else {
        callback(null)
      }
    }]
  },function (err, results) {
    if(err) return res.error(err);
    var data = results['team'];
    var ranking = results['ranking'];
    data['ranking'] = ranking;
    res.success(data);
  })
};

/*球队列表*/
exports.ballTeamList = function (req, res, next) {
  var queryParams = req.data;
  ballTeamModel.search(queryParams,function (err, data) {
    if(err) return res.error(399,"查询失败");
    res.success(data);
  })
};

/*排位赛列表*/
exports.qualifyingList = function (req, res, next) {
  var queryParam = req.data;

  if(_.has(queryParam,'ball_team_id')){
    var ball_team_id = queryParam['ball_team_id'];
    delete queryParam['ball_team_id'];
    
    queryParam['__string'] = Util.format('(home_team_id=%d OR guest_team_id=%d)',ball_team_id,ball_team_id);
  }
  queryParam['field'] = "t_qualifying.*,c.type AS court_type,CONCAT(v.name,'|',c.name) AS title,FROM_UNIXTIME(t_qualifying.start_time,'%Y年%c月%e日') AS date,FROM_UNIXTIME(t_qualifying.start_time,'%H:%i') AS start_hour,FROM_UNIXTIME(t_qualifying.end_time,'%H:%i') AS end_hour";

  queryParam['join'] = [
    'join t_court as c on c.court_id=t_qualifying.court_id',
    'join t_venue as v on v.venue_id=c.venue_id'
  ];
  queryParam['status'] = ['!=',2];
  queryParam['pay_num'] = ['>',0];
  queryParam['order'] = Util.format("status asc,%s.start_time desc",qualifyingModel.table);
  queryParam['sort'] = '';
  qualifyingModel.search(queryParam,function (err, data) {
    if(err) return res.error(err);

    res.success(data['data']);
  })
};

