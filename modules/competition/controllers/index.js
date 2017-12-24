/**
 * Created by walter on 2016/8/2.
 */

const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const Util = require('util');
const Config = require('../../../config');
const Mysql= require('../../../db_server/mysql.js');
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
var BallTeamMemberModel = require('../../common/model').BallTeamMember;
var UserModel = require('../../common/model').User;
var ticket = require('../../common/model').TicketCard;

/*赛事模块改版H5开始*/

/*
* 客户端在请求所有的赛事列表的时候，不需要传递任何参数，但是由于动态页面有评论的功能
*
* 所以需要user_id用来做评论使用，所以在请求的时候需要传递userid
*
* 在每一个请求接口都需要存下来一个
*
* */

/*点击赛事列表页开始*/
exports.index= function (req,res,next) {
    var user_id= req.data.user_id;
  function search(sql,callback) {
      Mysql.master.getConnection(function (err,connection) {
          if(err) return callback(err);
          connection.query(sql,function (err,result) {
              connection.release();
              if(err) return callback(err);
              callback(null,result);
          })
      })
  };
  var now = parseInt(Date.parse(new Date())/1000);
  var sql='select  comp.img,comp.competition_id,comp.title,comp.address,comp.type,date_format(from_unixtime(comp.start_time),"%Y-%m-%d") as start_time,date_format(from_unixtime(comp.create_time),"%Y-%m-%d") as create_time, comp.fee_time as end_time, ('+now+'- comp.start_time) as status,comp.merchantImg from t_competition as comp order by comp.start_time desc';
  var sql2='select posts.img as merchantsImgs, posts.competition_id from t_competition_merchants as posts ';

    async.auto({
      'list': function (callback) {
          search(sql,callback)
      },
      'merchantsImg':function (callback) {
              search(sql2,callback)
          }
    },function (err, results) {
        if(err) return next(err);
      var x= results.merchantsImg;
      var y= results.list;
      var a=JSON.parse(JSON.stringify(x));
      var b= JSON.parse(JSON.stringify(y));
      var info=[];
      var imgs=[];
      var data=results;
      for(var j=0;j<a.length;j++){
        imgs.push(a[j]);
      };
      for(var i=0;i<b.length;i++){
          info.push(b[i]);
          if(b[i].merchantImg!=null){
              var imgs= b[i].merchantImg;
              var Mimg= imgs.split(',');
              b[i].merchantImg=Mimg;
          }else{
              //这里处理没有赞助商的情况
              console.log('fuck')
          }
      };
  // res.json(results);
        res.render('index',{
          "imgs":imgs,
          'lists':info,
          'user_id':user_id
      });
    })
};
/*点击赛事列表页结束*/

/*首页赞助商开始*/
// exports.praise= function (req,res,next) {
//     var user_id= req.data.user_id;
//     function search(sql,callback) {
//         Mysql.master.getConnection(function (err,connection) {
//             if(err) return callback(err);
//             connection.query(sql,function (err,result) {
//                 connection.release();
//                 if(err) return callback(err);
//                 callback(null,result);
//             })
//         })
//     };
//     var sql='select mechants.img as merchantsImgs,comp.competition_id from t_competition as comp JOIN t_competition_merchants as mechants on(mechants.competition_id=comp.competition_id) order by competition_id;';
//     search(sql,function (err,result) {
//
//     })
// };
/*首页赞助商结束*/


/*赛事详情开始*/
exports.detail= function (req,res,next) {
      function search(sql,callback) {
          Mysql.master.getConnection(function (err,connection) {
              if(err) callback(err)
              connection.query(sql,function (err,result) {
                  connection.release();
                  if(err) return callback(err);
                  callback(null,result)
              })
          })
      };
      var competition_id=req.data.competition_id;
      var ball_team_id= req.data.ball_team_id;
      var user_id= req.data.user_id;
      //查询参加的球队数和进球数
      // var sql='select SUM(goals_scored) as goals,COUNT(ball_team_id) as teamNums from t_competition_ballteam where competition_id='+competition_id+'';
      var sql='select SUM(goals_scored) as goals,COUNT(ball_team_id) as teamNums,tc.img as bannerIcon,tc.title as bannerTitle from t_competition_ballteam as bt join t_competition as tc on(bt.competition_id=tc.competition_id)  where bt.competition_id='+competition_id+'';
      //赞助商的banner
      // var sql2='select * from t_competition_merchants where competition_id='+competition_id+'';
      var sql2='select comp.merchantImg from t_competition as comp where comp.competition_id='+competition_id+'';
      //球赛的详情   ======》首页需要
      var sql3='select comp.address,FROM_UNIXTIME(comp.start_time,"%Y年%m月%d号") AS start_time,comp.type,comp.rule,comp.competition_id as competition_id from t_competition as comp where competition_id='+competition_id+'';
      //赛事参赛球队使用，其中点击进入的详情页面在球队详情页面单独使用
      var sql4='select b_team.name,b_team.logo,b_team.san_score,t_city.city,t_county.county,c_team.goals_scored,c_team.goals_against,c_team.red_card,c_team.yellow_card,c_team.win_match,c_team.fail_match,c_team.flat_match,c_team.score,c_team.ball_team_id as ball_team_id,c_team.competition_id  from t_competition_ballteam as c_team join t_ball_team as b_team on(c_team.ball_team_id=b_team.ball_team_id) join t_city on(b_team.city_id=t_city.city_id) join t_county on(b_team.county_id=t_county.county_id) where c_team.competition_id='+competition_id+'';

      /*赛程模块sql语句开始*/
      //找出一共有多少轮赛事
        var sql5='select MAX(round.round_num) as turn,race.competition_id from t_competition_round as round join t_competition_race as race on(round.round_id= race.round_id) where race.competition_id='+competition_id+' ORDER BY round.round_num';

      //查询出该赛事下面的第一轮数据--》 首次加载的时候数据填充
        var sql6='select race.competition_id, race.race_id,FROM_UNIXTIME(race.start_time,"%Y年%m月%d号")as date,FROM_UNIXTIME(race.start_time,"%m月%d号 %h:%s") as date2,comp.address,round.title,team.logo as homeLogo,team2.logo as guestLogo,team.name as homeName,team2.name as guestName,race.home_goal as homeGoal,race.guest_goal as guestGoal from t_competition_round as round join t_competition_race as race on(round.round_id= race.round_id) join t_competition as comp on(comp.competition_id= race.competition_id) join t_ball_team as team on(race.home_team_id= team.ball_team_id) join t_ball_team as team2 on(race.guest_team_id=team2.ball_team_id) where race.competition_id='+competition_id+' and round.round_num=1 ORDER BY round.round_num'
      /*赛程模块sql语句结束*/

      /*积分榜模块sql开始*/
      //积分开始
      // var sql7='select b_team.logo,b_team.name,b_team.game_times,c_team.win_match,c_team.fail_match,c_team.flat_match,c_team.goals_scored,c_team.goals_against,c_team.goals_against,c_team.score from t_competition_ballteam as c_team join t_ball_team as b_team on(c_team.ball_team_id= b_team.ball_team_id) where c_team.competition_id='+competition_id+' ORDER BY c_team.score desc';
      var sql7='SELECT t_competition_group.id AS group_id,t_competition_group.name AS group_name,cb.*,bt.name AS name,bt.logo AS logo,(cb.goals_scored-cb.goals_against) AS GD FROM `t_competition_group` join t_competition_group_member AS gm on t_competition_group.id = gm.competition_group_id join t_competition_ballteam AS cb on gm.ball_team_id = cb.ball_team_id AND cb.status=1 AND cb.competition_id='+competition_id+' join t_ball_team AS bt on cb.ball_team_id = bt.ball_team_id WHERE `t_competition_group`.`competition_id`='+competition_id+' ORDER BY group_name asc,score desc,GD desc,cb.goals_scored desc';
      //射手
      var sql8='select `user`.avatar,`user`.nickname,team.name,team.logo as teamLogo,member.goals_scored,member.ast as zhugong,member.red_card,member.yellow_card from t_competition_member as member join t_ball_team as team on team.ball_team_id=member.ball_team_id join t_user as user on `user`.user_id=member.user_id   where member.competition_id='+competition_id+' and member.goals_scored<>0 ORDER BY member.goals_scored desc';
      //助攻
       var sql8='select `user`.avatar,`user`.nickname,team.name,team.logo as teamLogo,member.goals_scored,member.ast as zhugong,member.red_card,member.yellow_card from t_competition_member as member join t_ball_team as team on team.ball_team_id=member.ball_team_id join t_user as user on `user`.user_id=member.user_id   where member.competition_id='+competition_id+' and member.goals_scored<>0 ORDER BY member.goals_scored desc';
    /*积分榜模块sql结束*/

    /*动态开始*/
      var sql9='select posts.id as post_id,posts.competition_id,posts.title,posts.img,FROM_UNIXTIME(posts.create_date,"%Y年%m月%d号") as date from t_competition_posts as posts where posts.competition_id='+competition_id+' ORDER BY posts.create_date desc;';
      /*动态结束*/
      async.auto({
        index: function (callback) {
            search(sql,callback)
        },
          banner: function (callback) {
              search(sql2,callback)
          },
          raceDetail: function (callback) {
              search(sql3,callback)
          },
          teamList: function (callback) {
              search(sql4,callback)
          },
          lunshu: function (callback) {
              search(sql5,callback)
          },
          firstLunshu: function (callback) {
              search(sql6,callback)
          },
          jifen:function (callback) {
              search(sql7,callback)
          },
          other:function (callback) {
              search(sql8,callback)
          },
          dynamic:function (callback) {
              search(sql9,callback)
          }
      },function (err,result) {
          if(err) return next(err);
          var a= result.index;
          var b= result.banner;
          var c= result.raceDetail;
          var d= result.teamList;
          var e= result.lunshu;
          var f= result.firstLunshu;
          var g= result.jifen;
          var h= result.other;
          var i= result.dynamic;
          var index=JSON.parse(JSON.stringify(a));
          var banner=JSON.parse(JSON.stringify(b));
          var raceDetail=JSON.parse(JSON.stringify(c));
          var teamList=JSON.parse(JSON.stringify(d));
          var lunshu=JSON.parse(JSON.stringify(e));
          var firstLunshu=JSON.parse(JSON.stringify(f));
          var jifen=JSON.parse(JSON.stringify(g));
          var other=JSON.parse(JSON.stringify(h));
          var dynamic=JSON.parse(JSON.stringify(i));
          var data={};
          data.index=index;
          data.banner=banner;
          // res.success(index);
          //循环baner图片上的信息
          for(var i=0;i<index.length;i++){
              var bannerInfo=index[i];
          };
          //参赛球队的数量
          var num= teamList.length;
        var flag=banner[0].merchantImg;
        console.log(jifen)
          res.render("detail",{
              'goals':bannerInfo.goals,
              'teamNums':bannerInfo.teamNums,
              'bannerIcon':bannerInfo.bannerIcon,
              'bannerTitle':bannerInfo.bannerTitle,
              banner:banner,
              raceDetail:raceDetail,
              teamList:teamList,
              //参赛球队的数量
              attendTeam:num,
              //轮数
              lunshuNum:lunshu,
              //第一次加载时候的数据
              firstData:firstLunshu,
              //积分数据
              jifenData:jifen,
              //射手，助攻，红黄牌
               otherData:other,
              //动态列表内容
                dynamicData:dynamic,
              //user_id 传递
                user_id:user_id,
                competition_id:competition_id
          }
          )
      })
};
/*赛事详情结束*/


