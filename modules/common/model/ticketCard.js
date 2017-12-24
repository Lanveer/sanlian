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
ticketCard.prototype.index= function(query,callback) {
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
     console.log(sql2);
    async.auto({
      bannerInfo: function (callback) {
          search(sql1,callback)
      }
      ,
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
          search(sql2,function (err,data) {
              var n= JSON.parse(JSON.stringify(data))[0].count;
          });
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
      logo= query.logo||'0',
      address= query.address,
      start_time=query.start_time,
      race_type=query.race_type,
      team_fee=query.team_fee|'0',
      team_name=query.team_name|| '0',
      person_fee=query.person_fee||'0',
      phone=query.phone||'0',
      title=query.title,
      type=query.type||'0',
      limit=query.limit||'0';

      if(race_type==0){
          limitnum=5;
      }else if(race_type==1){
          limitnum=7;
      }else if(race_type==2){
          limitnum=9;
      }else if(race_type==3){
          limitnum=11;
      }
     // var start_time= parseInt(new Date(start_time).getTime()/1000);
     var now_time=parseInt( new Date(new Date())/1000);
       console.log('start_time:'+start_time);
       console.log('now_time:'+now_time);
       var d= start_time-now_time;
       // var person_rest_card=parseInt(limitnum);
       // var team_rest_card= parseInt(limitnum*2);
    var person_rest_card=parseInt(limit);
    var team_rest_card= parseInt(limit*2);
    var sql='INSERT INTO `qiuchang3`.`t_ticket_card` (`title`,`user_id`, `logo`, `address`, `start_time`, `race_type`, `team_fee`,`team_name`, `person_fee`, `phone`, `type`, `status` ,`limit`,`create_time`,`rest_card`) VALUES ("'+title+'", '+user_id+', "'+logo+'", "'+address+'", "'+start_time+'", '+race_type+', '+team_fee+',"'+team_name+'", '+person_fee+', '+phone+', '+type+', 0,'+limit+','+now_time+','+person_rest_card+')';
    var sql2='INSERT INTO `qiuchang3`.`t_ticket_card` (`title`,`user_id`, `logo`, `address`, `start_time`, `race_type`, `team_fee`,`team_name`, `person_fee`, `phone`, `type`, `status` ,`limit`,`create_time`,`rest_card`) VALUES ("'+title+'", '+user_id+', "'+logo+'", "'+address+'", "'+start_time+'", '+race_type+', '+team_fee+',"'+team_name+'", '+person_fee+', '+phone+', '+type+', 0,'+limit+','+now_time+','+team_rest_card+')';
    console.log(sql);
    // 判断是球队还是个人
    if(type==0){
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
    }else{
        search(sql2,function (err,result) {
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
    }

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
      // var sql='select a.id,a.title,a.user_id,a.logo,a.address,FROM_UNIXTIME(a.create_time,"%m月%d日%h:%m")as create_time,a.race_type,a.person_fee,FROM_UNIXTIME(a.start_time,"%Y.%m.%d  %h:%m")as start_time,FROM_UNIXTIME(a.start_time-7200,"%m月%d日%h:%m") as end_time,a.`limit`,a.is_get,a.status,a.team_name as home_name,b.team_name as guest_name from t_ticket_card as a join t_ticket_card_team as b on a.id=b.card_id where a.status=0';
      var sql='select  a.rest_card,a.id,a.title,a.user_id,a.logo,a.address,FROM_UNIXTIME(a.create_time,"%m月%d日%H:%i")as create_time,a.race_type,a.person_fee,a.team_fee,FROM_UNIXTIME(a.start_time,"%Y.%m.%d  %H:%i")as start_time, a.start_time as start_time1,FROM_UNIXTIME(a.start_time-7200,"%m月%d日%H:%i") as end_time,a.`limit`,a.is_get,a.status,a.team_name as home_name,b.team_name as guest_name,a.rest_card from t_ticket_card as a left join t_ticket_card_team as b on a.id=b.card_id where a.type='+type+' and a.is_cancel=0';
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


/*球队球卡片展示开始*/
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
        var sql='select a.rest_card,a.id,a.title,a.user_id,a.logo,a.address,FROM_UNIXTIME(a.create_time,"%m月%d日%H:%i")as create_time,a.race_type,a.person_fee,FROM_UNIXTIME(a.start_time,"%Y.%m.%d  %H:%i")as start_time,a.start_time as start_time1,FROM_UNIXTIME(a.start_time-7200,"%m.%d %h:%m") as end_time,a.`limit`,a.is_get,a.team_fee,a.team_name,a.phone,a.status,a.team_name as home_name from t_ticket_card as a  where a.type='+type+' and a.is_cancel=0';
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
/*球队球卡展示结束*/


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
        team_flag=query.team_flag||0,
        limit= query.limit,
        card_type=query.card_type||0;
    // var sql='select count(*) as count from t_ticket_card_person where user_id='+user_id+' and card_id='+card_id+' and name="'+name+'" and tel='+tel+'';

    //查看是否是重复领取
    var sql='select count(*) as count from t_ticket_card_person where user_id='+user_id+' and card_id='+card_id+'';
   //领取卡片
    var sql2='INSERT INTO t_ticket_card_person (card_id,user_id,name,tel,start_time,limitNum,team_flag) values('+card_id+','+user_id+',"'+name+'",'+tel+','+start_time+','+limit+','+team_flag+')';
   //查询该卡片已经领取了多少张
    var sql3='select count(*) as limitnum from t_ticket_card_person where card_id='+card_id+'';
    //查找出title和开始的时间
    var sql4='select b.title,a.start_time from t_ticket_card_person as a join t_ticket_card as b on a.card_id=b.id where a.user_id='+user_id+'';
   //将卡片标记为已满
    var sql5='update t_ticket_card set `status`=1 where id='+card_id+'';
    //球队主队领取人数
    var  sql6='select count(*) as teamLimit1 from t_ticket_card_person where card_id='+card_id+' and team_flag = 1';
    //球队客队领取人数
    var  sql7='select count(*) as teamLimit2 from t_ticket_card_person where card_id='+card_id+' and team_flag = 2';

    //检查现在有好多人了
     var sql8='select count(*), b.`limit` as limitnum from t_ticket_card_person as a  join t_ticket_card as b on b.id=a.card_id  where  a.card_id='+card_id+'';

     //将还剩余好多人存入表里面

    if(card_type!=0){
       //console.log('领取的足球球卡');
        search(sql6,function (err,result) {
            if(err){
                //
            }
            else{
                var teamLimit1=parseInt(JSON.parse(JSON.stringify(result))[0].teamLimit1);
                search(sql7,function (err,result) {
                 var teamLimit2=parseInt(JSON.parse(JSON.stringify(result))[0].teamLimit2);
                 var totalLimit= parseInt(limit/2)
                 console.log('1111:'+teamLimit1);
                 console.log('2222:'+teamLimit2);
                 console.log('3333:'+totalLimit);
                    if(team_flag==1){
                        if(teamLimit1>=totalLimit){
                            console.log('球队主队已满');
                            callback(null,{
                                code:'500',
                                msg:'主队领取球卡已满'
                            })
                        }else{
                            console.log('主队没有满');
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
                                            var restNum= totalLimit-teamLimit1;
                                            search(sql4,function (err,result) {
                                                if(err){
                                                    callback(null,err)
                                                } else{
                                                    var data={
                                                        code:'200',
                                                        msg:'领取主队球卡成功!'
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
                                                    var deadline='剩余时间为：'+day+'天'+ hour+'时'+min +'分';
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
                    }else if(team_flag==2){
                        if(teamLimit2>=totalLimit){
                            console.log('球队客队已满');
                            callback(null,{
                                code:'500',
                                msg:'客队领取球卡已满'
                            })
                        }else{
                            console.log('客队没有满');
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
                                            var restNum= totalLimit-teamLimit2;
                                            search(sql4,function (err,result) {
                                                if(err){
                                                    callback(null,err)
                                                } else{
                                                    var data={
                                                        code:'200',
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
                                                    var deadline='剩余时间为：'+day+'天'+ hour+'时'+min +'分';
                                                    //
                                                    data['title']=title;
                                                    data['deadline']=deadline;
                                                    data['restnum']=restNum-1;
                                                    callback(null,data);
                                                    var x= parseInt(limit-(teamLimit1+teamLimit2)-1);
                                                    var sql9=' update t_ticket_card set rest_card ='+x+' where id='+card_id+'';
                                                    search(sql9,function (err,result) {
                                                        if(err){
                                                            callback(null,{
                                                                code:'500',
                                                                msg:'未知错误'
                                                            })
                                                        }else{
                                                            callback(null,data)
                                                        }
                                                    })
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
                    }else{
                        callback(null,{
                            code:'500',
                            msg:'参数错误!'
                        })
                    }
                    //console.log('limit:'+limit);
                    //console.log('teamLimit1:'+teamLimit1);
                    //console.log('teamLimit2:'+teamLimit2);
                    // var x= parseInt(limit-(teamLimit1+teamLimit2)-1);
                    //console.log('x:'+x);
                    // var sql9=' update t_ticket_card set rest_card ='+x+' where id='+card_id+'';
                    // search(sql9,function (err,result) {
                    //     if(err){
                    //         callback(null,{
                    //             code:'500',
                    //             msg:'未知错误'
                    //         })
                    //     }else{
                    //         callback(null,{
                    //             code:'200',
                    //             msg:'领取成功并成功更改状态'
                    //         })
                    //     }
                    // })
                })
            }
        })

    }else{
        //console.log('领取的个人球卡')
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
                                        var num= parseInt(restNum-1);
                                        var sql9=' update t_ticket_card set rest_card ='+num+' where id='+card_id+'';
                                       search(sql9,function (err,result) {
                                           if(err){
                                               callback(null,{})
                                           }else{
                                               callback(null,data);
                                           }
                                       })

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
    }
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
         tel=query.tel,
         start_time=query.start_time;
    //查询限制人数
    var sql='select count(*) as limitnum from t_ticket_card_team where card_id='+card_id+'';
    //查看是否重复领取
    var sql1='select count(*) as count from t_ticket_card_team where user_id='+user_id+' and card_id='+card_id+' and tel='+tel+'';
    //领取球卡
    var sql2='INSERT INTO `qiuchang3`.`t_ticket_card_team` (`user_id`, `card_id`, `team_name`, `team_user`, `tel`, `start_time`) VALUES ( '+user_id+','+card_id+', "'+team_name+'", "'+team_user+'", '+tel+', '+start_time+');';
    // 领取成功的反馈
    var sql3='select b.title,a.start_time from t_ticket_card_team as a join t_ticket_card as b on a.card_id=b.id where a.user_id='+user_id+'';
    //更改status状态  0 表示未领取 1表示已领取
    var sql4='update t_ticket_card set `status`=1 where id='+card_id+'';
    // 领取之后type改为0  从球队变成单人的,
    var sql5='update t_ticket_card set `type`=0,`is_get` =1 where id='+card_id+'';

    search(sql,function (err,result) {
        var limitum=JSON.parse(JSON.stringify(result))[0].limitnum;
        if(limitum >=1){
            callback(null,{
                code:'600',
                msg:"该球卡已经被人领走了，你可以加入他的球队！"
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



/*选择球队开始*/
ticketCard.prototype.chooseTeam= function (query,callback) {
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
};
/*选择球队结束*/


/*个人求卡详情开始*/
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
    }
    var id=query.id;
    var is_get=query.is_get;
     var sql='select FROM_UNIXTIME(a.start_time,"%Y年%m月%d日%H:%i")as start_time,FROM_UNIXTIME(a.start_time-7200,"%Y年%m月%d日%H:%i")as end_time,a.address,a.race_type,a.person_fee, a.team_fee,COUNT(b.card_id) as teamNumber,a.rest_card  from t_ticket_card as a join t_ticket_card_person as b on (a.id=b.card_id) where a.id='+id+'';
     var sql2='select a.name as nickname,a.user_id,b.avatar,b.phone,c.type from t_ticket_card_person as a join t_user as b on a.user_id=b.user_id join t_ball_team_member as c on a.user_id=c.uid where a.card_id='+id+'';
    //主队列表信息
    var sql3='select b.avatar,c.type,a.`name` as nickname, a.user_id,b.phone from t_ticket_card_person as a  join t_user as b on b.user_id=a.user_id  join t_ball_team_member as c on a.user_id=c.uid where a.team_flag=1;';
    //客队信息列表
    var sql4='select b.avatar,c.type,a.`name` as nickname, a.user_id,b.phone from t_ticket_card_person as a  join t_user as b on b.user_id=a.user_id  join t_ball_team_member as c on a.user_id=c.uid where a.team_flag=2;';

    //主队队名
    var sql5='select a.team_name as home_name from t_ticket_card as a where id='+id+'';
    //客队队名
    var sql6='select a.team_name as guest_name from t_ticket_card_team as a where card_id='+id+'';

    if(is_get==0){
        async.auto({
            basicInfo:function (callback) {
                search(sql,callback);
            },
            teamMember:function (callback) {
                search(sql2,callback);
            }
        },function (err,result) {
            if(err){
                callback(null,{
                    code:'500',
                    msg:'信息获取失败！',
                    data:err
                })
            }else{
                callback(null,{
                    code:'200',
                    msg:'信息获取成功！',
                    data:result
                })
            }
        })
    }else if(is_get==1){
        async.auto({
            basicInfo:function (callback) {
                search(sql,callback);
            },
            home_member:function (callback) {
                search(sql3,callback);
            },
            guest_member:function (callback) {
                search(sql4,callback)
            },
            home_name:function (callback) {
                search(sql5,function (err,result) {
                    var home_name=JSON.parse(JSON.stringify(result))[0].home_name;
                    console.log(home_name);
                    callback(null,home_name)
                })
            },
            guest_name:function (callback) {
                search(sql6,function (err,result) {
                    var guest_name=JSON.parse(JSON.stringify(result))[0].guest_name;
                    console.log(guest_name);
                    callback(null,guest_name);
                })
            }
        },function (err,result) {
            if(err){
                callback(null,{
                    code:'500',
                    msg:'信息获取失败！',
                    data:err
                })
            }else{
                callback(null,{
                    code:'200',
                    msg:'信息获取成功！',
                    data:result
                })
            }
        })
    }else{
        callback(null,{
            code:'500',
            msg:'请传递正确参数！'
        })
    }

};
/*个人求卡详情结束*/


/*球队卡片详情开始*/
ticketCard.prototype.teamCardDetail= function (query,callback) {
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
    var id= query.id;
    var sql1='select FROM_UNIXTIME(a.start_time,"%Y年%m月%d日%H:%i")as start_time,FROM_UNIXTIME(a.start_time-7200,"%Y年%m月%d日%H:%i")as end_time,a.address,a.race_type,a.team_fee,COUNT(b.card_id) as teamNumber,a.team_name  from t_ticket_card as a join t_ticket_card_team as b on (a.id=b.card_id) where a.id='+id+'';
    //主队列表信息
    //var sql2='select b.avatar,c.type,a.`name` as nickname,b.phone from t_ticket_card_person as a  join t_user as b on b.user_id=a.user_id  join t_ball_team_member as c on a.user_id=c.uid where a.team_flag=1;';
    //客队信息列表
    //var sql3='select b.avatar,c.type,a.`name` as nickname,b.phone from t_ticket_card_person as a  join t_user as b on b.user_id=a.user_id  join t_ball_team_member as c on a.user_id=c.uid where a.team_flag=2;';

    async.auto({
        basicInfo:function (callback) {
            search(sql1,callback)
        }
    /*    ,
        home_member:function (callback) {
            search(sql2,callback)
        },
        guest_member:function (callback) {
            search(sql3,callback)
        }*/

    },function (err,result) {
        if(err){
            callback(null,{
                code:'500',
                msg:'获取数据失败！'
            })
        }else{
            callback(null,{
                code:'200',
                msg:'获取数据成功!',
                data:result
            })
        }
    })
};
/*球队卡片详情结束*/


/*我领取的球卡开始*/
ticketCard.prototype.myGetTicket=function (query,callback) {
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
    /*card_type 为0 的时候表示个人球卡，为1 表示球队球卡*/
    var card_type=query.card_type,
        uid=query.uid;
    var now_time=parseInt( new Date(new Date())/1000);
    //我领取的个人卡片
     var sql='select b.rest_card,a.card_id,a.id,b.title,b.logo,b.address,b.race_type,b.person_fee,b.team_fee,b.is_get,FROM_UNIXTIME(b.create_time,"%m月%d日%H:%i")as create_time,FROM_UNIXTIME(b.start_time,"%Y.%m.%d  %H:%i")as start_time,b.start_time as start_time1, (b.start_time-'+now_time+') as status from t_ticket_card_person as a join t_ticket_card as b on a.card_id=b.id where a.user_id='+uid+' and a.status=0';
    //我领取的球队卡片
     var sql2='select b.is_get,b.rest_card,a.card_id,a.team_id, b.title,b.logo,b.address,b.race_type,b.team_fee,b.team_name,b.team_name as home_name,a.team_name as guest_name,FROM_UNIXTIME(b.create_time,"%m月%d日%H:%i")as create_time,FROM_UNIXTIME(b.start_time,"%Y.%m.%d  %H:%i")as start_time, b.start_time as start_time1,b.start_time-'+now_time+' as status from t_ticket_card_team as a join t_ticket_card as b on b.id=a.card_id where a.user_id='+uid+' and a.status=0';
     if(card_type ==0){
         search(sql,function (err,result) {
             if(err){
                 console.log(err)
             }else{
                 var dataerror={
                     code: '200',
                     msg: '数据为空！'
                 };
                 dataerror['data']=result;
                 if(JSON.parse(JSON.stringify(result))==''){
                     callback(null,dataerror)
                 }else {
                     var data = {
                         code: '200',
                         msg: '获取列表数据成功！'
                     };
                     var start_time = JSON.parse(JSON.stringify(result))[0].start_time1;
                     var newDate = new Date();
                     newDate.setTime(start_time * 1000);
                     var begin = newDate.toLocaleString();
                     var timestamp = Date.parse(new Date());
                     var calc = timestamp = timestamp / 1000;
                     var newDate2 = new Date();
                     newDate2.setTime(calc * 1000);
                     var now = newDate2.toLocaleString();
                     var date1 = new Date(begin)
                     var date2 = new Date(now)
                     var s1 = date1.getTime(), s2 = date2.getTime();
                     var total = (s1 - s2) / 1000;
                     var day = parseInt(total / (24 * 60 * 60));//计算整数天数
                     var afterDay = total - day * 24 * 60 * 60;//取得算出天数后剩余的秒数
                     var hour = parseInt(afterDay / (60 * 60));//计算整数小时数
                     var afterHour = total - day * 24 * 60 * 60 - hour * 60 * 60;//取得算出小时数后剩余的秒数
                     var min = parseInt(afterHour / 60);//计算整数分
                     var afterMin = total - day * 24 * 60 * 60 - hour * 60 * 60 - min * 60;//取得算出分后剩余的秒数
                     var deadline = day + '天' + hour + '时' + min + '分';
                     // data['deadline']=deadline;
                     data['data'] = result
                     callback(null, data)
                 }
             }

         })
     }else if(card_type == 1){
         search(sql2,function (err,result) {
             if(err){
                 console.log(err)
             }else{
                 var dataerror={
                     code: '200',
                     msg: '数据为空！'
                 };
                 dataerror['data']=result;
                 if(JSON.parse(JSON.stringify(result))==''){
                     callback(null,dataerror)
                 }else{
                     var data={
                         code:'200',
                         msg:'获取列表数据成功！'
                     };
                 var start_time =JSON.parse(JSON.stringify(result))[0].start_time1;
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
                 // data['deadline']=deadline;
                 data['data']=result;
                 callback(null,data)
                 }
             }
         });
     }else{
         callback(null,{
             code:'500',
             msg:'参数错误！'
         })
     }
};
/*我领取的球卡结束*/


/*我发起的球卡开始*/
ticketCard.prototype.myPostTicket= function (query,callback) {
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
 var now_time=parseInt( new Date(new Date())/1000);
 var uid= query.uid;
 var card_type= query.card_type;
    //我发起的个人球卡
    var sql='select a.rest_card,a.title,a.logo,FROM_UNIXTIME(a.create_time,"%m月%d日%H:%i")as create_time,FROM_UNIXTIME(a.start_time,"%Y.%m.%d  %H:%i")as start_time,a.start_time as start_time1,a.address,FROM_UNIXTIME(a.start_time-7200,"%m.%d %H:%i")as end_time,(a.start_time-'+now_time+') as status,a.race_type,a.person_fee,a.team_fee,a.id,a.is_get,a.user_id from t_ticket_card as a where a.user_id='+uid+' and type=0 and a.status=0 and a.is_cancel=0';
    //我发起的球队球卡
    var sql2='select a.rest_card, a.title,a.logo,FROM_UNIXTIME(a.create_time,"%m月%d日%H:%i")as create_time,FROM_UNIXTIME(a.start_time,"%Y.%m.%d  %H:%i")as start_time,a.start_time as start_time1,a.address,FROM_UNIXTIME(a.start_time-7200,"%m.%d %H:%i")as end_time,(a.start_time-'+now_time+') as status,a.race_type,a.person_fee,a.team_fee,a.id,a.team_name as home_name,b.team_name as guest_name,a.is_get,a.user_id from t_ticket_card as a left join t_ticket_card_team as b on a.id=b.card_id where a.user_id='+uid+' and type=1 and a.status=0 and a.is_cancel=0';
    if(card_type==0){
        search(sql,function (err,result) {
            if(err){
                callback(null,{
                    code:'500',
                    msg:'获取我发起的球卡失败！'
                })
            }else{
                console.log(result);
                callback(null,{
                    code:'200',
                    msg:'获取数据成功！',
                    data:result
                })
            }
        })
    }else if(card_type==1){
        search(sql2,function (err,result) {
            if(err){
                callback(null,{
                    code:'500',
                    msg:'获取我发起的球队球卡失败！'
                })
            }else{
                callback(null,{
                    code:'200',
                    msg:'获取发起的球卡成功',
                    data:result
                })
            }
        })
    }else{
        callback(null,{
            code:'600',
            msg:'参数错误！'
        })
    }
};
/*我发起的球卡结束*/


/*退回我领取的卡片开始*/
ticketCard.prototype.returnBack= function (query,callback) {
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
 var id=query.id,
     user_id=query.user_id,
     card_id=query.card_id,
     card_type=query.card_type,
     team_id=query.team_id||'';
    //退回个人求卡
    // var sql='delete FROM t_ticket_card_person where id='+id+' and user_id='+user_id+' and card_id='+card_id+'';
    var sql=' update  t_ticket_card_person set `status`=1 where id='+id+' and user_id='+user_id+' and card_id='+card_id+'';
    //退回球队求卡
    // var sql2='delete FROM t_ticket_card_team where team_id='+team_id+' and user_id='+user_id+' and card_id='+card_id+'';
    var sql2=' update  t_ticket_card_team set `status`=1 where team_id='+team_id+' and user_id='+user_id+' and card_id='+card_id+'';
    if(card_type==0){
        console.log(sql);
        search(sql,function (err,result) {
            if(err){
                callback(null,{
                    code:'500',
                    msg:'删除出错'
                })
            }else{
                callback(null,{
                    code:'200',
                    msg:'退回个人球卡成功！'
                })
            }
        })
    }else if(card_type==1){
        search(sql2,function (err,result) {
            if(err){
                callback(null,{
                    code:'500',
                    msg:'删除出错'
                })
            }else{
                callback(null,{
                    code:'200',
                    msg:'退回球队球卡成功！'
                })
            }
        })
    }else{
        callback(null,{
            code:'500',
            msg:'参数错误！'
        })
    }
};
/*退回我领取的卡片结束*/


/*取消约球开始*/
ticketCard.prototype.cancelCard= function (query,callback) {
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

    var card_type=query.card_type;
    var id= query.id;
    var user_id=query.user_id;
    //取消个人球卡开始
    var sql =' update t_ticket_card  set is_cancel=1 where id='+id+' and user_id='+user_id+'';
    //取消球队卡片开始
    var sql2=' update t_ticket_card  set is_cancel=1 where id='+id+' and user_id='+user_id+' and type=1';
    if(card_type==0){
    search(sql,function (err,result) {
        if(err){
            callback(null,{
                code:'500',
                msg:'取消失败！'
            })
        }else{
            callback(null,{
                code:'200',
                msg:'取消成功！',
                data:result
            })
        }
    })
    }else if(card_type==1){
        search(sql2,function (err,result) {
            if(err){
                callback(null,{
                    code:'500',
                    msg:'取消失败！'
                })
            }else{
                callback(null,{
                    code:'200',
                    msg:'取消成功！',
                    data:result
                })
            }
        })
    }else{
        callback(null,{
            code:'600',
            msg:'参数错误'
        })
    }

};
/*取消约球结束*/


/*我的比赛开始*/
ticketCard.prototype.myRace= function (query,callback) {
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
  var now_time=parseInt( new Date(new Date())/1000);
  var uid=query.uid;
  var type=query.type;
  var page= query.page;
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
    //已进行的
    var sql='select FROM_UNIXTIME(race.start_time,"%m月%d号 %h:%m")as star_time, comp.title as comp_title,round.title as round_title,team1.logo as home_logo,team1.`name` as home_name,race.home_goal,team2.logo as guest_logo,team2.name as guest_name,race.guest_goal,team.status,court.name,comp.competition_id,race.race_id from t_competition_race as  race join t_competition_round as round on round.round_id= race.round_id join t_competition as comp on comp.competition_id=race.competition_id join t_competition_ballteam as team on team.competition_id=race.competition_id join t_ball_team as team1 on (team1.ball_team_id=race.home_team_id) join t_ball_team as team2 on (team2.ball_team_id=race.guest_team_id) join t_court as court on court.court_id=race.court_id where team.user_id='+uid+' and ('+now_time+'-race.start_time)>0 limit '+start+','+page+'';
    //未进行的
    var sql2='select FROM_UNIXTIME(race.start_time,"%m月%d号 %h:%m")as star_time, comp.title as comp_title,round.title as round_title,team1.logo as home_logo,team1.`name` as home_name,race.home_goal,team2.logo as guest_logo,team2.name as guest_name,team.status,court.name,comp.competition_id,race.race_id from t_competition_race as  race join t_competition_round as round on round.round_id= race.round_id join t_competition as comp on comp.competition_id=race.competition_id join t_competition_ballteam as team on team.competition_id=race.competition_id join t_ball_team as team1 on (team1.ball_team_id=race.home_team_id) join t_ball_team as team2 on (team2.ball_team_id=race.guest_team_id) join t_court as court on court.court_id=race.court_id where team.user_id='+uid+' and ('+now_time+'-race.start_time)<=0 limit '+start+','+page+'';

    //type为0 表示未进行， 为1表示已进行

    if(type==0){
        console.log('sql2 is :'+ sql)
    search(sql2,function (err,result) {
        if(err){
            callback(null,{
                code:'500',
                msg:'查询出错'
            })
        }else{
            callback(null,{
                code:'200',
                msg:'获取列表成功！',
                data:result
            })
        }
    })
  }else if(type==1){
        console.log('sql is :'+ sql2)
        search(sql,function (err,result) {
            if(err){
                callback(null,{
                    code:'500',
                    msg:'查询出错'
                })
            }else{
                callback(null,{
                    code:'200',
                    msg:'获取列表成功！',
                    data:result
                })
            }
        })
  }else{
     callback(null,{
         code:'500',
         msg:'参数错误，请传递比赛状态！'
     })
    }


};
/*我的比赛结束*/



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



