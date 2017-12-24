/**
 * Created by walter on 2016/7/13.
 */
const _ = require('lodash');
const async = require('async');
const Util = require('util');
const moment = require('moment');

var qualifyingModel = require('../../common/model').Qualifying;
var ballTeamModel = require('../../common/model').BallTeam;
var courtModel = require('../../common/model').Court;
var refereeModel = require('../../common/model').Referee;
var cameramanModel = require('../../common/model').Cameraman;
var AdverModel = require('../../common/model').Adver;

/*排位赛首页*/
exports.index = function (req, res, next) {
  var user_id = req.query.user_id|0;

  async.auto({
    "rules":function (callback) {
      var rules = [
        {
          "title":"豪门",
          "type":0,
          "min":200
        },
        {
          "title":"劲旅",
          "type":1,
          "min":50
        },
        {
          "title":"新贵",
          "type":2,
          "min":0
        }
      ];
      rules = _.orderBy(rules,['min'],['desc']);
      callback(null,rules);
    },
    "banners":function (callback) {
      var params = {
        "location":1,
        "type":1,
        "status":1
      };
      AdverModel.select(params,callback);
    },
    "my_team":function (callback) {
      ballTeamModel.getDetail({'uid':user_id},callback);
    },
    "qualifyings":function (callback) {
      var params = {};
      params['field'] = "t_qualifying.*,c.type AS court_type,CONCAT(v.name,'|',c.name) AS title,FROM_UNIXTIME(t_qualifying.start_time,'%Y年%c月%e日') AS date,FROM_UNIXTIME(t_qualifying.start_time,'%H:%i') AS start_hour,FROM_UNIXTIME(t_qualifying.end_time,'%H:%i') AS end_hour";
      params['join'] = [
        'join t_court AS c on t_qualifying.court_id = c.court_id',
        'join t_venue AS v on v.venue_id = c.venue_id'
      ];
      qualifyingModel.search(params,function (err, data) {
        if(err) return callback(err);

        callback(null,data['data']);
      });
    },
    "ball_teams":["rules",function (results, callback) {
      var rules = results['rules'];
      var params = {};
      params['order'] = 'san_score';
      params['limit'] = 10;
      ballTeamModel.search(params,function (err, results) {
        if(err) return callback(err);

        var result = results['data'];
        var data = {};
        data['haomen'] = _.filter(result,function (v) {
          return v.san_score>=rules[0]['min']
        });
        data['jinglv'] = _.filter(result,function (v) {
          return (v.san_score>=rules[1]['min'] && v.san_score<rules[0]['min']);
        });
        data['xingui'] = _.filter(result,function (v) {
          return (v.san_score>=rules[2]['min'] && v.san_score<rules[1]['min']);
        });
        callback(null,result);
      });
    }]
  },function (err, results) {
    if(err) return next(err);


    if(_.isEmpty(results['my_team'])){
      results['my_team'] = null;
    }
    // res.json(results);
    res.render('qualifying/index',results)
  });
};


exports.detail = function (req, res, next) {
  var qualifying_id = req.query.id;

  async.auto({
    qualifying_info:function (callback) {
      var params = {};
      params['field'] = "t_qualifying.*,FROM_UNIXTIME(t_qualifying.start_time,'%Y年%c月%e日') AS date,FROM_UNIXTIME(t_qualifying.start_time,'%H:%i') AS start_hour,FROM_UNIXTIME(t_qualifying.end_time,'%H:%i') AS end_hour";
      params['qualifying_id'] = qualifying_id;

      qualifyingModel.find(params,callback);
    },
    home_team:["qualifying_info",function (results, callback) {
      var home_team_id = results['qualifying_info']['home_team_id']|0;
      if(home_team_id){
        ballTeamModel.getById(home_team_id,callback);
      }else {
        callback(null,null);
      }
    }],
    guest_team:["qualifying_info",function (results, callback) {
      var guest_team_id = results['qualifying_info']['guest_team_id'];
      if(guest_team_id){
        ballTeamModel.getById(guest_team_id,callback);
      }else {
        callback(null,null);
      }
    }],
    location:["qualifying_info",function (results, callback) {
      var qualifyingInfo = results['qualifying_info'];
      var court_id = qualifyingInfo.court_id|0;
      var queryParams = {"court_id":court_id};
      queryParams['field'] = 't_court.name as court_name,t_court.type,t_court.address,v.name as venue_name';
      queryParams['join'] = ['join t_venue as v on t_court.venue_id=v.venue_id'];
      courtModel.find(queryParams,callback);
    }],
    referee:["qualifying_info",function (results, callback) {
      var qualifyingInfo = results['qualifying_info'];
      var referee_id = qualifyingInfo.referee_id;
      if(referee_id){
        refereeModel.getById(referee_id,callback);
      }else {
        callback(null,null);
      }
    }],
    cameraman:["qualifying_info",function (results, callback) {
      var qualifyingInfo = results['qualifying_info'];
      var cameraman_id = qualifyingInfo.cameraman_id;
      if(cameraman_id){
        cameramanModel.getById(cameraman_id,callback);
      }else {
        callback(null,null);
      }
    }]
  },function (err, results) {
    if(err) return next(err);

    // res.json(results);
    res.render('qualifying/detail',results);
  });

};