/*点击轮数调用接口开始*/
exports.lunshu= function (req,res,next) {
    var num= req.data.turn;
    var competition_id=req.data.comp_id;
    console.log(num)
    console.log(competition_id)
    function search(sql,callback) {
        Mysql.master.getConnection(function (err,connection) {
            if(err) return callback(err);
            connection.query(sql,function (err,result) {
                connection.release();
                if(err) return callback(err);
                callback(null,result)
            })
        });
    };
    var sql='select race.competition_id, race.race_id,FROM_UNIXTIME(race.start_time,"%Y年%m月%d号")as date,FROM_UNIXTIME(race.start_time,"%m月%d号 %h:%s") as date2,comp.address,round.title,team.logo as homeLogo,team2.logo as guestLogo,team.name as homeName,team2.name as guestName,race.home_goal as homeGoal,race.guest_goal as guestGoal from t_competition_round as round join t_competition_race as race on(round.round_id= race.round_id) join t_competition as comp on(comp.competition_id= race.competition_id) join t_ball_team as team on(race.home_team_id= team.ball_team_id) join t_ball_team as team2 on(race.guest_team_id=team2.ball_team_id) where race.competition_id='+competition_id+' and round.round_num='+num+' ORDER BY round.round_num'
    search(sql,function (err,result) {
        if(err) return callback(err)
        var data= JSON.parse(JSON.stringify(result));
        console.log(data)
        res.json({
            result:data
        })
    });
};
/*点击轮数调用接口结束*/


/*规则开始*/
exports.rules= function (req,res,next) {
    function search(sql,callback) {
        Mysql.master.getConnection(function (err,connection) {
            if(err) callback(err)
            connection.query(sql,function (err,result) {
                connection.release();
                if(err) return callback(err);
                callback(null,result)
            })
        })
    };
    var competition_id=req.data.competition_id;
    var sql='select comp.address,FROM_UNIXTIME(comp.start_time,"%Y年%m月%d号") AS start_time,comp.type,comp.rule from t_competition as comp where competition_id='+competition_id+'';
   search(sql,function (err,result) {
      if(err) return false
       var data=JSON.parse(JSON.stringify(result));
       for(var i=0;i<data.length;i++){
           var bannerInfo=data[i];
       };
       var ruleData= bannerInfo.rule;
       // console.log(ruleData);
        res.render('rules',{
            x:ruleData
        })
   });
};
/*规则结束*/



/*球队详情开始*/
exports.teamDetail= function (req,res,next) {
    var ball_team_id= req.data.team_ball;
    var competition_id=req.data.competition_id;
    function search(sql,callback) {
        Mysql.master.getConnection(function (err,connections) {
            if(err)callback(err);
            connections.query(sql,function (err,result) {
                connections.release();
                if(err) return callback(err)
                callback(null,result)
            })
        })
    };
    // total  sql
    var sql='select b_team.name,b_team.logo,b_team.san_score,t_province.province,t_city.city,t_county.county,c_team.goals_scored,c_team.goals_against,c_team.red_card,c_team.yellow_card,c_team.win_match,c_team.fail_match,c_team.flat_match,c_team.score,c_team.ball_team_id as ball_team_id from t_competition_ballteam as c_team join t_ball_team as b_team on(c_team.ball_team_id=b_team.ball_team_id) join t_city on(b_team.city_id=t_city.city_id) join t_county on(b_team.county_id=t_county.county_id) join t_province on (b_team.province_id=t_province.province_id) where b_team.ball_team_id='+ball_team_id+' and c_team.competition_id='+competition_id+'';
    //阵容头部信息开始
    var sql2= 'select team.logo,team.name,team.san_score,team.game_win/team.game_times as win_rate,team.game_times,team.member_num,team.san_score from t_ball_team as team where team.ball_team_id='+ball_team_id+'';
    //阵容队员列表
    var sql3='select user.nickname,`user`.avatar,member.clubnumber,member.position,ageOfBirthday(user.birthday) as age,`user`.height,`user`.weight from t_ball_team_member as member join t_user as user on(member.uid= `user`.user_id) where member.ball_team_id='+ball_team_id+'';
   //战绩开始
    var sql4='select FROM_UNIXTIME(race.start_time,"%Y年%m月%d日") as date,FROM_UNIXTIME(race.start_time,"%m月%d日 %H:%i") as racedate,venue.name,race.home_goal,race.guest_goal,team.logo as homeLogo,team.name as homeName,team2.logo as guestLogo,team2.name as guestName from t_competition_race as race join t_court as court on(race.court_id=court.court_id) join t_venue as venue on(court.venue_id=venue.venue_id) join t_ball_team as team on(race.home_team_id= team.ball_team_id) join t_ball_team as team2 on(team2.ball_team_id= race.guest_team_id) where race.competition_id='+competition_id+' and race.home_team_id='+ball_team_id+' or race.guest_team_id='+ball_team_id+';';

    async.auto({
        total:function (callback) {
        search(sql,callback)
        },
        scaleInfo:function (callback) {
           search(sql2,callback)
        },
        scaleList: function (callback) {
            search(sql3,callback)
        },
        score: function (callback) {
            search(sql4,callback)
        }
    },function (err,result) {
        if(err) return next(err);
        var a= result.total;
        var b= result.scaleInfo;
        var c= result.scaleList;
        var d= result.score;
        var total=JSON.parse(JSON.stringify(a));
        var scaleInfo=JSON.parse(JSON.stringify(b));
        var scaleList=JSON.parse(JSON.stringify(c));
        var score=JSON.parse(JSON.stringify(d));
        console.log(scaleInfo)
        res.render('teamDetail',
            {
                data:total,
                scale:scaleInfo,
                scalelist:scaleList,
                scorelist:score
            }
            )
    });

};
/*球队详情结束*/


/*赛程安排开始*/
exports.race= function (req,res,next) {

   function search(sql,callback) {
       Mysql.master.getConnection(function (err,connection) {
           if(err) return callback(err);
           connection.query(sql,function (err,result) {
               if(err) return callback(err);
               callback(null,result);
           });
       });
   };
  //获取所有的数据
  var competition_id= req.data.competition_id;
  var round_id= req.data.round_id;
  var sql='select round.type,round.title,court.name,race.end_time,race.home_goal,race.guest_goal from t_competition_race as race  JOIN t_competition_round as round on(race.round_id= round.round_id) join t_court as court on(race.court_id=court.court_id) where race.competition_id='+competition_id+'';
//  根据轮数获得对应的数据
  var sql2='select * from t_competition_race as race  join t_competition_round as round on round.round_id= race.round_id where race.competition_id='+competition_id+' and round.round_id='+round_id+''

};
/*赛程安排结束*/


