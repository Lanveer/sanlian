/**
 * Created by walter on 2016/8/3.
 */
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const Util = require('util');
const Config = require('../../../config');

var CompetitionModel = require('../../common/model').Competition;
var CompetitionActivityModel = require('../../common/model').CompetitionActivity;
var CompetitionBallteamModel = require('../../common/model').CompetitionBallteam;
var CompetitionBannerModel = require('../../common/model').CompetitionBanner;
var CompetitionGroupModel = require('../../common/model').CompetitionGroup;
var CompetitionGroupMemberModel = require('../../common/model').CompetitionGroupMember;
var CompetitionMemberModel = require('../../common/model').CompetitionMember;
var CompetitionPostsModel = require('../../common/model').CompetitionPosts;
var CompetitionPostsCommentModel = require('../../common/model').CompetitionPostsComment;
var CompetitionRaceModel = require('../../common/model').CompetitionRace;
var CompetitionRoundModel = require('../../common/model').CompetitionRound;
var BallTeamModel = require('../../common/model').BallTeam;
var UserAttentionModel = require('../../common/model').UserAttention;


/*赛事列表*/
exports.competitionList = function (req, res, next) {
  var queryParams = req.data;
  queryParams['is_show'] = 1;
  queryParams['field'] =  Util.format("*,CONCAT('%s',competition_id) AS url",Config.host+'/competition/home?competition_id=');
  CompetitionModel.search(queryParams,function (err, data) {
    if(err) return res.error(err);
    res.success(data['data']);
  })
};

/*赛事活动*/
exports.activityList = function (req, res, next) {
  var queryParams = req.data;

  CompetitionActivityModel.search(queryParams,function (err, data) {
    if(err) return res.error(err);

    res.success(data['data']);
  })
};

/*赛事动态*/
exports.postsList = function (req, res, next) {
  var queryParams = req.data;
  queryParams['field'] = Util.format("*,CONCAT('%s',competition_id,'&posts_id=',id) AS url",Config.host+'/competition/postsInfo?competition_id=');
  queryParams['status']  = 1;
  CompetitionPostsModel.search(queryParams,function (err, data) {
    if(err) return res.error(err);

    res.success(data['data']);
  })
};

/*赛程详情*/
exports.raceInfo = function (req, res, next) {
  var user = req.user;
  var race_id = req.data.race_id;

  async.auto({
    "race":function (callback) {
      var param = {race_id:race_id};
      param['field'] = [
          't_competition_race.*',
          'c.name AS court_name,c.type AS court_type,c.address AS court_address,c.phone AS court_phone,c.lng AS court_lng,c.lat AS court_lat',
          'v.name AS venue_name,v.address AS venue_address,v.phone AS venue_phone,v.lng AS venue_lng,v.lat AS venue_lat'
      ];
      param['join'] = [
        'join t_court AS c on t_competition_race.court_id = c.court_id',
        'join t_venue AS v on c.venue_id = v.venue_id'
      ];
      CompetitionRaceModel.find(param,callback);
    },
    "home_team":['race',function (results, callback) {
      var race = results['race'];
      var home_team_id = race['home_team_id']|0;
      if(!home_team_id) return callback(null,{});
      BallTeamModel.getById(home_team_id,callback);
    }],
    "guest_team":['race',function (results, callback) {
      var race = results['race'];
      var guest_team_id = race['guest_team_id']|0;
      if(!guest_team_id) return callback(null,{});
      BallTeamModel.getById(guest_team_id,callback);
    }],
    "is_attention":function (callabck) {
      UserAttentionModel.isAttention(user.user_id,4,race_id,callabck);
    }
  },function (err, results) {
    if(err) res.error(err);

    res.success(results);
  })
};