/**
 * Created by lanveer on 2017/7/4 0004.
 */
const util= require('util');
const _= require('lodash');
const async= require('async');
const moment = require('moment');
const mysql = require('mysql');
const Mysql= require('../../../db_server/mysql.js');
const baseModel= require('./baseModel');
var uploader= require('../../../util/uploader');

  function ticketCard() {
      this.table='';
      baseModel.call(this);
      this.primary_key= 'id';
      this.rule=[];
  }

  util.inherits(ticketCard,baseModel);

/*主页开始*/
ticketCard.prototype.index= function(query,callback)    {
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
    var user_id= query.user_id;

    console.log(user_id)
    /*banner 信息获取*/
    var sql1='select sum(a.appearances) as appearances,sum(c.win_match) as win_match,sum(c.fail_match) as fail_match, sum(c.flat_match) as flat_match, sum(c.goals_scored) as goals_scored,b.nickname,b.avatar from t_competition_member as a join t_user as b on a.user_id=b.user_id join t_competition_ballteam as c on a.user_id=c.user_id  where a.user_id='+user_id+'';
    /*评价队友人数获取*/
    var sql2='select count(*) as count  from t_ball_team_member as b join t_user as c on b.uid=c.user_id  where ball_team_id in (select a.ball_team_id from t_ball_team_member as a  where a.uid='+user_id+' and b.uid<>'+user_id+' and b.is_comment=0)';
     console.log(sql1);
    async.auto({
      bannerInfo: function (callback) {
          search(sql1,callback)
      },
        commntNum: function (callback) {
            search(sql2,callback)
        }
  },function (err,result) {
      if(err){
          callback(null,{
              code:'500',
              msg:'查询错误'
          })
      }else{
          result['yueren']=0;
          result['order']=0;
          result['pay']=0;
/*          search(sql2,function (err,data) {
              var n= JSON.parse(JSON.stringify(data))[0].count;
          });*/
          var num= JSON.parse(JSON.stringify(result['commntNum']))[0].count;
          result['comment']=num;
          callback(null,{
              code:'200',
              msg:'查询成功',
              data:result
          })
      }
  })
};
/*主页结束*/


/*发起球卡开始*/
ticketCard.prototype.startRace = function (query,callback) {
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
  var user_id= query.user_id,
      logo= query.logo,
      address= query.address,
      start_time=query.start_time,
      race_type=query.race_type,
      team_fee=query.team_fee|'0',
      team_name=query.team_name|| '0',
      person_fee=query.person_fee||'0',
      phone=query.phone||'0',
      title=query.title,
      type=query.type||'0';
  switch (parseInt(race_type)){
      case 0:
         var  limit=3
          break;
      case 1:
          var limit=6
          break;
      case 2:
           var limit=9
          break;
  }
     // var start_time= parseInt(new Date(start_time).getTime()/1000);
     var now_time=parseInt( new Date(new Date())/1000);
       console.log('start_time:'+start_time);
       console.log('now_time:'+now_time);
       var d= start_time-now_time;
    var sql='INSERT INTO `qiuchang3`.`t_ticket_card` (`title`,`user_id`, `logo`, `address`, `start_time`, `race_type`, `team_fee`,`team_name`, `person_fee`, `phone`, `type`, `status` ,`limit`,`create_time`) VALUES ("'+title+'", '+user_id+', "'+logo+'", "'+address+'", "'+start_time+'", '+race_type+', '+team_fee+',"'+team_name+'", '+person_fee+', '+phone+', '+type+', 0,'+limit+','+now_time+')';
   console.log(sql);
    search(sql,function (err,result) {
     if(err){
         callback(null,{
             code:'500',
             msg:'添加出错!'
         });
     }else{
         callback(null,{
             code:'200',
             msg:'添加成功!'
         })
     }
 });
};
/*发起球卡结束*/


/*个人求卡展示开始*/
  ticketCard.prototype.person= function (type,callback) {
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
      // var sql='select * from t_ticket_card as card where card.type='+type+' and card.status=0';
      var sql='select a.id,a.title,a.user_id,a.logo,a.address,FROM_UNIXTIME(a.create_time,"%m月%d日%h:%m")as create_time,a.race_type,a.person_fee,FROM_UNIXTIME(a.start_time,"%Y.%m.%d  %h:%m")as start_time,FROM_UNIXTIME(a.start_time,"%m.%d  %h:%m")as end_time,a.`limit`,a.is_get,a.status from t_ticket_card as a where a.type='+type+' and a.status=0';
      search(sql,function (err,result) {
          if(err){
              callback(null,{
                  code:'500',
                  msg:'列表获取失败'
              })
          }else{
              callback(null,{
                  code:'200',
                  msg:'获取列表成功!',
                  data:result
              })
          }
      })
  };