/*积分榜开始*/
exports.score= function (req,res,next) {
     function search(sql,callback) {
         Mysql.master.getConnection(function (err,connection) {
             if(err) return callback(err);
             connection.query(sql,function (err,result) {
                 connection.release();
                 if(err) return callback(err);
                 callback(null,result)
             })
         })
     };
     async({
       score: function (callback) {
       }
     })
  
    var competition_id=req.data.competition_id;
    //积分
    var sql='select b_team.logo,b_team.name,b_team.game_times,c_team.win_match,c_team.fail_match,c_team.flat_match,c_team.goals_scored,c_team.goals_against,c_team.goals_against from t_competition_ballteam as c_team join t_ball_team as b_team on(c_team.ball_team_id= b_team.ball_team_id) where c_team.competition_id='+competition_id+' ORDER BY b_team.san_score';
    //射手  助攻 红黄牌
    var sql2='select `user`.avatar,`user`.nickname,team.name,team.logo as teamLogo,member.goals_scored,member.ast as zhugong,member.red_card,member.yellow_card   from t_competition_member as member join t_user as user on(member.user_id= `user`.user_id) join t_ball_team as team on(team.uid=member.user_id) where member.competition_id='+competition_id+'';
};
/*积分榜结束*/


/*动态开始*/
    exports.dynamic= function (req,res,next) {
        var competition_id= req.data.competition_id;
        var posts_id= req.data.posts_id;
        function search(sql,callback) {
            Mysql.master.getConnection(function (err,connection) {
                if(err) return callback(err);
                connection.query(sql,function (err,result) {
                    connection.release();
                    if(err) return callback(err);
                    callback(null,result)
                })
            })
        };
        var sql='select posts.competition_id,posts.title,posts.img,posts.content,FROM_UNIXTIME(posts.create_date,"%Y年%m月%d号") as date,posts.id as post_id from t_competition_posts as posts where posts.competition_id='+competition_id+'  and posts.id='+posts_id+''
        async.auto({
            "posts":function (callback) {
                var params = {
                    "competition_id":competition_id,
                    "id":posts_id
                };
                CompetitionPostsModel.find(params,callback);
            },
            "comments":function (calback) {
                var params = {
                    "competition_id":competition_id,
                    "competition_posts_id":posts_id
                };
                CompetitionPostsCommentModel.select(params,calback);
            }
        },function (err,results) {
            if(err) next(err);
            results['competition_id'] = competition_id;
            results['posts_id'] = posts_id;
            results['posts']['content'] = _.unescape(results['posts']['content']);
            res.render('detail',results);
        })



        // search(sql,function (err,result) {
        //     if(err) return false;
        //     var detail=JSON.parse(JSON.stringify(result));
        //     console.log(detail)
        //     res.render('dynamic',{
        //         dynamicDetail:detail
        //     })
        // })

};
/*动态结束*/


/*评论开始*/
exports.com = function (req,res,nexrt) {
  var user_id= req.data.user_id,
      competition_id=req.data.competition_id,
      posts_id=req.data.posts_id,
      txt=req.data.txt,
      nickname=req.data.nickname;
    var date= Date.parse(new Date())/1000
    function search(sql,callback) {
        Mysql.master.getConnection(function (err,connection) {
            if(err) return callback(err);
            connection.query(sql,function (err,result) {
                connection.release();
                if(err) return callback(err);
                callback(null,result)
            })
        })
    };
    var sql='insert into t_competition_posts_comment (competition_id,competition_posts_id,nickname,content,create_time) VALUES('+competition_id+','+posts_id+',"'+nickname+'","'+txt+'",'+date+')';
    console.log(sql);
    search(sql,function (err,result) {
           if(err) {
               res.json('404')
           }else{
               var data={
                   errCode:'200',
                   results:result
               };
               res.json(data);
           }
       })
};
/*评论结束*/



/*参赛证信息开始*/
exports.card= function (req,res,next) {
    function search(sql,callback) {
        Mysql.master.getConnection(function (err,connection) {
            if(err) return callback(err);
            connection.query(sql,function (err,result) {
                connection.release();
                if(err) return callback(err);
                callback(null,result)
            })
        })
    };
  var user_id=req.data.user_id;
  var ball_team_id= req.data.ball_team_id;
    var  sql='select card.head_pic,comp.title,`user`.nickname,member.clubnumber,team.name from t_user as user join t_ball_team_card as card on(`user`.user_id = card.uid) join t_competition as comp on(comp.competition_id=card.competition_id) join t_ball_team_member as member on(member.uid=`user`.user_id) join t_ball_team as team on(team.ball_team_id=member.ball_team_id)   where `user`.user_id='+user_id+' and team.ball_team_id='+ball_team_id+'';
    console.log(sql)
    search(sql,function (err,result) {
         if(err){
             res.json({
                 errCode:'500',
                 data:'服务器错误！'
             })
         }else{
             res.json({
                 errCode:'200',
                 data:result
             })
         }
     })
};
/*参赛证信息结束*/

/*赛事模块改版H5结束*/


/*赛事首页*/
exports.home = function (req, res, next) {
  var competition_id = req.data.competition_id|0;

  async.auto({
    "competition":function (callback) {
      var params = {
        competition_id:competition_id
      };
      CompetitionModel.find(params,callback);
    },
    "banners":function (callback) {
      var params = {
        competition_id:competition_id,
        is_show:1
      };
      CompetitionBannerModel.select(params,callback);
    },
    "ball_teams":function (callback) {
      var params = {
        competition_id:competition_id,
        status:1
      };
      params['field'] = "t_competition_ballteam.*,b.name,b.logo";
      params['join'] = [
        'join t_ball_team AS b on b.ball_team_id = t_competition_ballteam.ball_team_id'
      ];
      CompetitionBallteamModel.select(params,function (err, data) {
        callback(err,data);
      })
    },
    "posts":function (callback) {
      var params = {
        competition_id:competition_id,
        status:1
      };
      params['field'] = [
          "*,FROM_UNIXTIME(create_time,'%Y-%m-%d %H:%i:%s') AS show_time",
        Util.format("CONCAT('%s',competition_id,'&posts_id=',id) AS url",'/competition/postsInfo?competition_id=')
      ];
      params['order'] = 'create_time';
      CompetitionPostsModel.search(params,function (err, data) {
        callback(err,data['data']);
      })
    },
    "races":function (callback) {
      var params = {};
      params['t_competition_race.is_recommend'] = 1;
      params['t_competition_race.competition_id'] = competition_id;
      params['field'] = [
        "t_competition_race.*,FROM_UNIXTIME(t_competition_race.start_time,'%m月%d日 %H:%i') AS race_start_time",
        'b1.name AS home_team_name,b1.logo AS home_team_logo,b2.name AS guest_team_name,b2.logo AS guest_team_logo',
        "cr.title AS round_title,FROM_UNIXTIME(cr.date,'%Y年%m月%d日') AS round_date",
        'v.name AS venue_name',
        Util.format("CONCAT('/competition/raceDetail?competition_id=%d','&race_id=',t_competition_race.race_id) AS url",competition_id)
      ];
      params['join'] = [
        'join t_competition_round AS cr on t_competition_race.round_id=cr.round_id',
        'join t_ball_team AS b1 on b1.ball_team_id = t_competition_race.home_team_id',
        'join t_ball_team AS b2 on b2.ball_team_id = t_competition_race.guest_team_id',
        'join t_court AS c on t_competition_race.court_id=c.court_id',
        'join t_venue AS v on c.venue_id = v.venue_id'
      ];
      // console.log(sql)
      CompetitionRaceModel.select(params,callback);
    }
  },function (err, results) {
    if(err) return next(err);
    results['competition_id'] = competition_id;

    // res.json(results);
    res.render('home',results);
  });
};

/*球队详情*/
exports.teamInfo = function (req, res, next) {
  var ball_team_id = req.data.ball_team_id;
  var competition_id = req.data.competition_id;

  async.auto({
    "competition_team":function (callback) {
      var param = {
        competition_id:competition_id,
        ball_team_id:ball_team_id
      };
      CompetitionBallteamModel.find(param,callback);
    },
    "team":function (callback) {
      BallTeamModel.getById(ball_team_id,callback)
    },
    "rounds":function (callback) {
      var params = {};
      var condition = {};
      params['field'] = [
        "t_competition_race.*,FROM_UNIXTIME(t_competition_race.start_time,'%m月%d日 %H:%i') AS race_start_time",
        'b1.name AS home_team_name,b1.logo AS home_team_logo,b2.name AS guest_team_name,b2.logo AS guest_team_logo',
        "cr.title AS round_title,FROM_UNIXTIME(cr.date,'%Y年%m月%d日') AS round_date",
        'v.name AS venue_name',
        Util.format("CONCAT('/competition/raceDetail?competition_id=%s','&race_id=',t_competition_race.race_id) AS url",competition_id)
      ];
      params['join'] = [
        'join t_competition_round AS cr on t_competition_race.round_id=cr.round_id',
        'join t_ball_team AS b1 on b1.ball_team_id = t_competition_race.home_team_id',
        'join t_ball_team AS b2 on b2.ball_team_id = t_competition_race.guest_team_id',
        'join t_court AS c on t_competition_race.court_id=c.court_id',
        'join t_venue AS v on c.venue_id = v.venue_id'
      ];
      params['__string'] = Util.format('(t_competition_race.home_team_id = %d OR t_competition_race.guest_team_id=%d)',ball_team_id,ball_team_id);
      CompetitionRaceModel.select(params,condition,function (err, data) {
        if(err) return callback(err);
        var result = _.groupBy(data,'round_id');
        callback(null,result);
      });
    }
  },function (err, results) {
    if(err) return next(err);
    results['competition_id'] = competition_id;

    // res.json(results);
    res.render('teamInfo',results);
  })
};

