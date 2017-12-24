/**
 * Created by Administrator on 2017/6/16 0016.
 */
/**
 * Created by Administrator on 2017/6/6.
 */

const _ = require('lodash');
const async = require('async');
const Util = require('util');
const moment = require('moment');
var teamInfo = require('../../common/model').TeamInfo;
var mysql= require('mysql');
var Uploader= require('../../../util/uploader');


/*点击球队详情开始*/

exports.index= function (req,res,next) {
    var query={
        uid:req.data.uid
    };
    teamInfo.index(query,function (err,result) {
        if(err) return res.error(err);
        res.success(result);
    })
};
/*点击球队详情结束*/

/*当前用户下面的所有球队信息开始*/
exports.teamList= function (req,res,next) {
  var uid= req.data.uid;
  teamInfo.teamList(uid,function (err,result) {
      if(err){
          res.json(err)
      }else{
          res.json(result)
      }
  })
};
/*当前用户下面的所有球队信息结束*/



/*球队信息开始*/

exports.teamInfo= function (req,res,next) {
    var ball_team_id = req.data.ball_team_id;
    teamInfo.detail(ball_team_id,function (err,result) {
        if(err)return res.error(err);
        res.success(result);
    })
};

/*球队信息结束*/


/*管理球员-- 球员列表开始*/

exports.ballTeamList= function (req,res,next) {
    var query={
        ball_team_id:req.data.ball_team_id,
        uid:req.data.uid
    }
    teamInfo.ballTeamList(query,function (err,result) {
        if(err)return res.error(err);
        res.success(result);
    })
};

/*管理球员-- 球员列表结束*/


/*管理球员 -- 添加球员开始*/
exports.addMember= function (req,res,next) {
    var query={
        phone:req.data.phone,
        ball_team_id:req.data.ball_team_id,
        nickname:req.data.nickname,
        clubnumber:req.data.clubnumber,
        uid:req.data.uid,
    };
    teamInfo.addMember(query,function (err,result) {
        if(err) return res.error(err);
        var errCode=result.errCode;
        if(errCode == 400){
            var data={
                msg:'该号码已被注册，请直接登陆!'
            };
            res.success(data);
        }else{
            var data={
                msg:'成功添加球员!',
                data:result
            };
            res.success(data);
        }

    })


};
/*管理球员 --添加球员结束*/


/*球队比赛开始*/
exports.teamRace = function (req,res,next) {
    var query= {
        ball_team_id:req.data.ball_team_id
    };
    teamInfo.ballTeamRace(query,function (err,result) {
        if(err){
            res.json(err)
        }else{
            res.json(result);
        }
    })
};
/*球队比赛结束*/


/*球队比赛详情开始*/
 exports.teamRaceDetail = function (req,res,next) {
     var query= {
         competition_id:req.data.competition_id,
         page:req.data.page
     };
     teamInfo.raceDetail(query,function (err,result) {
         if(err){
             res.json(err)
         }else{
             res.json(result);
         }
     })
 }
/*球队比赛详情结束*/


/*球队集锦开始*/
exports.ballteamCollection = function (req,res,next) {
   var query={
       ball_team_id:req.data.ball_team_id,
       page:req.data.page
   };
   teamInfo.ballteamCollection(query,function (err,result) {
       if(err) return res.error(err);
       res.success(result);
   })
};
/*球队集锦结束*/


/*球队公告列表开始*/
exports.noticeList = function (req,res,next) {
    var query={
        uid:req.data.uid,
        ball_team_id:req.data.ball_team_id
    };
    teamInfo.noticeList(query,function (err,result) {
        if(err) return res.error(err);
        res.success(result);
    })
};

/*球队公告列表结束*/


/*发布公告开始*/
exports.doNotice = function (req,res,next) {
    var query={
        ball_team_id:req.data.ball_team_id,
        user_id:req.data.uid,
        content:req.data.content
    };

    teamInfo.doNotice(query,function (err,result) {
        if(err) return res.error(err);
         if(err){
             res.json(err)
         }else{
             res.json(result)
         }
    })
};
/*发布公告结束*/



