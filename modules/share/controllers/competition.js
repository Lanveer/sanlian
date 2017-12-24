/**
 * Created by walter on 2016/8/16.
 */
const _ = require('lodash');
const async = require('async');
const Util = require('util');
const moment = require('moment');
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

/*赛事首页*/
exports.home = function (req, res, next) {
    async.auto({
        "competitions":function (callback) {
            var queryParams = {};
            queryParams['limit'] = 20;
            queryParams['is_show'] = 1;
            queryParams['field'] =  Util.format("*,CONCAT('%s',competition_id) AS url",Config.host+'/competition/home?competition_id=');
            CompetitionModel.search(queryParams,function (err, data) {
                callback(err,data['data']);
            })
        },
        "activitys":function (callback) {
            var queryParams = {};
            queryParams['limit'] = 20;
            CompetitionActivityModel.search(queryParams,function (err, data) {
                callback(err,data['data']);
            })
        },
        "posts":function (callback) {
            var queryParams = {};
            queryParams['field'] = [
                "*,FROM_UNIXTIME(create_time,'%Y-%m-%d %H:%i:%s') AS show_time",
                Util.format("CONCAT('%s',competition_id,'&posts_id=',id) AS url",Config.host+'/competition/postsInfo?competition_id=')
            ];
            queryParams['order'] = 'create_time';
            queryParams['limit'] = 20;
            CompetitionPostsModel.search(queryParams,function (err, data) {
                callback(err,data['data']);
            })
        }
    },function (err, results) {
        if(err) return next(err);
        // res.json(results);
        res.render('competition/home',results);
    })
};