/*赛事动态*/
exports.posts = function (req, res, next) {
  var competition_id = req.data.competition_id;
  async.auto({
    "competition":function (callback) {
      var param = {
        competition_id:competition_id
      };
      CompetitionModel.find(param,callback);
    }
  },function (err, results) {
    if(err) next(err);
    results['competition_id'] = competition_id;
    
    // res.json(results);
    res.render('posts',results);
  })  
};

/*动态列表*/
exports.postsList = function (req, res, next) {
  var queryParams = req.data;
  queryParams['field'] = "*,FROM_UNIXTIME(create_date,'%Y年%m月%d日') AS date_show";
  queryParams['order'] = 'create_time';
  CompetitionPostsModel.search(queryParams,function (err, data) {
    if(err) return res.wrong(err);
    res.json(data['data']);
  })
};

/*动态详情*/
exports.postsInfo= function (req, res, next) {
  var competition_id = req.data.competition_id;
  var posts_id = req.data.posts_id;
  async.auto({
    "posts":function (callback) {
      var params = {
        "competition_id":competition_id,
        "id":posts_id
      };
      CompetitionPostsModel.find(params,callback);
    },
    "comments":function (calback) {
      var params = {
        "competition_id":competition_id,
        "competition_posts_id":posts_id
      };
      CompetitionPostsCommentModel.select(params,calback);
    }
  },function (err, results) {
    if(err) next(err);
    results['competition_id'] = competition_id;
    results['posts_id'] = posts_id;
    results['posts']['content'] = _.unescape(results['posts']['content']);
    res.json(results);
    res.render('postsDetail',results);
  });
};

/*评论帖子*/
exports.comment_post = function (req, res, next) {
  var data = req.data;
  CompetitionPostsCommentModel.addCompetitionPostsComment(data,function (err, result) {
    console.log(err);
    if(err) return res.wrong(err);
    res.success();
  })
};

/*赛事排行*/
exports.ranking = function (req, res, next) {
  var competition_id = req.data.competition_id|0;

  async.auto({
    "competition":function (callback) {
      CompetitionModel.getById(competition_id,callback);
    },
    "scores":function (callback) {
      var params = {};
      var condition= {};
      params['status'] = 1;
      params['competition_id'] = competition_id;
      params['field'] = 't_competition_ballteam.*,b.name AS ball_team_name,b.logo AS ball_team_logo,(goals_scored-goals_against) AS GD';
      params['join'] = ['join t_ball_team AS b on t_competition_ballteam.ball_team_id = b.ball_team_id'];
      condition['order'] = 't_competition_ballteam.score desc,GD desc,goals_scored desc';
      CompetitionBallteamModel.select(params,condition,callback);
    },
    "group_scores":["competition",function (results,callback) {
      var competition = results['competition'];
      var queryParams = {};
      var condition = {};
      if(competition.type!=1){
        return callback();
      }
      queryParams['field'] = 't_competition_group.id AS group_id,t_competition_group.name AS group_name,cb.*,bt.name AS ball_team_name,bt.logo AS ball_team_logo,(cb.goals_scored-cb.goals_against) AS GD';
      queryParams['t_competition_group.competition_id'] = competition_id;
      condition['order'] = 'group_name asc,score desc,GD desc,cb.goals_scored desc';
      queryParams['join'] = [
          'join t_competition_group_member AS gm on t_competition_group.id = gm.competition_group_id',
          'join t_competition_ballteam AS cb on gm.ball_team_id = cb.ball_team_id AND cb.status=1 AND cb.competition_id='+competition_id,
          'join t_ball_team AS bt on cb.ball_team_id = bt.ball_team_id'
      ];
      CompetitionGroupModel.select(queryParams,condition,function (err, result) {
        if(err) return callback(err);
        var data = _.groupBy(result,'group_id');
        callback(null,data);
      });
    }],
    "shooters":function (callback) {
      var params = {};
      var condition= {};
      params['competition_id'] = competition_id;
      params['field'] = [
          't_competition_member.*,b.name AS ball_team_name,b.logo AS ball_team_logo',
          'u.nickname AS user_nickname,u.avatar AS user_avatar'
      ];
      params['join'] = [
          'join t_ball_team AS b on t_competition_member.ball_team_id = b.ball_team_id',
          'join t_user AS u on t_competition_member.user_id = u.user_id'
      ];
      params['goals_scored'] = ['>','0'];
      condition['order'] = 't_competition_member.goals_scored desc';
      CompetitionMemberModel.select(params,condition,callback);
    },
    "asts":function (callback) {
      var params = {};
      var condition= {};
      params['competition_id'] = competition_id;
      params['field'] = [
        't_competition_member.*,b.name AS ball_team_name,b.logo AS ball_team_logo',
        'u.nickname AS user_nickname,u.avatar AS user_avatar'
      ];
      params['join'] = [
        'join t_ball_team AS b on t_competition_member.ball_team_id = b.ball_team_id',
        'join t_user AS u on t_competition_member.user_id = u.user_id'
      ];
      params['ast'] = ['>','0'];
      condition['order'] = 't_competition_member.ast desc';
      CompetitionMemberModel.select(params,condition,callback);
    }
  },function (err, results) {
    if(err) return next(err);
    results['competition_id'] = competition_id;
    res.json(results);
    // res.render('ranking',results);
  })
};

/*赛事参赛队员详情*/
exports.memberInfo = function (req, res, next) {
  var competition_id = req.data.competition_id;
  var ball_team_id = req.data.ball_team_id;
  var user_id = req.data.user_id;

  var user_data = {
    "goals_scored":0,      //进球数
    "ast":0,                //助攻数
    "best_num":0,          //全场最佳数
    "appearances":0,      //出场数
    "yellow_card":0,      //黄牌数
    "red_card":0,         //红牌数
    "penalty_kick":0,     //点球数
    "team_race_num":0,   //球队参赛数
    "team_num":0          //球队数
  };

  async.auto({
    "user":function (callback) {
      var params = {};
      params['user_id'] = user_id;
      params['field'] = [
          't_user.avatar,t_user.nickname,p.province,ct.city,c.county',
          'btm.clubnumber,bt.name AS team_name,bt.logo AS team_logo'
      ];
      params['join'] = [
          'left join t_province AS p on t_user.province_id = p.province_id',
          'left join t_city AS ct on t_user.city_id = ct.city_id',
          'left join t_county AS c on t_user.county_id = c.county_id',
          'join t_ball_team_member AS btm on t_user.user_id = btm.uid AND btm.ball_team_id = '+ball_team_id,
          'join t_ball_team AS bt on bt.ball_team_id = '+ball_team_id
      ];
      UserModel.find(params,callback);
    },
    "user_total":function (callback) {
      var params = {};
      params['competition_id'] = competition_id;
      params['user_id'] = user_id;
      CompetitionMemberModel.select(params,function (err, result) {
        if(err) return callback(err);

        _.forEach(result,function (value,index) {
          user_data['goals_scored'] += value['goals_scored'];
          user_data['ast'] += value['ast'];
          user_data['best_num'] += value['best_num'];
          user_data['appearances'] += value['appearances'];
          user_data['yellow_card'] += value['yellow_card'];
          user_data['red_card'] += value['red_card'];
          user_data['penalty_kick'] += value['penalty_kick'];
        });
        callback();
      })
    },
    "teams":function (callback) {
      var params = {};
      params['field'] = [
          '(SELECT COUNT(race_id) FROM t_competition_race AS r WHERE (t_competition_member.ball_team_id = r.home_team_id) OR (t_competition_member.ball_team_id = r.guest_team_id) )AS race_num',
          't_competition_member.*,bt.name AS ball_team_name,bt.logo AS ball_team_logo'
      ];
      params['join'] = [
        'join t_ball_team AS bt on t_competition_member.ball_team_id = bt.ball_team_id'
      ];
      params['user_id'] = user_id;
      CompetitionMemberModel.select(params,callback);
    }
  },function (err, results) {
    if(err) next(err);

    var teams = results['teams'];
    user_data['team_num'] = teams.length;
    _.forEach(teams,function (team) {
      user_data['team_race_num'] += team['race_num'];
    });
    var data = {
      "user":results['user'],
      "user_total":user_data,
      "teams":teams
    };
    data['competition_id'] = competition_id;


    // res.json(data);
    res.render('memberInfo',data);
  })
};

/**
 * 赛程页-杯赛外
 */

exports.race = function (req, res, next) {
  var competition_id = req.data.competition_id;

  async.auto({
    "competition":function (callback) {
      var param = {
        competition_id:competition_id
      };
      CompetitionModel.find(param,callback);
    }
  },function (err, results) {
    if(err) next(err);
    results['competition_id'] = competition_id;

    // res.json(results);
    if(results['competition']['type']!==1){
      res.render('race',results);
    }else {
      res.render('race',results);
    }
  })
};