/*个人求卡展示结束*/


/*球队球展示开始*/
ticketCard.prototype.team= function (type,callback) {
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
    var sql='select a.id,a.title,a.user_id,a.logo,a.address,FROM_UNIXTIME(a.create_time,"%m月%d日%h:%m")as create_time,a.race_type,a.person_fee,FROM_UNIXTIME(a.start_time,"%Y.%m.%d  %h:%m")as start_time,FROM_UNIXTIME(a.start_time,"%m.%d  %h:%m")as end_time,a.`limit`,a.is_get,a.team_fee,a.team_name,a.phone,a.status from t_ticket_card as a where a.type='+type+' and a.status=0';
     search(sql,function (err,result) {
         if(err){
             callback(null,{
                 code:'500',
                 msg:'获取列表错误！'
             })
         }else{
             callback(null,{
                 code:'200',
                 msg:'获取列表成功！',
                 data:result
             })
         }
     })
};
/*球队球展示结束*/


/*领取个人求卡开始*/
ticketCard.prototype.getPersonCard= function (query,callback) {
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
    var card_id= query.card_id,
        user_id=query.user_id,
        name=query.name,
        tel=query.tel,
        start_time=query.start_time,
        is_home=query.is_home||0,
        is_guest=query.is_guest||0,
        limit= query.limit;
    var sql='select count(*) as count from t_ticket_card_person where user_id='+user_id+' and card_id='+card_id+' and name="'+name+'" and tel='+tel+'';
    var sql2='INSERT INTO t_ticket_card_person (card_id,user_id,name,tel,start_time,limitNum) values('+card_id+','+user_id+',"'+name+'",'+tel+','+start_time+','+limit+')';
    var sql3='select count(*) as limitnum from t_ticket_card_person where card_id='+card_id+'';
    var sql4='select b.title,a.start_time from t_ticket_card_person as a join t_ticket_card as b on a.card_id=b.id where a.user_id='+user_id+'';
    var sql5='update t_ticket_card set `status`=1 where id='+card_id+'';
    search(sql3,function (err,result) {
         var limitum=JSON.parse(JSON.stringify(result))[0].limitnum;
         if(limitum>=limit){
             callback(null,{
                 code:'600',
                 msg:"已经满了"
             });
             search(sql5,function (err,result) {
                 if(err){
                     console.log(err)
                 }else{
                     console.log('ok')
                 }
             })
         }else{
             console.log('继续添加');
             search(sql,function (err,result) {
                 var flag= JSON.parse(JSON.stringify(result))[0].count;
                 if(flag >=1){
                     callback(null,{
                         code:'600',
                         msg:'重复领取!'
                     })
                 }else{
                     search(sql2,function (err,result) {
                         if (!err) {
                             var restNum= limit-limitum;
                             search(sql4,function (err,result) {
                                if(err){
                                    callback(null,err)
                                } else{
                                    var data={
                                        code:'200',
                                        msg:'领取成功!'
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
                                    var deadline=day+'天'+ hour+'时'+min +'分';
                                    //
                                    data['title']=title;
                                    data['deadline']=deadline;
                                    data['restnum']=restNum-1;
                                    callback(null,data);
                                }
                             });
                         } else {
                             callback(null, {
                                 code: '500',
                                 msg: '领取失败'
                             })
                         }
                     })
                 }
             })
         }
     })
};
/*领取个人求卡结束*/



/* 领取球队卡片开始*/
ticketCard.prototype.getTeamCard= function (query,callback) {
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
    //参数获取
     var team_id=query.team_id,
         user_id= query.user_id,
         card_id=query.card_id,
         team_name=query.team_name,
         team_user=query.team_user,
         limit=query.limit,
         tel=query.tel,
         start_time=query.start_time;

    //查询限制人数
    var sql='select count(*) as limitnum from t_ticket_card_team where card_id='+card_id+'';
    //查看是否重复领取
    var sql1='select count(*) as count from t_ticket_card_team where user_id='+user_id+' and card_id='+card_id+' and tel='+tel+'';
    //领取球卡
    var sql2='INSERT INTO `qiuchang3`.`t_ticket_card_team` (`user_id`, `card_id`, `team_name`, `team_user`, `limit`, `tel`, `start_time`) VALUES ( '+user_id+','+card_id+', "'+team_name+'", "'+team_user+'", '+limit+', '+tel+', '+start_time+');';
    // 领取成功的反馈
    var sql3='select b.title,a.start_time from t_ticket_card_team as a join t_ticket_card as b on a.card_id=b.id where a.user_id='+user_id+'';
    //更改status状态  0 表示未领取 1表示已领取
    var sql4='update t_ticket_card set `status`=1 where id='+card_id+'';
    // 领取之后type改为1  从球队变成单人的
    var sql5='update t_ticket_card set `type`=0,`is_get` =1 where id='+card_id+'';
    search(sql,function (err,result) {
        var limitum=JSON.parse(JSON.stringify(result))[0].limitnum;
        if(limitum>=limit){
            callback(null,{
                code:'600',
                msg:"已经满了！"
            });
            search(sql4,function (err,result) {
                if(err){
                    console.log(err)
                }else{
                    console.log('ok')
                }
            })
        }else{
            search(sql1,function (err,result) {
                var flag= JSON.parse(JSON.stringify(result))[0].count;
                console.log(flag);
                if(flag >=1){
                    callback(null,{
                        code:'600',
                        msg:'重复领取！'
                    })
                }else{
                    search(sql2,function (err,result) {
                        if(err){
                            callback(null,{
                                code:'500',
                                msg:'领取失败！'
                            })
                        }else{
                            search(sql3,function (err,result) {
                                if(err){
                                    callback(null,err)
                                }else{
                                    search(sql5,function (err,result) {
                                        if(err){
                                            console.log(err)
                                        }else{
                                            console.log(result);
                                            console.log('ok');
                                        }
                                    })
                                    var data={
                                        code:'200',
                                        msg:'领取成功!'
                                    };
                                    var restNum= limit-limitum;
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
                                    var deadline=day+'天'+ hour+'时'+min +'分';
                                    data['title']=title;
                                    data['deadline']=deadline;
                                    data['restnum']=restNum-1;
                                    callback(null,data)
                                }
                            })
                        }
                    })
                }
            })
        }
    })
    
};
/* 领取球队卡片结束*/




/*求卡详情开始*/
ticketCard.prototype.cardDetail=function (query,callback) {
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
    var id=query.id
    var sql='select FROM_UNIXTIME(a.start_time,"%Y年%m月%d日%h:%m")as start_time,FROM_UNIXTIME(a.start_time,"%Y年%m月%d日%h:%m")as end_time,a.address,a.race_type,a.person_fee,COUNT(b.card_id) as teamNumber  from t_ticket_card as a join t_ticket_card_person as b on (a.id=b.card_id) where a.id='+id+'';
    search(sql,function (err,result) {
        if(err){
            callback(null,{
                code:'500',
                msg:'获取详情失败'
            })
        }else{
            callback(null,{
                code:'200',
                msg:'获取详情成功',
                data:result
            })
        }
    })
};


/*求卡详情结束*/




/*求卡详情开始*/

/*求卡详情结束*/




/*我领取的球卡开始*/

/*我领取的球卡结束*/



/**
 * 获取需要评价的队友的列表以及队友的信息
 * @param req
 * @param res
 * @param next
 */


/*待评论列表开始*/
ticketCard.prototype.commentList= function (query,callback) {
    var uid=query.user_id;
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
    var pages= query.page;
    if(pages == null){
        /*如果没有传递page 表示 默认显示5条信息*/
        start = 0;
        page = 20;
    }else {
        var pages = parseInt(query.page);
        if(pages==1||pages==0){
            start=0;
            page=20;
        }else{
            page= 20;
            start=(pages-1) * page;
        }
    }
    var sql='select c.avatar,b.remark,b.type,ageOfBirthday(c.birthday)as age,c.height,c.weight,b.clubnumber,b.position,b.uid,b.is_comment,b.ball_team_id from t_ball_team_member as b join t_user as c on b.uid=c.user_id  where ball_team_id in (select a.ball_team_id from t_ball_team_member as a  where a.uid='+uid+' and b.uid<>'+uid+' and b.is_comment=0) limit '+start+','+page+';';
    search(sql,function (err,result) {
        if(err){
            callback(null,{
                code:'500',
                msg:'获取列表失败！'
            })
        }else{
            callback(null,{
                code:'200',
                msg:'获取列表成功！',
                data:result
            })
        }
    })
};
/*待评论列表结束*/


  /*确认评价开始*/
  ticketCard.prototype.confirm= function (query,callback) {
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

      var  user_id=query.user_id,
          score= query.score,
          guest_user_id=query.guest_user_id;
      var number='select t_comment.user_id,t_comment.guest_user_id  from t_comment where user_id='+user_id+'';
      search(number,function (err,result) {
          if(err) return callback(err);
          var count= JSON.parse(JSON.stringify(result));
          var compare=[];
          for(var i=0;i<count.length;i++){
              var x= count[i].user_id;
              var y=count[i].guest_user_id;
          }
          if(x == user_id && y==guest_user_id){
              //在这种情况下面，一方面可以不允许再次评价，另一方面可以修改评论的分数
                console.log('no');
                callback(null,{
                    code:'300',
                    msg:'已经评价过了!'
                });
          }else{
              var date= parseInt(new Date().getTime()/1000);
              var sql='insert into t_comment(user_id,score,guest_user_id,create_time) VALUES('+user_id+','+score+','+guest_user_id+','+date+')';
              var sql2='update t_ball_team_member set is_comment=1 where uid='+guest_user_id+'';
             console.log(sql)
              search(sql,function (err,result) {
                  if(err) {
                      callback(null, {
                          code:'500',
                          msg:'评价失败！'
                      })
                  }else {
                      callback(null,{
                          code:'200',
                          msg:'评价成功!'
                      })
                      search(sql2,callback);
                  }
              });
          }
      });
  };
  /*确认评价结束*/

  /*我的评论开始*/
  ticketCard.prototype.myComment= function (query,callback) {
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
      var guest_user_id= query.guest_user_id;
      var sql='select `user`.nickname,`user`.avatar,FROM_UNIXTIME(com.create_time,"%Y年%m月%d号%h时%m分")as create_time,com.score  from t_comment as com left join t_user as user ON(com.user_id= `user`.user_id) where com.guest_user_id='+guest_user_id+''
      search(sql,function (err,result) {
            if(err) return callback(err);
            callback(null,{
                code:'200',
                data:result
            })
      })
  };
  /*我的评论结束*/

/*商城板块开始*/

//商品列表开始
ticketCard.prototype.goodsList= function (query,callback){
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
    var pages= query.page;
    var user_id= query.user_id;
    if(pages == null){
        /*如果没有传递page表示 默认显示5条信息*/
        start = 0;
        page = 20;
    }else {
        var pages = parseInt(query.page);
        if(pages==1||pages==0){
            start=0;
            page=20;
        }else{
            page= 20;
            start=(pages-1) * page;
        }
    }
    console.log(start,page)
    var sql='SELECT * FROM `t_goods_list`  where store>=1 LIMIT '+start+','+page+'';
    search(sql,function (err,result) {
        if(err) return callback(null,{
            code:'500',
            data:err
        });
        callback(null,{
            code:'200',
            data:result
        })
    })

};

//商品详情开始
ticketCard.prototype.goodsInfo= function (query,callback) {
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
    var goods_id= query.goods_id
    var sqls=[
        'select * from t_goods_list where goods_id='+goods_id+'',
        'select *  from t_goods_imgs where goods_img_id='+goods_id+''
    ];
    var counts = {};
    async.forEachOf(sqls, function(value, key, callback) {
        // 遍历每条SQL并执行
        search(value, function(err, results) {
            if(err) {
                callback(err);
            } else {
                counts['detail'+key] = results;
                callback();
            }
        });
    }, function(err) {
        // 所有SQL执行完成后回调
        if(err) {
            callback(null,{
                code:'500',
                msg:'失败'
            })
        } else {
            var x=JSON.parse(JSON.stringify(counts));
            callback(null,{
                code:'200',
                data:x
            })
        }
    });
};

/*商城板块结束*/




module.exports=ticketCard;
