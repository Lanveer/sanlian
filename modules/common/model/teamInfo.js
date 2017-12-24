/**
 * Created by Administrator on 2017/6/16 0016.
 */
const util = require('util');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const mysql = require('mysql');
const Mysql = require('../../../db_server/mysql.js');
var baseModel = require('./baseModel');
var Uploader = require('../../../util/uploader');
function teamInfo() {
    this.table = 't_user';
    baseModel.call(this);
    this.primary_key = 'id';
    this.rules = [];
}
util.inherits(teamInfo,baseModel);


/*点击 球队详情开始*/
teamInfo.prototype.index= function (query,callback) {
    var uid= query.uid;
    //查找出当前的球队信息
    var sql1='SELECT team.game_times,team.san_score,team.member_num,team.game_win/team.game_times as win_rate,user.avatar from t_ball_team as team LEFT JOIN  t_user as user on(user.user_id=team.uid)   where `user`.user_id='+uid+'';
    var sql2='select team.name,team.ball_team_id from t_ball_team as team where team.uid= '+uid+'';
    var sql3='select img.url from t_ball_team_img as img where img.user_id='+uid+'';

    //自动查询函数
    function search(sql,callback) {
        Mysql.master.getConnection(function (err,connection) {
            if(err) return callback(err);
            connection.query(sql,function (err,result) {
                connection.release();
                if(err) return callback(err);
                callback(null,result);
            })
        })
    }
    async.auto({
        "teamInfo": function (callback) {
            search(sql1,callback)
        },
        'ballTeam':function (callback) {
            search(sql2,callback)
        },
        'ballTeamImg': function (callback) {
            search(sql3,callback)
        }
    },function (err,result) {
        if(err)return callback(err);
        callback(null,result);
    })



};

/*点击 球队详情结束*/


/*当前用户下面的所有球队信息开始*/
teamInfo.prototype.teamList= function (uid,callback) {
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
    var sql='SELECT * FROM `t_ball_team` as team  where uid='+uid+';';
    search(sql,function (err,result) {
        if(err){
            callback(null,{
                code:'500',
                msg:'获取球队列表出错'
            })
        }else{
            callback(null,{
                code:'200',
                msg:'获取球队列表成功',
                data:result
            })
        }
    })
};

/*当前用户下面的所有球队信息结束*/



/*球队信息开始*/
teamInfo.prototype.detail= function(ball_team_id,callback){
    this.table= 't_ball_team';
    var self=this;
    var conditions={};
    var offset=0;
    var limit=5;
    var order= this.primary_key;
    var sort='desc';
    var queryParams={
        'field':[
            't_ball_team.name',
             't_ball_team.member_num',
             'FROM_UNIXTIME(t_ball_team.create_time,"%Y年%m月%d号")as create_time',
             't_ball_team.game_times',
             't_ball_team.san_score',
             'pro.province',
             't_ball_team.intro',
             'cy.city',
             'ds.county',
             'avg(user.height) as avg_height',
             'avg(user.weight) as avg_weight',
             'avg(ageOfBirthday(user.birthday)) as avg_age',
             '(t_ball_team.game_win)/(t_ball_team.game_times) as win_rate'
        ],
        't_ball_team.ball_team_id':ball_team_id,
        'order': 't_ball_team.ball_team_id'
    }
    queryParams['join']=[
        'left join t_province as pro on t_ball_team.province_id = pro.province_id',
        'left join t_city as cy on t_ball_team.city_id = cy.city_id',
        ' left join t_county as ds on t_ball_team.county_id = ds.county_id',
        'left join t_user as user on t_ball_team.uid= user.user_id',
    ];
    if(!_.isNil(queryParams['limit'])){
        limit = queryParams['limit'] | 0;
        queryParams['limit'] = undefined;
    }
    if(!_.isNil(queryParams['offset'])){
        offset = queryParams['offset'] | 0;
        queryParams['offset'] = undefined;
    }
    if(limit){
        conditions['limit'] = offset+','+limit;
    }

    if(!_.isNil(queryParams['order'])){
        order = _.trim(queryParams['order']);
        queryParams['order'] = undefined;
    }
    if(!_.isNil(queryParams['sort'])){
        sort = _.trim(queryParams['sort']);
        queryParams['sort'] = undefined;
    }
    conditions['order'] = order+' '+sort;
    async.auto({
        "total":function (callback) {
            self.count(queryParams,callback);
        },
        "data":function (callback) {
            self.select(queryParams,conditions,callback);
        }
    },function (err, result) {
        if(err) return callback(err);
        callback(null,result);
    });

};

/*球队信息结束*/


/*管理球员--球员列表开始*/