/*赛程列表*/
exports.raceList = function (req, res, next) {
  var competition_id = req.data.competition_id;
  var queryParams = req.data;

  async.auto({
    "rounds":function (callback) {
      queryParams['field'] = "*,FROM_UNIXTIME(date,'%Y年%m月%d日') AS show_date";
      CompetitionRoundModel.search(queryParams,function (err, rounds) {
        callback(err,rounds['data']);
      });
    },
    "races":["rounds",function (results, callback) {
      var rounds = results['rounds'];
      if(_.isEmpty(rounds)){
        return callback(null,[]);
      }
      async.forEachOf(rounds,function (round, index, callback) {
        var param = {};
        param['competition_id'] = competition_id;
        param['round_id'] = round['round_id'];
        param['field'] = [
          "t_competition_race.*,FROM_UNIXTIME(t_competition_race.start_time,'%m月%d日 %H:%i') AS race_start_time",
          'b1.name AS home_team_name,b1.logo AS home_team_logo,b2.name AS guest_team_name,b2.logo AS guest_team_logo',
          'v.name AS venue_name',
          Util.format("CONCAT('/competition/raceDetail?competition_id=%s','&race_id=',t_competition_race.race_id) AS url",competition_id)
        ];
        param['join'] = [
          'join t_ball_team AS b1 on b1.ball_team_id = t_competition_race.home_team_id',
          'join t_ball_team AS b2 on b2.ball_team_id = t_competition_race.guest_team_id',
          'join t_court AS c on t_competition_race.court_id=c.court_id',
          'join t_venue AS v on c.venue_id = v.venue_id'
        ];
        CompetitionRaceModel.select(param,function (err, races) {
          if(err) return callback(err);

          rounds[index]['races'] = races;
          callback();
        })
      },function (err) {
        callback(err,rounds);
      })
    }]
  },function (err, results) {
    if(err) return res.wrong(err);

    var data = results['races'];
    res.json(data);
  })
};

/*赛程详情*/
exports.raceDetail = function (req, res, next) {
  var competition_id = req.data.competition_id;
  var race_id = req.data.race_id;
  async.auto({
    "race":function (callback) {
      var params = {};
      params['t_competition_race.race_id'] = race_id;
      params['t_competition_race.competition_id'] = competition_id;
      params['field'] = [
        "t_competition_race.*,FROM_UNIXTIME(t_competition_race.start_time,'%m月%d日 %H:%i') AS race_start_time",
        'b1.name AS home_team_name,b1.logo AS home_team_logo,b2.name AS guest_team_name,b2.logo AS guest_team_logo',
        "cr.title AS round_title,FROM_UNIXTIME(cr.date,'%Y年%m月%d日') AS round_date",
        'v.name AS venue_name'
      ];
      params['join'] = [
        'join t_competition_round AS cr on t_competition_race.round_id=cr.round_id',
        'join t_ball_team AS b1 on b1.ball_team_id = t_competition_race.home_team_id',
        'join t_ball_team AS b2 on b2.ball_team_id = t_competition_race.guest_team_id',
        'join t_court AS c on t_competition_race.court_id=c.court_id',
        'join t_venue AS v on c.venue_id = v.venue_id'
      ];
      CompetitionRaceModel.find(params,callback);
    },
    "home_team_member":["race",function (results, callback) {
      var race = results['race'];
      var param = {};
      param['field'] = 't_ball_team_member.*,u.phone,u.nickname,u.avatar,u.height,u.weight,u.customary,u.goodAt,u.birthday,u.deviceuuid,ageOfBirthday(u.birthday) AS age,u.user_id,comp.title,comp.competition_id,card.ball_team_id';
      param['join'] = [
          'join t_user as u on t_ball_team_member.uid=u.user_id',
          'join t_ball_team_card as card on t_ball_team_member.uid=card.uid',
          'join t_competition as comp on(comp.competition_id=card.competition_id)'
      ];
      param['t_ball_team_member.ball_team_id'] = race['home_team_id']|0;
        param['card.competition_id'] = race['competition_id']
      BallTeamMemberModel.select(param,callback);
    }],
    "guest_team_member":["race",function (results, callback) {
      var race = results['race'];
      var param = {};
      param['field'] = 't_ball_team_member.*,u.phone,u.nickname,u.avatar,u.height,u.weight,u.customary,u.goodAt,u.birthday,u.deviceuuid,ageOfBirthday(u.birthday) AS age,u.user_id,comp.title,comp.competition_id,card.ball_team_id';
      param['join'] = [
          'join t_user as u on t_ball_team_member.uid=u.user_id',
          //2017/08/01 add by lanveer
          'join t_ball_team_card as card on t_ball_team_member.uid=card.uid',
          'join t_competition as comp on(comp.competition_id=card.competition_id)'
      ];
      param['t_ball_team_member.ball_team_id'] = race['guest_team_id']|0;
      param['card.competition_id'] = race['competition_id']
      BallTeamMemberModel.select(param,callback);
    }]
  },function (err, results) {
    if(err) next(err);

    results['competition_id'] = competition_id;
    results['race_id'] = race_id;
    // res.json(results);
    res.render('raceDetail',results);
  })
};

/*是否支持主队*/
exports.supportHome = function (req, res, next) {
  var competition_id = req.data.competition_id;
  var race_id = req.data.race_id;
  var is_support = req.data.is_support|0;
  var data = {};

  var param = {
    "competition_id":competition_id,
    "race_id":race_id
  };
  if(is_support){
    data['home_support'] = ['home_support+',1];
  }else {
    data['home_support'] = ['home_support-',1];
  }
  CompetitionRaceModel.update(param,data,function (err, result) {
    if(err) res.wrong(err);
    
    res.success();
  })
};

/*是否支持客队*/
exports.supportGuest = function (req, res, next) {
  var competition_id = req.data.competition_id;
  var race_id = req.data.race_id;
  var is_support = req.data.is_support|0;
  var data = {};

  var param = {
    "competition_id":competition_id,
    "race_id":race_id
  };
  if(is_support){
    data['guest_support'] = ['guest_support+',1];
  }else {
    data['guest_support'] = ['guest_support-',1];
  }
  CompetitionRaceModel.update(param,data,function (err, result) {
    if(err) res.wrong(err);

    res.success();
  })
};

/*报名参加赛事*/
exports.enterCompetition = function (req, res, next) {
  var competition_id = req.data.competition_id;
  
  async.auto({
    "competition":function (calllback) {
      var param = {};
      param['competition_id'] = competition_id;
      param['field'] = "*,FROM_UNIXTIME(start_time,'%Y-%m-%d %H:%i') AS show_time,FROM_UNIXTIME(fee_time,'%Y-%m-%d %H:%i') AS show_fee_time";
      CompetitionModel.find(param,calllback);
    },
    "banners":function (callback) {
      var params = {
        competition_id:competition_id,
        is_show:1
      };
      CompetitionBannerModel.select(params,callback);
    },
    "team_num":function (callback) {
      var param = {
        competition_id:competition_id
      };
      CompetitionBallteamModel.count(param,callback);
    }
  },function (err, results) {
    if(err) next(err);
    
    results['competition_id'] = competition_id;

    // res.json(results);
    res.render('enterCompetition',results);
  })
};



/*分享开始*/

//定义公共的出阿里方法
 var public= function search(sql,callback) {
    Mysql.master.getConnection(function (err,connection) {
        if(err) return callback(err);
        connection.query(sql,function (err,result) {
            connection.release();
            if(err) return callback(err);
            callback(null,result);
        })
    })
};


//个人
exports.person= function (req,res,next) {
 var id=req.data.id;
    //查询语句
    var sql='select  a.rest_card,a.id,a.title,a.user_id,a.logo,a.address,FROM_UNIXTIME(a.create_time,"%m月%d日%H:%i")as create_time,a.race_type,a.person_fee,a.team_fee,FROM_UNIXTIME(a.start_time,"%Y.%m.%d  %H:%m")as start_time, a.start_time as start_time1,FROM_UNIXTIME(a.start_time-7200,"%m月%d日%H:%i") as end_time,a.`limit`,a.is_get,a.status,a.team_name as home_name,b.team_name as guest_name from t_ticket_card as a left join t_ticket_card_team as b on a.id=b.card_id where a.type=0 and a.is_cancel=0 and a.id='+id+'';
    public(sql,function (err,result) {
        if(err){
            res.json(err)
        }else{
            var data= JSON.parse(JSON.stringify(result));
            // console.log(data);
            res.render('person',{
                data:data
            })
        }
   })
};


//球队
exports.team= function (req,res,next) {
    var id= req.data.id;
    var sql='select a.rest_card,a.id,a.title,a.user_id,a.logo,a.address,FROM_UNIXTIME(a.create_time,"%m月%d日%H:%i")as create_time,a.race_type,a.person_fee,FROM_UNIXTIME(a.start_time,"%Y.%m.%d  %H:%i")as start_time,a.start_time as start_time1,FROM_UNIXTIME(a.start_time-7200,"%m.%d %H:%i") as end_time,a.`limit`,a.is_get,a.team_fee,a.team_name,a.phone,a.status,a.team_name as home_name from t_ticket_card as a  where a.type=1 and a.is_cancel=0 and a.id='+id+'';
    public(sql,function (err,result) {
        if(err){
            res.json(err)
        }else{
            var data= JSON.parse(JSON.stringify(result));
            console.log(data)
            res.render('team',{
                data:data
            })
        }
    })
};

