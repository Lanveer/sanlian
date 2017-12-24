/**
 * Created by lanveer  on 2017/7/4 0004.
 */
 const _ = require('lodash');
 const async= require('async');
 const Util= require('util');
const moment = require('moment');
var ticket = require('../../common/model').TicketCard;
var mysql= require('mysql');
var Uploader= require('../../../util/uploader');


/*主页开始*/
exports.index= function (req,res,next) {
    var query={
        user_id:req.data.uid
    };
  ticket.index(query,function (err,result) {
      if(err){
          res.json(err)
      }else{
          res.json(result)
      }
  })

};
/*主页结束*/


/*发起球卡开始*/
exports.startRace= function (req,res,next) {
     var query={
         user_id: req.data.uid,
         logo:req.data.logo,
         address:req.data.address,
         start_time:req.data.start_time,
         race_type:req.data.race_type,
         team_fee:req.data.team_fee,
         team_name:req.data.team_name,
         person_fee:req.data.person_fee,
         phone:req.data.phone,
         type:req.data.type,
         title:req.data.title,
         limit:req.data.limit
     };

     ticket.startRace(query,function (err,result) {
         if(err){
             res.json(err)
         }else{
             res.json(result)
         }
     })
 };
/*发起球卡结束*/




/*个人球卡展示开始*/
exports.person = function(req,res,next){
    var type=req.data.type;
  ticket.person(type,function (err,result) {
      if(err){
          res.json(err)
      }else{
          res.json(result)
      }
  })
};
/*个人球卡展示结束*/


/*球队卡展示开始*/
exports.team= function (req,res,next) {
 var type= req.data.type;
 ticket.team(type,function (err,result) {
     if(err){
         res.json(err)
     }else{
         res.json(result)
     }
 })
};
/*球队卡展示结束*/



/*领取个人求卡开始*/
exports.getPersonCard= function (req,res,next){
    var query={
        card_id:req.data.card_id,
        user_id:req.data.uid,
        name:req.data.name,
        tel:req.data.tel,
        start_time:req.data.start_time,
        team_flag:req.data.team_flag||0,
        limit: req.data.limit,
        card_type:req.data.card_type
    };
    ticket.getPersonCard(query,function (err,result) {
        if(err){
            res.json(err)
        }else{
            res.json(result)
        }
    })
};
/*领取个人求卡结束*/


/*领取球队卡片开始*/
exports.getTeamCard= function (req,res,next) {
  var query={
      user_id:req.data.uid,
      card_id:req.data.card_id,
      team_name:req.data.team_name,
      team_user:req.data.team_user,
      limit:req.data.limit,
      tel:req.data.tel,
      start_time:req.data.start_time
  };
  ticket.getTeamCard(query,function (err,result) {
      if(err){
          res.json(err)
      }else{
          res.json(result)
      }
  })
};
/*领取球队卡片结束*/




/*个人求卡详情开始*/
    exports.cardDetail= function (req,res,next) {
    var query={
        id:req.data.id,
        is_get:req.data.is_get
    };
  ticket.cardDetail(query,function (err,result) {
      if(err){
          res.json(err)
      }else{
          res.json(result)
      }
  })
};
/*个人求卡详情结束*/



/*球队求卡详情开始*/
exports.teamCardDetail= function (req,res,next) {
    var query={
        id:req.data.id
    };
    ticket.teamCardDetail(query,function (err,result) {
        if(err){
            res.json(err)
        }else{
            res.json(result)
        }
    })
};
/*球队求卡详情结束*/



/*我领取的球卡开始*/
exports.myGetTicket= function (req,res,next) {
    var query={
        card_type:req.data.card_type,
        uid:req.data.uid
    };
  ticket.myGetTicket(query,function (err,result) {
      if(err){
          res.json(err)
      }else{
          res.json(result)
      }
  })
};
/*我领取的球卡结束*/


/*我发起的球卡开始*/
exports.myPostCard= function (req,res,next) {
    var query={
        uid:req.data.uid,
        card_type:req.data.card_type
    };
  ticket.myPostTicket(query,function (err,result) {
      if(err){
          res.json(err)
      }else{
          res.json(result)
      }
  })
};
/*我发起的球卡结束*/


/*退回的卡片开始*/
exports.returnBack= function (req,res,next) {
  var query={
      card_type:req.data.card_type,
      id:req.data.id,
      card_id:req.data.card_id,
      user_id:req.data.user_id,
      team_id:req.data.team_id
  };
  ticket.returnBack(query,function (err,result) {
      if(err){
          res.json(err)
      }else{
          res.json(result)
      }
  })
};
/*退回的卡片结束*/


/*取消约球开始*/
exports.cancelCard= function (req,res,next) {
    var query={
        card_type:req.data.card_type,
        id:req.data.id,
        user_id:req.data.user_id
    };
 ticket.cancelCard(query,function (err,result) {
     if(err){
         res.json(err)
     }else{
         res.json(result)
     }
 })
};
/*取消约球结束*/


/*我的比赛开始*/
exports.myRace= function (req,res,next) {
  var query={
      type:req.data.type,
      uid:req.data.uid,
      page:req.data.page
  };
  ticket.myRace(query,function (err,result) {
      if(err){
          res.json(err)
      }else{
          res.json(result)
      }
  })
};
/*我的比赛结束*/



/*评价队友开始*/
exports.commentList= function (req,res,next) {
    var query={
        'user_id': req.data.uid,
        'page':req.data.page
    };
    ticket.commentList(query,function (err,result) {
        if(err){
            res.json(err)
        }else{
            res.json(result);
        }
    })
};
/*评价队友结束*/


/*确认评论开始*/
    exports.confirm= function (req,res,next) {
    var query={
        user_id:req.data.uid,
        score:req.data.score,
        guest_user_id:req.data.guest_user_id
    };

     console.log(query)
    ticket.confirm(query,function (err,result) {
        if(err){
            res.json(err)
        }else{
            res.json(result)
        }
    })
};
/*确认评论结束*/


/*我的评论开始*/
exports.myComment= function (req,res,next) {
    var query={
        guest_user_id:req.data.uid
    };

    ticket.myComment(query,function (err,result) {
        if(err) return res.error(err);
        res.json(result);
    })
};
/*我的评论结束*/


/*商品列表开始*/
exports.goodsList= function (req,res,next) {
    var page= req.data.page;
    var user_id= req.data.uid;
    var query={
        page:page,
        user_id:user_id
    };
    ticket.goodsList(query,function (err,result) {
        if(err){
            res.json(err)
        }else{
            res.json(result)
        }
    })

};
/*商品列表结束*/


/*商品详情开始*/
exports.goodsInfo= function (req,res,next) {
    var query={
        goods_id:req.data.goods_id,
        user_id: req.data.uid
    };
    ticket.goodsInfo(query,function (err,result) {
        // if(err) return res.error(err);
        res.json(result);
    })
}
/*商品详情结束*/