teamInfo.prototype.ballTeamList = function (query,callback) {
    this.table= 't_ball_team_member';
    var self=this;
    var conditions={};
    var offset=0;
    var limit=10;
    var order= this.primary_key;
    var sort= 'desc';
    var queryParams={
        'field':[
            't_ball_team_member.clubnumber',
            't_ball_team_member.position',
            'user.nickname',
            'user.avatar',
            // 'date_format(from_unixtime(user.birthday),"%Y") AS birthday',
            'ageOfBirthday(user.birthday) as age',
            'user.height',
            'user.weight',
            'user.cur_ballteam_id'
        ],
        't_ball_team_member.ball_team_id':query.ball_team_id,
        't_ball_team_member.uid':query.uid,
        'order':'t_ball_team_member.ball_team_id'
    }
    if( query.user_id ) queryParams['t_ball_team_member.uid'] = ['<>', query.user_id];
    queryParams['join']=[
        'left join t_user as user on t_ball_team_member.uid= user.user_id'
    ];
    if(!_.isNil(queryParams['limit'])){
        limit=queryParams['limit']|0;
        queryParams['limit']= undefined;
    }
    if(!_.isNil(queryParams['offset'])){
        offset=queryParams['offset']|0;
        queryParams['offset']= undefined;
    }
    if(limit){
        conditions['limit'] = offset + ','+ limit;
    }
    if(!_.isNil(queryParams['order'])){
        order= _.trim(queryParams['order']);
        queryParams['order']= undefined;
    }
    //注意这个地方引号一定要空格出来，要不然会报sql拼接错误
    conditions['order']= order + ' ' + sort;
    async.auto({
        "total": function (callback) {
            self.count(queryParams,callback);
        },
        data: function (callback) {
            self.select(queryParams,conditions,callback);
        }
    },function (err,result) {
        if(err)return callback(err);
        callback(null,result);
    })
};

/*管理球员--球员列表结束*/



/* 管理球员- 添加球员开始*/
teamInfo.prototype.addMember = function (query,callback) {
    var phone= query.phone;
    var  password='e10adc3949ba59abbe56e057f20f883e';
    var nickname=query.nickname;
    var ball_team_id=query.ball_team_id;
    var clubnumber = query.clubnumber;
    var uid= query.uid;
    var date= Date.parse(new Date())/1000;
    /*定义公共的查询方法*/
    function search(sql,callback) {
        Mysql.master.getConnection(function (err,connection) {
            if(err) return callback(err);
            connection.query(sql,function (err,result) {
                connection.release();
                callback(null,result)
            })
        })
    }

    //将输入的人添加到t_user这张表里面
    var sql= 'insert into t_user (phone, password,nickname,create_time) values('+phone+',"'+password+'","'+nickname+'",'+date+')';
    //将添加的球员加入球队列表
    var sql2='insert into t_ball_team_member(id,ball_team_id,uid,remark,type,clubnumber,position,create_time) VALUES(null,'+ball_team_id+','+uid+', "'+nickname+'",null,'+clubnumber+',null,'+date+')'
    // 强制将t_user表里面的user_id改成 ball_team_member里面的uid；
    var sql3='update t_ball_team_member as a  INNER JOIN t_user as b on  b.phone='+phone+' and a.remark = b.nickname set a.uid= b.user_id';
    /*
     可以添加球员到球员列表里面去
     http://10.197.1.126/api/teamInfo/addMember?phone=8888&ball_team_id=100&nickname=888&clubnumber=88&uid=88
     */

    /*查找电话号码是否存在*/
    var sqlTel= 'select phone from t_user where phone='+phone+'';
    Mysql.master.getConnection(function (err,connection) {
        if(err) return callback(err);
        connection.query(sqlTel,function (err,result) {
            connection.release();
            if(err) return callback(err)
            var phoneLength= result.length;
            console.log(phoneLength);
            if(phoneLength >0){
                var err={
                    err:"该号码已注册，请直接登陆!",
                    code:'400'
                };
                // var err='该号码已注册，请直接登陆!'
                callback(null,err);
            }else{
                search(sql,callback);
                search(sql2,callback);
                search(sql3,callback);
            }
        })
    })
};
/*管理球员--添加球员结束*/


/*球队比赛开始*/
teamInfo.prototype.ballTeamRace = function (query,callback) {
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
        var ball_team_id= query.ball_team_id;
        var sql1='select comp.img,comp.title,comp.address,comp.start_time,comp.ball_team_num,cb.win_match,cb.score,comp.competition_id from t_competition_ballteam as cb join t_competition as comp on(comp.competition_id=cb.competition_id) where cb.ball_team_id='+ball_team_id+'';
        search(sql1,function (err,result) {
          if(err){
              callback(null, {
                  code:'500',
                  msg:'获取比赛列表出错！'
              })
          }else{
              var rest= JSON.parse(JSON.stringify(result));
              callback(null,{
                  code:'200',
                  msg:'获取数据成功',
                  data:{
                      teamCompetitiom:rest
                  }
              })
          }
      });
};
/*球队比赛结束*/



