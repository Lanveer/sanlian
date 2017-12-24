/**
 * Created by walter on 2016/7/12.
 */
const _ = require('lodash');
const async = require('async');
const Util = require('util');
const moment = require('moment');

var BallTeamModel = require('../../common/model').BallTeam;
var BallTeamActivityModel = require('../../common/model').BallTeamActivity;
var BallTeamActivityUserModel = require('../../common/model').BallTeamActivityUser;
var BallTeamMemberModel = require('../../common/model').BallTeamMember;
var BallTeamImgModel = require('../../common/model').BallTeamImg;
var BallTeamNoticeModel = require('../../common/model').BallTeamNotice;
var QualifyingModel = require('../../common/model').Qualifying;



/*活动详情*/
exports.activity = function (req, res, next) {
  var activity_id = req.query.id|0;
  
  async.auto({
    "activity_info":function (callback) {
      var params = {};
      params['field'] = "t_ball_team_activity.*,FROM_UNIXTIME(activity_time,'%Y年%c月%e日') AS activity_time";
      params['id'] = activity_id;
      BallTeamActivityModel.find(params,callback);
    },
    "activity_member":["activity_info",function (results, callback) {
      var activity_info = results['activity_info'];
      var ball_team_id = activity_info['ball_team_id'];
      var queryParams = {
        "ball_team_activity_id":activity_id
      };
      queryParams['field'] = 't_ball_team_activity_user.*,tm.*,t_user.phone,t_user.nickname,t_user.avatar,t_user.sex,t_user.birthday,t_user.height,t_user.weight,ageOfBirthday(t_user.birthday) AS age';
      queryParams['join'] = [
        'join t_user on t_user.user_id = t_ball_team_activity_user.user_id',
        'join t_ball_team_member AS tm on tm.uid=t_ball_team_activity_user.user_id AND tm.ball_team_id='+ball_team_id
      ];
      BallTeamActivityUserModel.select(queryParams,callback);
    }]
  },function (err, results) {
    if(err) return next(err);
    var activityInfo = results['activity_info'];
    activityInfo['members'] = results['activity_member'];
    res.render('ballTeam/activeDetail',activityInfo);
  });
};

/*球队首页*/
exports.index = function (req, res, next) {
  var user_id = req.query.id;
  async.auto({
    "my_team":function (callback) {
      BallTeamModel.getDetail({uid:user_id},callback);
    },
    "joined_team":function (callback) {
      BallTeamMemberModel.select({uid:user_id},function (err, results) {
        if(err) return callback(err);
        var ball_team_ids = _.map(results,'ball_team_id');
        if(_.isEmpty(ball_team_ids)){
          return callback(null,[]);
        }
        async.map(ball_team_ids,function (id, callback) {
          BallTeamModel.getById(id,callback);
        },function (err, result) {
          if(err) return callback(err);

          callback(null,result);
        })
      })
    },
    "recommend_team":function (callback) {
      BallTeamModel.select({"is_recommend":1,"is_verify":1},function (err, results) {
        if(err) return callback(err);
        if(_.isEmpty(results)){
          return callback(null,[]);
        }

        async.map(results,function (ball_team, callback) {
          BallTeamModel.getById(ball_team['ball_team_id'],callback);
        },callback)
      });
    },
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
          "min":50,
          "max":200
        },
        {
          "title":"新贵",
          "type":2,
          "min":0,
          "max":50
        }
      ];
      rules = _.orderBy(rules,['min'],['asc']);
      callback(null,rules);
    }
  },function (err, results) {
    if(err) return next(err);
    
    res.render('ballTeam/index',results);
  })
};

/*球队详情*/
exports.ballTeamInfo = function (req, res, next) {
  var ball_team_id = req.query.id |0;

  async.auto({
    "ball_team":function (callback) {
      BallTeamModel.getById(ball_team_id,callback);
    },
    "ball_team_img":function (callback) {
      var queryParams = {
        // "limit":4,
        "ball_team_id":ball_team_id
      };
      BallTeamImgModel.search(queryParams,function (err, data) {
        if(err) return callback(err);

        callback(null,data['data']);
      });
    },
    "ball_team_activity":function (callback) {
      var queryParams = {
        "ball_team_id":ball_team_id,
      };
      var condition = {
        "order":"create_time desc"
      };
      BallTeamActivityModel.find(queryParams,condition,callback);
    },
    "ball_team_notice":function (callback) {
      var queryParams = {
        "ball_team_id":ball_team_id
      };
      var condition = {
        "order":"create_time desc"
      };
      queryParams['field'] = "t_ball_team_notice.*,u.nickname,u.avatar,u.sex,FROM_UNIXTIME(t_ball_team_notice.create_time,'%Y-%c-%e') AS date";
      queryParams['join'] = ['join t_user as u on u.user_id = t_ball_team_notice.user_id'];
      BallTeamNoticeModel.find(queryParams,condition,callback);
    },
    "qualifyings":function (callback) {
      var params = {};
      params['field'] = "t_qualifying.*,c.type AS court_type,CONCAT(v.name,'|',c.name) AS title,FROM_UNIXTIME(t_qualifying.start_time,'%Y年%c月%e日') AS date,FROM_UNIXTIME(t_qualifying.start_time,'%H:%i') AS start_hour,FROM_UNIXTIME(t_qualifying.end_time,'%H:%i') AS end_hour";
      params['join'] = [
        'join t_court as c on c.court_id=t_qualifying.court_id',
        'join t_venue as v on v.venue_id=c.venue_id'
      ];
      params['__string'] = Util.format('(home_team_id=%d OR guest_team_id=%d)',ball_team_id,ball_team_id);
      QualifyingModel.search(params,function (err, data) {
        if(err) return callback(err);

        callback(null,data['data']);
      });
    }
  },function (err, results) {
    if(err) return next(err);

    // res.json(results);
    res.render('ballTeam/teamDetail',results);
  })
};