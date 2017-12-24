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
var card = require('../../common/model').Card;
var mysql= require('mysql');
var Uploader= require('../../../util/uploader');

/*
* 获得所有报名的赛事
*
* */

//由于需要判断是队长还是队员，需要多传送一个参数  如果type=0 即为队员，如果type=1即为队长

exports.card= function(req,res,next){
    var iscaptian=req.data.type;
    console.log(iscaptian)
    if(iscaptian == 0){
        var query={
            ball_team_id:req.data.ball_team_id,
            uid:req.data.uid
        };
        card.getMemberCompetitions(query,function (err,result) {
            if(err) return res.error(err);
            var data={
                data:result
            };
            res.success(data)
        })
    }else if(iscaptian ==1){
        var query={
            ball_team_id:req.data.ball_team_id,
            uid:req.data.uid
        };
        card.getCompetitions(query,function (err,result) {
            if(err) return res.error(err);
            var data={
                data:result
            };
            res.success(data)
        })
    }
};
/*
*队长获取当前赛事下面所属球队的所有队员
* */



exports.competitionMembers= function(req,res,next){
    var query={
        competition_id:req.data.competition_id,
        ball_team_id:req.data.ball_team_id,
        user_id: req.data.user_id
    };

card.getBallTeamMembers(query,function (err,result) {
    if(err) return res.error(err);
    console.log('fuck is:'+ result);
    res.success(result);
})
};

/*参赛证信息开始*/
exports.competitionInfo = function (req,res,next) {
    var query= {
        competition_id: req.data.competition_id,
        ball_team_id:req.data.ball_team_id,
        user_id:req.data.user_id
    };
    card.getCompetitionCardInfo(query,function (err,result) {
        if(err)return res.error(err);
        res.success(result);
    })
};

/*发送参赛证开始*/

exports.sendCard= function (req,res,next) {
    var query={
        competition_id:req.data.competition_id,
        ball_team_id:req.data.ball_team_id,
        uid:req.data.uid
    };
    console.log('competition_id is(1) :'+query.competition_id)
    console.log('ball_team_id is(2) :'+query.ball_team_id)
    console.log('user_id is(3) :'+query.uid)
    card.sendCard(query,function (err,result) {
        if(err) return res.error(err);
        var data={
            msg:'发送参赛证成功!',
            data:result
        };
        res.success(data);
    })
};


/*改写发送参赛证开始*/
exports.send= function (req,res,next) {
    var query={
        competition_id:req.data.competition_id,
        ball_team_id:req.data.ball_team_id,
        uid:req.data.uid
    };
card.send(query,function (err,result) {
    if(err){
        res.json(err)
    }else{
        res.json(result)
    }
})

};
/*改写发送参赛证结束*/




/*撤回参赛证开始*/

exports.cancelCard= function (req,res,next) {
    var query= {
        competition_id:req.data.competition_id,
        ball_team_id:req.data.ball_team_id,
        uid:req.data.uid
    };
    card.deleteCard(query,function (err,result) {
        if(err) return res.error(err);
        var data={
            msg:'撤回参赛证成功!',
            data:result
        }
        res.success(data);
    })

};


/*上传参赛证头像*/
exports.uploadHeadPic = function (req,res,next) {
    var query={
        url:req.data.url,
        uid: req.data.uid,
        ball_team_id: req.data.ball_team_id,
        competition_id: req.data.competition_id
    };
    card.saveHeader(query,function (err,result) {
        if(err) return res.error(err);
        var data={
            msg:'上传成功',
            data:result
        };
        res.success(data)
    })
};