/*球队比赛详情开始*/
teamInfo.prototype.raceDetail = function (query,callback) {
    function search(sql,callback) {
        Mysql.master.getConnection(function (err,connection) {
            if(err) return callback(err);
            connection.query(sql,function (err,result) {
                connection.release();
                if(err) return callback(err);
                callback(null,result);
            })
        })
    }
    var competition_id= query.competition_id;
    var pages= query.page;
    if(pages == null){
        /*如果没有传递page 表示 默认显示5条信息*/
        start = 0;
        page = 10;
    }else {
        var pages = parseInt(query.page);
        if(pages==1||pages==0){
            start=0;
            page=10;
        }else{
            page= 10;
            start=(pages-1) * page;
        }
    }
    var sql='select race.competition_id, race.race_id,FROM_UNIXTIME(race.start_time,"%Y年%m月%d号")as date,FROM_UNIXTIME(race.start_time,"%m月%d号 %h:%s") as date2,comp.address,round.title,team.logo as homeLogo,team2.logo as guestLogo,team.name as homeName,team2.name as guestName,race.home_goal as homeGoal,race.guest_goal as guestGoal from t_competition_round as round join t_competition_race as race on(round.round_id= race.round_id) join t_competition as comp on(comp.competition_id= race.competition_id) join t_ball_team as team on(race.home_team_id= team.ball_team_id) join t_ball_team as team2 on(race.guest_team_id=team2.ball_team_id) where race.competition_id='+competition_id+' limit '+start+','+page+''
 search(sql,function (err,result) {
     if(err){
         callback(null,{
             code:'500',
             msg:'查询出错了哈'
         })
     }else{
         callback(null,{
             code:'200',
             data:result
         })
     }
 })
};
/*球队比赛详情结束*/


/*球队集锦开始*/
teamInfo.prototype.ballteamCollection = function (query,callback) {

    function search(sql,callback){
        Mysql.master.getConnection(function (err,connection) {
            if(err) return callback(err);
            connection.query(sql,function (err,result) {
                connection.release();
                if(err) return callback(err);
                callback(null,result)
            })
        })
    };
    // var start=0;
 var pages= query.page;
    if(pages == null){
        /*如果没有传递page 表示 默认显示5条信息*/
        start = 0;
        page = 10;
    }else {
       var pages = parseInt(query.page);
        if(pages==1){
            start=0;
            page=10;
        }else{
         page= 10;
         start=pages * page;
        }
    }
    var ball_team_id=query.ball_team_id;
    var sql='select posts.title,posts.img,FROM_UNIXTIME(posts.create_time,"%Y年%m月%d号%h时%m分")as create_time  from t_competition_posts as posts join t_competition_ballteam as team on(posts.competition_id=team.competition_id) where team.ball_team_id='+ball_team_id+' limit '+start+','+page+''
    search(sql,callback);
};
/*球队集锦结束*/



/*球队公告列表开始*/
teamInfo.prototype.noticeList = function (query,callback) {
    /*定义查询方法开始*/
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

//    添加
//     var sql='select * from  t_ball_team_notice as notice LEFT JOIN t_user as user on(notice.user_id = `user`.user_id) where notice.user_id= 5378 and notice.ball_team_id= 352;';
     var sql1=util.format('select notice.content,notice.create_time,`user`.nickname,`user`.avatar,mem.type from  t_ball_team_notice as notice LEFT JOIN t_user as user on(notice.user_id = `user`.user_id)  JOIN t_ball_team_member as mem on(notice.user_id=mem.uid) where notice.user_id= %s and notice.ball_team_id= %s;',
     query.uid,query.ball_team_id
     )
    search(sql1,callback);
};

/*球队公告列表结束*/


/*发布公告开始*/
teamInfo.prototype.doNotice = function (query,callback) {
    function search(sql,callback) {
        Mysql.master.getConnection(function (err,connection) {
            if(err) return callback(err);
            connection.query(sql,function (err,result) {
                connection.release();
                if(err){
                    callback(null,{
                        code:'500',
                        msg:'发起公告失败！'
                    })
                }else{
                    callback(null,{
                        code:'200',
                        msg:'发起公告成功!'
                    })
                }
            })
        })
    };
    var date= Date.parse(new Date())/1000
    var sql= util.format('insert into t_ball_team_notice (ball_team_id,user_id,content,create_time) values(%s,%s,"%s",%s)',
    query.ball_team_id,query.user_id,query.content,date
    );
search(sql,callback);

};
/*发布公告结束*/


module.exports=teamInfo;