//队内
exports.duinei= function (req,res,next) {
    var id=req.data.id;
    //查询语句
    var sql='select  a.rest_card,a.id,a.title,a.user_id,a.logo,a.address,FROM_UNIXTIME(a.create_time,"%m月%d日%H:%i")as create_time,a.race_type,a.person_fee,a.team_fee,FROM_UNIXTIME(a.start_time,"%Y.%m.%d  %H:%m")as start_time, a.start_time as start_time1,FROM_UNIXTIME(a.start_time-7200,"%m月%d日%H:%i") as end_time,a.`limit`,a.is_get,a.status,a.team_name as home_name,b.team_name as guest_name from t_ticket_card as a left join t_ticket_card_team as b on a.id=b.card_id where a.type=0 and a.is_cancel=0 and a.id='+id+'';
    public(sql,function (err,result) {
        if(err){
            res.json(err)
        }else{
            var data= JSON.parse(JSON.stringify(result));
            console.log(data);
            res.render('duinei',{
                data:data
            })
        }
    })
};




//硬插数据----领取个人球卡
exports.addPerson= function (req,res,next) {
    var  password='e10adc3949ba59abbe56e057f20f883e';
    var date= Date.parse(new Date())/1000;
    var  name=req.data.name;
    var phone= req.data.phone;
    var card_id=req.data.card_id;
    var limit=req.data.limit;
    var start_time1=req.data.start_time;
    var team_flag=req.data.team_flag||0;
    //检查电话号码是否存在
     var sql1='select phone from t_user where phone='+phone+'';
     //添加到user 表
    var sql2='insert into t_user (phone, password,nickname,create_time) values('+phone+',"'+password+'","'+name+'",'+date+')';
    //从user里面拿出添加的user_id
    var sql3='select a.user_id from t_user as a where phone='+phone+' and nickname="'+name+'"';

    //查询该卡片已存在多少张了
    var sql4='select count(*) as limitnum from t_ticket_card_person where card_id='+card_id+'';

    //已满的时候修改卡片状态
    var sql5='update t_ticket_card set `status`=1 where id='+card_id+'';

    //查看是否重复领取
    //暂时不需要
    // var sql6='select count(*) as count from t_ticket_card_person where user_id='+user_id+' and card_id='+card_id+'';

    //领取卡片---放在拿到user_id之后执行
    // var sql7='INSERT INTO t_ticket_card_person (card_id,user_id,name,tel,start_time,limitNum,team_flag) values('+card_id+','+user_id+',"'+name+'",'+tel+','+start_time+','+limit+','+team_flag+')';

    //修改卡片的状态 放在拿到user_id之后执行
    // var sql8='update t_ticket_card set rest_card ='+num+' where id='+card_id+'';

     //领取成功后获取卡片的信息 放在拿到user_id之后执行
    //var sql9='select b.title,a.start_time from t_ticket_card_person as a join t_ticket_card as b on a.card_id=b.id where a.user_id='+user_id+'';

    public(sql1,function (err,result) {
         if(err){
             res.json({
                 code:500,
                 msg:'查询错误'
             })
         }else{
             var flag=result.length;
             if(flag>0){
                 res.json({
                     code:500,
                     msg:'该号码已注册，请直接登陆!'
                 })
             }else{
                 //user表不存在该条数据，继续走
                 public(sql2,function (err,result) {
                     if(err){
                         res.json({
                             code:'500',
                             msg:'插入数据失败!'
                         })
                     }else{
                         // res.json('添加成功！')
                         //添加成功,查询user_id
                         public(sql3,function (err,result) {
                             if(err){
                                 res.json({
                                     code:500,
                                     msg:'查询user_id出错!'
                                 })
                             }else{
                                 //查询user_id 成功
                                 var user_id=JSON.parse(JSON.stringify(result))[0].user_id;
                                 public(sql4,function (err,result) {
                                     if(err){
                                         res.json({
                                             code:500,
                                             msg:'查询该卡片已存在多少张数据失败!'
                                         })
                                     }else{
                                         console.log('查询该卡片已存在多少张成功！');
                                         var limitNum=JSON.parse(JSON.stringify(result))[0].limitnum;
                                         var restNum= limit-limitNum;
                                         if(limitNum>=limit){
                                             res.json({
                                                 code:500,
                                                 msg:'已经满了!'
                                             });
                                            public(sql5,function (err,result) {
                                                if(err){
                                                    console.log('改变状态失败!');
                                                }else{
                                                    console.log('改变状态成功！');
                                                }
                                            })
                                         }else{
                                             var sql6='select count(*) as count from t_ticket_card_person where user_id='+user_id+' and card_id='+card_id+'';
                                             public(sql6,function (err,result) {
                                                 if(err){
                                                     console.log('查看是否是重复领取失败！')
                                                 }else{
                                                     console.log('查看是否是重复领取成功！');
                                                     var flag= JSON.parse(JSON.stringify(result))[0].count;
                                                     if(flag>=1){
                                                         res.json({
                                                             code:500,
                                                             msg:'重复领取!'
                                                         });
                                                     }else{
                                                         var sql7='INSERT INTO t_ticket_card_person (card_id,user_id,name,tel,start_time,limitNum,team_flag) values('+card_id+','+user_id+',"'+name+'",'+phone+','+start_time1+','+limit+','+team_flag+')';
                                                         public(sql7,function (err,result) {
                                                             if(err){
                                                                 res.json({
                                                                     code:500,
                                                                     msg:'重复失败!'
                                                                 });
                                                             }else{
                                                                 console.log('领取成功！');
                                                                 var sql9='select b.title,a.start_time from t_ticket_card_person as a join t_ticket_card as b on a.card_id=b.id where a.user_id='+user_id+'';
                                                                 public(sql9,function (err,result) {
                                                                     if(err){
                                                                         res.json({
                                                                             code:500,
                                                                             msg:'获取卡片信息失败!'
                                                                         });
                                                                         // console.log('获取卡片信息失败')
                                                                     }else{
                                                                         console.log('获取卡片信息成功！');
                                                                         var title1 =JSON.parse(JSON.stringify(result))[0].title;
                                                                         var start_time =JSON.parse(JSON.stringify(result))[0].start_time;
                                                                         console.log(title1)
                                                                         var newDate = new Date();
                                                                         newDate.setTime(start_time * 1000);
                                                                         var begin=newDate.toLocaleString();
                                                                         var timestamp = Date.parse(new Date());
                                                                         var calc=timestamp = timestamp / 1000;
                                                                         var newDate2 = new Date();
                                                                         newDate2.setTime(calc * 1000);
                                                                         var now=newDate2.toLocaleString();
                                                                         var date1 = new Date(begin)
                                                                         var date2 = new Date(now)
                                                                         var s1 = date1.getTime(),s2 = date2.getTime();
                                                                         var total = (s1 - s2)/1000;
                                                                         var day = parseInt(total / (24*60*60));//计算整数天数
                                                                         var afterDay = total - day*24*60*60;//取得算出天数后剩余的秒数
                                                                         var hour = parseInt(afterDay/(60*60));//计算整数小时数
                                                                         var afterHour = total - day*24*60*60 - hour*60*60;//取得算出小时数后剩余的秒数
                                                                         var min = parseInt(afterHour/60);//计算整数分
                                                                         var afterMin = total - day*24*60*60 - hour*60*60 - min*60;//取得算出分后剩余的秒数
                                                                         var deadline=day+'天'+ hour+'时'+min +'分';
                                                                         var data={
                                                                             code:200,
                                                                             msg:'领取个人球卡成功!'
                                                                         };
                                                                         data['title']=title1;
                                                                         data['deadline']=deadline;
                                                                         data['restnum']=restNum-1;
                                                                         var num= parseInt(restNum-1);
                                                                         var sql8='update t_ticket_card set rest_card ='+num+' where id='+card_id+'';
                                                                         public(sql8,function (err,result) {
                                                                             if(err){
                                                                                 // console.log('更新剩余卡片数量失败！')
                                                                                 res.json({
                                                                                     code:500,
                                                                                     msg:'更新剩余卡片数量失败!'
                                                                                 });
                                                                             }else{
                                                                                 console.log('更新剩余卡片数量成功！')
                                                                                 res.json(data)
                                                                             }
                                                                         })
                                                                     }
                                                                 })
                                                             }
                                                         })
                                                     }
                                                 }
                                             })
                                         }
                                     }
                                 })
                             }
                         })
                     }
                 })
             }
         }
     })
};



//硬茬数据 ----领取球队卡片
 exports.addTeam = function (req,res,next) {
     var  password='e10adc3949ba59abbe56e057f20f883e';
     var date= Date.parse(new Date())/1000;
     var name=req.data.name;
     var team_name=req.data.team_name;
     var phone=req.data.tel;
     var id=req.data.id;
     var start_time1=req.data.start_time1;
     console.log(start_time1)

     //检查电话号码是否存在
      var sql1='select phone from t_user where phone='+phone+'';
      //将这个用户添加到user里面去
     var sql2='insert into t_user (phone, password,nickname,create_time) values('+phone+',"'+password+'","'+name+'",'+date+')';
     //从user里面拿出添加的user_id
     var sql3='select a.user_id from t_user as a where phone='+phone+' and nickname="'+name+'"';
     // 查询卡片是否被领取了
     var sql4='select count(*) as limitnum from t_ticket_card_person where card_id='+id+'';
     //查看是否重复领取
     //var sql5='select count(*) as count from t_ticket_card_team where user_id='+user_id+' and card_id='+id+' and tel='+phone+'';

     //领取卡片
     //var sql6='INSERT INTO `qiuchang3`.`t_ticket_card_team` (`user_id`, `card_id`, `team_name`, `team_user`, `tel`, `start_time`) VALUES ( '+user_id+','+id+', "'+team_name+'", "'+name+'", '+phone+', '+start_time+');';

     // 领取成功的反馈
     //var sql7='select b.title,a.start_time from t_ticket_card_team as a join t_ticket_card as b on a.card_id=b.id where a.user_id='+user_id+'';

     //更改status状态  0 表示未领取 1表示已领取
     var sql8='update t_ticket_card set `status`=1 where id='+id+'';
     // 领取之后type改为0  从球队变成单人的,
     var sql9='update t_ticket_card set `type`=0,`is_get` =1 where id='+id+'';


     public(sql1,function (err,result) {
         var phoneLength= result.length;
         console.log('ddddddd:'+phoneLength)
         if(phoneLength>0){
             res.json({
                 code:500,
                 msg:'该号码已注册，请直接登陆!'
             })
         }else{
             //检查电话号码 ok
             public(sql2,function (err,result) {
                 if(err){
                     res.json({
                         code:500,
                         msg:'添加用户出错'
                     })
                 }else{
                     //添加用户正确
                     public(sql3,function (err,result) {
                         if(err){
                             res.json({
                                 code:500,
                                 msg:'获取user_id出错！'
                             })
                         }else{
                             //正确拿到了user_id
                             var user_id=JSON.parse(JSON.stringify(result))[0].user_id;
                             public(sql4,function (err,result) {
                                 if(err){
                                     res.json({
                                         code:500,
                                         msg:'查询卡片是否被领取查询失败'
                                     })
                                 }else{
                                     //查询卡片是否被领取成功
                                     var limitnum=JSON.parse(JSON.stringify(result))[0].limitnum;
                                     if(limitnum>=1){
                                         //被领走了
                                         public(sql8,function (err,result) {
                                             if(err){
                                                 res.json({
                                                     code:500,
                                                     msg:'更改状态失败'
                                                 })
                                             }else{
                                                 //更改状态成功，在这里不做提示
                                                 console.log('更改状态成功，在这里不做提示');
                                             }
                                         });
                                         res.json({
                                             code:500,
                                             msg:'卡片被领走了，你可以加入他的球队'
                                         })
                                     }else{
                                         //还没有被领走,继续执行下面的代码
                                         //检查是不是重复领取
                                         var sql5='select count(*) as count from t_ticket_card_team where user_id='+user_id+' and card_id='+id+' and tel='+phone+'';
                                         public(sql5,function (err,result) {
                                             if(err){
                                                 res.json({
                                                     code:500,
                                                     msg:'检查是不是重复领取出错'
                                                 })
                                             }else{
                                                var flag= JSON.parse(JSON.stringify(result))[0].count;
                                                if(flag>=1){
                                                    res.json({
                                                        code:500,
                                                        msg:'重复领取,不要贪心'
                                                    })
                                                }else{
                                                    //执行领取操作
                                                    var sql6='INSERT INTO `qiuchang3`.`t_ticket_card_team` (`user_id`, `card_id`, `team_name`, `team_user`, `tel`, `start_time`) VALUES ( '+user_id+','+id+', "'+team_name+'", "'+name+'", '+phone+', '+start_time1+');';
                                                    console.log(sql6)
                                                    public(sql6,function (err,result) {
                                                        if(err){
                                                            res.json({
                                                                code:500,
                                                                msg:'领取的时候出错了'
                                                            })
                                                        }else{
                                                            //领取成功了
                                                            //需要把球队卡片的性质改成队内，也就是变成个人
                                                            public(sql9,function (err,result) {
                                                                if(err){
                                                                    res.json({
                                                                        code:500,
                                                                        msg:'球队卡片的性质改成队内失败'
                                                                    })
                                                                }else{
                                                                    //状态也改成功了
                                                                    //获取反馈
                                                                    var sql7='select b.title,a.start_time from t_ticket_card_team as a join t_ticket_card as b on a.card_id=b.id where a.user_id='+user_id+'';
                                                                    public(sql7,function (err,result) {
                                                                        if(err){
                                                                            res.json({
                                                                                code:500,
                                                                                msg:'获取反馈的时候失败'
                                                                            })
                                                                        }else{
                                                                            //成功拿到了反馈的结果
                                                                            var title =JSON.parse(JSON.stringify(result))[0].title;
                                                                            var start_time =JSON.parse(JSON.stringify(result))[0].start_time;
                                                                            var data={
                                                                                code:200,
                                                                                msg:'领取球队成功!'
                                                                            }
                                                                            var newDate = new Date();
                                                                            newDate.setTime(start_time * 1000);
                                                                            var begin=newDate.toLocaleString();
                                                                            var timestamp = Date.parse(new Date());
                                                                            var calc=timestamp = timestamp / 1000;
                                                                            var newDate2 = new Date();
                                                                            newDate2.setTime(calc * 1000);
                                                                            var now=newDate2.toLocaleString();
                                                                            var date1 = new Date(begin)
                                                                            var date2 = new Date(now)
                                                                            var s1 = date1.getTime(),s2 = date2.getTime();
                                                                            var total = (s1 - s2)/1000;
                                                                            var day = parseInt(total / (24*60*60));//计算整数天数
                                                                            var afterDay = total - day*24*60*60;//取得算出天数后剩余的秒数
                                                                            var hour = parseInt(afterDay/(60*60));//计算整数小时数
                                                                            var afterHour = total - day*24*60*60 - hour*60*60;//取得算出小时数后剩余的秒数
                                                                            var min = parseInt(afterHour/60);//计算整数分
                                                                            var afterMin = total - day*24*60*60 - hour*60*60 - min*60;//取得算出分后剩余的秒数
                                                                            var deadline=day+'天'+ hour+'时'+min +'分';
                                                                            data['title']=title;
                                                                            data['deadline']=deadline;
                                                                            res.json(data)
                                                                        }
                                                                    })
                                                                }
                                                            })
                                                        }
                                                    })
                                                }
                                             }
                                         })
                                     }
                                 }
                             })
                         }
                     })
                 }
             })
         }
     })
 };



 //领取有队内标志的求卡
exports.addDuinei= function (req,res,next) {
    var  password='e10adc3949ba59abbe56e057f20f883e';
    var date= Date.parse(new Date())/1000;
   var team_flag=req.data.team_flag;
   var name=req.data.name;
   var tel=req.data.tel;
   var id=req.data.id;
   var limit=req.data.limit;
   var start_time=req.data.start_time;


    //检查电话号码是否存在
    var sql1='select phone from t_user where phone='+tel+'';
    //添加到user 表
    var sql2='insert into t_user (phone, password,nickname,create_time) values('+tel+',"'+password+'","'+name+'",'+date+')';
    //从user里面拿出添加的user_id
    var sql3='select a.user_id from t_user as a where phone='+tel+' and nickname="'+name+'"';

    //查询主队领取人数
    var  sql4='select count(*) as teamLimit1 from t_ticket_card_person where card_id='+id+' and team_flag = 1';
    //查询客队领取人数
    var  sql5='select count(*) as teamLimit2 from t_ticket_card_person where card_id='+id+' and team_flag = 2';

    //查看是否是重复领取
    //var sql6='select count(*) as count from t_ticket_card_person where user_id='+user_id+' and card_id='+card_id+'';

    //领取主队的球卡
    // var sql7='INSERT INTO t_ticket_card_person (card_id,user_id,name,tel,start_time,limitNum,team_flag) values('+card_id+','+user_id+',"'+name+'",'+tel+','+start_time+','+limit+','+team_flag+')';

    public(sql1,function (err,result) {
        if(err){
            res.json({
                code:500,
                msg:'查询电话号码是否重复失败'
            })
        }else{
            //第一步查询电话正确
            var flag=result.length;
            if(flag>0){
                res.json({
                    code:500,
                    msg:'手机号码已被注册，请直接登录app领取'
                })
            }else{
                //第二步，插入数据到user
                public(sql2,function (err,result) {
                    if(err){
                        res.json({
                            code:500,
                            msg:'添加用户的时候出错了！'
                        })
                    }else{
                        //第三步，添加用户成功，查询出user_id
                        public(sql3,function (err,result) {
                            if(err){
                                res.json({
                                    code:500,
                                    msg:'拿出用户的user_id出错'
                                })
                            }else{
                                //第四步，取出用户user_id成功
                                var user_id=JSON.parse(JSON.stringify(result))[0].user_id;
                                //查询主队已经被领取了多少
                                public(sql4,function (err,result) {
                                    if(err){
                                        res.json({
                                            code:500,
                                            msg:'查询主队领取人数就出错了!'
                                        })
                                    }else{
                                        //第五步，查询主队人数正确
                                        var teamLimit1=parseInt(JSON.parse(JSON.stringify(result))[0].teamLimit1);
                                        //每个队均分人数
                                         var totalLimit= parseInt(limit/2);
                                         public(sql5,function (err,result) {
                                             if(err){
                                                 res.json({
                                                     code:500,
                                                     msg:'查询客队领取人数就出错了'
                                                 })
                                             }else{
                                                 //第六步，查询客队人数正确
                                                 var teamLimit2=parseInt(JSON.parse(JSON.stringify(result))[0].teamLimit2);
                                                 if(team_flag==1){
                                                     //如果加入主队的话
                                                     if(teamLimit1>=totalLimit){
                                                         res.json({
                                                             code:600,
                                                             msg:'主队领取卡片已满!'
                                                         })
                                                     }else{
                                                         var sql6='select count(*) as count from t_ticket_card_person where user_id='+user_id+' and card_id='+id+'';
                                                         public(sql6,function (err,result) {
                                                             if(err){
                                                                 res.json({
                                                                     code:500,
                                                                     msg:'查询是否重复领取失败'
                                                                 })
                                                             }else{
                                                                 var flag= JSON.parse(JSON.stringify(result))[0].count;
                                                                 if(flag>=1){
                                                                     res.json({
                                                                         //可以领取主队的球卡了
                                                                         code:500,
                                                                         msg:'重复领取了哈'
                                                                     })
                                                                 }else{
                                                                     var sql7='INSERT INTO t_ticket_card_person (card_id,user_id,name,tel,start_time,limitNum,team_flag) values('+id+','+user_id+',"'+name+'",'+tel+','+start_time+','+limit+','+team_flag+')';
                                                                    public(sql7,function (err,result) {
                                                                        if(err){
                                                                            res.json({
                                                                                code:500,
                                                                                msg:'领取主队球卡的时候失败了！'
                                                                            })
                                                                        }else{
                                                                            var restNum= totalLimit-teamLimit1;
                                                                           //领取成功，紧接着查询卡片的信息
                                                                            var sql8='select b.title,a.start_time from t_ticket_card_person as a join t_ticket_card as b on a.card_id=b.id where a.user_id='+user_id+'';
                                                                            public(sql8,function (err,result) {
                                                                                if(err){
                                                                                    res.json({
                                                                                        code:500,
                                                                                        msg:'查询卡片信息的时候出错了！'
                                                                                    })
                                                                                }else{
                                                                                    //卡片信息查到了，接下来就是最后一步了
                                                                                    var data={
                                                                                        code:200,
                                                                                        msg:'领取主队球卡成功!'
                                                                                    };
                                                                                    var title =JSON.parse(JSON.stringify(result))[0].title;
                                                                                    var start_time =JSON.parse(JSON.stringify(result))[0].start_time;
                                                                                    var newDate = new Date();
                                                                                    newDate.setTime(start_time * 1000);
                                                                                    var begin=newDate.toLocaleString();
                                                                                    var timestamp = Date.parse(new Date());
                                                                                    var calc=timestamp = timestamp / 1000;
                                                                                    var newDate2 = new Date();
                                                                                    newDate2.setTime(calc * 1000);
                                                                                    var now=newDate2.toLocaleString();
                                                                                    var date1 = new Date(begin)
                                                                                    var date2 = new Date(now)
                                                                                    var s1 = date1.getTime(),s2 = date2.getTime();
                                                                                    var total = (s1 - s2)/1000;
                                                                                    var day = parseInt(total / (24*60*60));//计算整数天数
                                                                                    var afterDay = total - day*24*60*60;//取得算出天数后剩余的秒数
                                                                                    var hour = parseInt(afterDay/(60*60));//计算整数小时数
                                                                                    var afterHour = total - day*24*60*60 - hour*60*60;//取得算出小时数后剩余的秒数
                                                                                    var min = parseInt(afterHour/60);//计算整数分
                                                                                    var afterMin = total - day*24*60*60 - hour*60*60 - min*60;//取得算出分后剩余的秒数
                                                                                    var deadline='距离领卡截止日期还剩    ：'+day+'天'+ hour+'时'+min +'分';
                                                                                    //
                                                                                    data['title']=title;
                                                                                    data['deadline']=deadline;
                                                                                    data['restnum']=restNum-1;
                                                                                    res.json(data)
                                                                                }
                                                                            })
                                                                        }
                                                                    })
                                                                 }
                                                             }
                                                         })
                                                     }
                                                 }else if(team_flag==2){
                                                     //如果选择客队的话
                                                     if(teamLimit2>=totalLimit){
                                                         res.json({
                                                             code:500,
                                                             msg:'客队卡片已经领取完了！'
                                                         })
                                                     }else{
                                                         //客队还有剩余的情况下
                                                         /*检查是否重复领取*/
                                                         var sql6='select count(*) as count from t_ticket_card_person where user_id='+user_id+' and card_id='+id+'';
                                                         public(sql6,function (err,result) {
                                                             if(err){
                                                                 res.json({
                                                                     code:500,
                                                                     msg:'你已经领取了客队的卡片,不能重复领取！'
                                                                 })
                                                             }else{
                                                                 //还没有领取，接下来就开始领取客队卡片了
                                                                 var sql7='INSERT INTO t_ticket_card_person (card_id,user_id,name,tel,start_time,limitNum,team_flag) values('+id+','+user_id+',"'+name+'",'+tel+','+start_time+','+limit+','+team_flag+')';
                                                                 public(sql7,function (err,result) {
                                                                     if(err){
                                                                         res.json({
                                                                             code:500,
                                                                             msg:'领取客队卡片出错！'
                                                                         })
                                                                     }else{
                                                                         var restNum= totalLimit-teamLimit2;
                                                                         //领取成功了
                                                                         var sql8='select b.title,a.start_time from t_ticket_card_person as a join t_ticket_card as b on a.card_id=b.id where a.user_id='+user_id+'';
                                                                         public(sql8,function (err,result) {
                                                                             if(err){
                                                                                 res.json({
                                                                                     code:500,
                                                                                     msg:'获取卡片信息出错了！'
                                                                                 })
                                                                             }else{
                                                                                 //卡片领取成功===同时====卡片信息获取到
                                                                                 var data={
                                                                                     code:200,
                                                                                     msg:'领取客队球卡成功!'
                                                                                 };
                                                                                 var title =JSON.parse(JSON.stringify(result))[0].title;
                                                                                 var start_time =JSON.parse(JSON.stringify(result))[0].start_time;
                                                                                 //
                                                                                 var newDate = new Date();
                                                                                 newDate.setTime(start_time * 1000);
                                                                                 var begin=newDate.toLocaleString();
                                                                                 var timestamp = Date.parse(new Date());
                                                                                 var calc=timestamp = timestamp / 1000;
                                                                                 var newDate2 = new Date();
                                                                                 newDate2.setTime(calc * 1000);
                                                                                 var now=newDate2.toLocaleString();
                                                                                 var date1 = new Date(begin)
                                                                                 var date2 = new Date(now)
                                                                                 var s1 = date1.getTime(),s2 = date2.getTime();
                                                                                 var total = (s1 - s2)/1000;
                                                                                 var day = parseInt(total / (24*60*60));//计算整数天数
                                                                                 var afterDay = total - day*24*60*60;//取得算出天数后剩余的秒数
                                                                                 var hour = parseInt(afterDay/(60*60));//计算整数小时数
                                                                                 var afterHour = total - day*24*60*60 - hour*60*60;//取得算出小时数后剩余的秒数
                                                                                 var min = parseInt(afterHour/60);//计算整数分
                                                                                 var afterMin = total - day*24*60*60 - hour*60*60 - min*60;//取得算出分后剩余的秒数
                                                                                 var deadline='距离领卡截止日期还剩：'+day+'天'+ hour+'时'+min +'分';
                                                                                 //
                                                                                 data['title']=title;
                                                                                 data['deadline']=deadline;
                                                                                 data['restnum']=restNum-1;
                                                                                 res.json(data)
                                                                             }
                                                                         })
                                                                     }
                                                                 })
                                                             }
                                                             console.log('limit:'+limit);
                                                             console.log('teamLimit1:'+teamLimit1);
                                                             console.log('teamLimit2:'+teamLimit2);
                                                             var x= parseInt(limit-(teamLimit1+teamLimit2)-1);
                                                             var sql9=' update t_ticket_card set rest_card ='+x+' where id='+id+'';
                                                             public(sql9,function (err,result) {
                                                                 if(err){
                                                                     res.json({
                                                                         code:500,
                                                                         msg:'更改卡片最终剩余的状态失败！'
                                                                     })
                                                                 }else{
                                                                     //最后成功的回调函数
                                                                     console.log('走到这一步意味着全部正常！')
                                                                 }
                                                             })
                                                         })
                                                     }
                                                 }else{
                                                     res.json({
                                                         code:500,
                                                         msg:'没有明确是选择哪个队伍！'
                                                     })
                                                 }
                                             }
                                         })
                                    }
                                })
                            }
                        })
                    }
                })
            }
        }
    })





};


/*分享结束*/




