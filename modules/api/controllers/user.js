/**
 * Created by walter on 2016/6/15.
 */
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const validator = require('validator');
const Util = require('util');
var Config = require('../../../config');

var verifyTool = require('../../../util/verify');

var userModel = require('../../common/model').User;
var ballTeamMemberModel = require('../../common/model').BallTeamMember;
var ballTeamModel = require('../../common/model').BallTeam;
var userAttentionModel = require('../../common/model').UserAttention;
var VenueModel = require('../../common/model').Venue;
var CourtModel = require('../../common/model').Court;
var OnceModel = require('../../common/model').Once;
var VipModel = require('../../common/model').Vip;
var ConfigModel = require('../../common/model').Config;
var VipDescModel = require('../../common/model').VipDesc;
var RecordModel = require('../../common/model').Record;
var OrderModel = require('../../common/model').Order;
var FriendlyOrderModel = require('../../common/model').FriendlyOrder;
var QualifyingModel = require('../../common/model').Qualifying;
var RechargeOrderModel = require('../../common/model').RechargeOrder;
var ApplyRefundModel = require('../../common/model').ApplyRefund;
var MessageModel = require('../../common/model').Message;
var CompetitionRaceModel = require('../../common/model').CompetitionRace;
var CompetitionBallTeam = require('../../common/model').CompetitionBallteam;
var HotPointRecordModel = require('../../common/model').HotPointRecord;


/*获取我的详情*/
exports.getMyInfo = function (req, res, next) {
  var user = req.user;
  async.auto({
    "ballTeam":function (callback) {
      ballTeamModel.count({"uid":user.user_id},function (err, data) {
        if(err) return callback(err);
        user['has_team'] = data;
        callback();
      });
    },
    "other_info":function (callback) {
      ballTeamMemberModel.find({'uid':user.user_id},function (err, data) {
        if(err) return callback(err);
        user['clubnumber'] = '';
        user['clubposition'] = '';
        if(!_.isEmpty(data)){
          user['clubnumber'] = data['clubnumber'];
          user['clubposition'] = data['position'];
        }
        callback(null,data);
      })
    }
  },function (err, results) {
    if(err) return res.error(err);
    res.success(user);
  });
};

/*更新用户信息*/
exports.updateUser = function (req, res, next) {
  var user_id = req.user.user_id;
  var data = req.data;

  async.auto({
    "check_nickname":function (callback) {
      if(_.isNil(data['nickname'])){
        return callback();
      }
      var params = {
        "nickname":data['nickname']
      };
      params['user_id'] = ['!=',user_id];
      userModel.count(params,function (err, num) {
        if(err) return callback(err);

        if(num){
          var error = new Error("该昵称已存在");
          error.code = 427;
          return callback(error);
        }
        callback();
      });
    },
    "update_user":function (callback) {
      userModel.updateUser({"user_id":user_id},data,function (err, result) {
        if(err) return callback(err);

        if(result===false){
          var error = new Error("更新用户信息失败");
          error.code = 414;
          return callback(error);
        }
        var userInfo = _.merge(req.user,data);
        userInfo['age'] = userModel.getAge(userInfo['birthday']);
        callback(null,userInfo);
      });
    }
  },function (err,results) {
    if(err) return res.error(err);

    var result = results['update_user'];
    res.success(result);
  });
};

/*关注*/
exports.attention = function (req, res, next) {
  var data = req.data;
  data['user_id'] = req.user.user_id;
  userAttentionModel.addUserAttention(data,function (err,result) {
    if(err||!result){
      var error = new Error("关注失败");
      error.code = 422;
      return res.error(error);
    }
    
    res.success();
  });
};

/*取消关注*/
exports.cancelAttention = function (req, res, next) {
  var queryParams = req.data;
  queryParams['user_id'] = req.user.user_id;
  userAttentionModel.delete(queryParams,function (err, result) {
    if(err) return res.error(err);

    if(!result){
      var error = new Error("取消关注失败");
      error.code = 428;
      return res.error(error);
    }
    res.success();
  });
};

/*用户列表*/
exports.userList = function (req, res, next) {
  var queryParams = req.data;
  if(!_.isNil(queryParams['search'])){
    if(validator.isMobilePhone(queryParams['search'],'zh-CN')){
      queryParams['phone'] = _.toNumber(queryParams['search']);
    }else {
      queryParams['nickname'] = _.toString(queryParams['search']);
    }
    queryParams['search'] = undefined;
  }
  queryParams['field'] = "*,ageOfBirthday(birthday) AS age";
  userModel.search(queryParams,function (err, data) {
    if(err) return res.error(err);
    
    res.success(data);
  });
};

/*用户详情*/
exports.userInfo = function (req, res, next) {
  var user_id = req.data.user_id;
  var currentUser = req.user.user_id;
  async.auto({
    "user":function (callback) {
      userModel.getById(user_id,callback)
    },
    "isAttention":function (callback) {
      userAttentionModel.isAttention(currentUser,2,user_id,callback);
    },
    "joinedTeam":function (callback) {
      ballTeamMemberModel.select({uid:user_id},function (err, teams) {
        if(err) return callback(err);

        async.forEachOf(teams,function (team, index, callback) {
          ballTeamModel.getById(team['ball_team_id'],function (err, data) {
            if(err) return callback(err);

            teams[index]['team'] = data;
            callback();
          });
        },function (err) {
          if(err) return callback(err);

          callback(null,teams);
        });
      });
    },
    "qualifying":["joinedTeam",function (results, callback) {
      var joinedTeamIds = _.map(results['joinedTeam'],'ball_team_id');
      var queryParams = {
        limit:10
      };
      queryParams['status'] = ['!=',2];
      queryParams['pay_num'] = ['>',0];
      queryParams['__string'] = Util.format('(home_team_id in (%s) OR guest_team_id in (%s))',_.toString(joinedTeamIds),_.toString(joinedTeamIds));
      QualifyingModel.search(queryParams,callback);
    }]
  },function (err, results) {
    if(err) return res.error(err);

    res.success(results);
  })
};
/*用户排位赛*/
exports.userQualifying = function (req, res, next) {
  var queryParams = req.data;
  var joinedTeamIds = queryParams['joinedTeam'];

  queryParams['joinedTeam'] = undefined;
  queryParams['field'] = "t_qualifying.*,c.type AS court_type,CONCAT(v.name,'|',c.name) AS title,FROM_UNIXTIME(t_qualifying.start_time,'%Y年%c月%e日') AS date,FROM_UNIXTIME(t_qualifying.start_time,'%H:%i') AS start_hour,FROM_UNIXTIME(t_qualifying.end_time,'%H:%i') AS end_hour";

  queryParams['join'] = [
    'join t_court as c on c.court_id=t_qualifying.court_id',
    'join t_venue as v on v.venue_id=c.venue_id'
  ];
  queryParams['status'] = ['!=',2];
  queryParams['pay_num'] = ['>',0];
  queryParams['__string'] = Util.format('(home_team_id in (%s) OR guest_team_id in (%s))',_.toString(joinedTeamIds),_.toString(joinedTeamIds));
  QualifyingModel.search(queryParams,function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  });
};

/*用户球队参见的赛程*/
exports.userRaces = function (req, res, next) {
  var queryParam = req.data;
  var joinedTeamIds = queryParam['joinedTeam'];
  var ball_team_ids = _.toString(joinedTeamIds);
  delete queryParam['joinedTeam'];

  queryParam['field'] = [
    "t_competition_race.*,FROM_UNIXTIME(t_competition_race.start_time,'%m月%d日 %H:%i') AS race_start_time",
    'b1.name AS home_team_name,b1.logo AS home_team_logo,b2.name AS guest_team_name,b2.logo AS guest_team_logo,b1.san_score AS home_team_san_score,b2.san_score AS guest_team_san_score',
    "cr.title AS round_title,FROM_UNIXTIME(cr.date,'%Y年%m月%d日') AS round_date",
    'v.name AS venue_name',
    Util.format("CONCAT('%s/competition/raceDetail?competition_id=',t_competition_race.competition_id,'&race_id=',t_competition_race.race_id) AS url",Config.host)
  ];
  queryParam['join'] = [
    'join t_competition_round AS cr on t_competition_race.round_id=cr.round_id',
    'join t_ball_team AS b1 on b1.ball_team_id = t_competition_race.home_team_id',
    'join t_ball_team AS b2 on b2.ball_team_id = t_competition_race.guest_team_id',
    'join t_court AS c on t_competition_race.court_id=c.court_id',
    'join t_venue AS v on c.venue_id = v.venue_id'
  ];
  queryParam['__string'] = Util.format('(t_competition_race.home_team_id in(%s) OR t_competition_race.guest_team_id in(%s) )',ball_team_ids,ball_team_ids);
  CompetitionRaceModel.search(queryParam,function (err, result) {
    if(err) return res.error(err);

    var data = result['data'];
    res.success(data);
  });
};

/*用户加入的球队*/
exports.userJoinedTeam = function (req, res, next) {
  var user_id = req.data.user_id;

  ballTeamMemberModel.select({uid:user_id},function (err, teams) {
    if(err) return res.error(err);

    async.forEachOf(teams,function (team, index, callback) {
      ballTeamModel.getById(team['ball_team_id'],function (err, data) {
        if(err) return callback(err);

        teams[index]['team'] = data;
        callback();
      });
    },function (err) {
      if(err) return res.error(err);

      res.success(teams);
    });
  });
};

/*用户战绩*/
exports.userQualifyingExploits = function (req, res, next) {
  var queryParams = req.data;
  var user_id = req.data.user_id;
  var joinedTeamIds = queryParams['joinedTeam'];

  queryParams['joinedTeam'] = undefined;
  queryParams['user_id'] = undefined;
  if(!_.isNil(queryParams['isFinished'])){
    var isFinished=  queryParams['isFinished']|0;
    queryParams['isFinished'] = undefined;
    if(isFinished){
      queryParams['status'] = 1;
      queryParams['t_qualifying.end_time'] = ['<',moment().unix()]
    }else {
      queryParams['t_qualifying.end_time'] = ['>',moment().unix()]
    }
  }

  async.auto({
    "ball_team_ids":function (callback) {
      if(!_.isNil(joinedTeamIds)&&!_.isEmpty(joinedTeamIds)){
        return callback(joinedTeamIds);
      }
      var params = {
        uid:user_id
      };
      params['field'] = 'ball_team_id';
      ballTeamMemberModel.select({uid:user_id},function (err, teams) {
        if(err) return callback(err);
        joinedTeamIds = _.map(teams,'ball_team_id');
        callback(null,joinedTeamIds);
      });
    },
    "qualifying":["ball_team_ids",function (results, callback) {
      joinedTeamIds = results['ball_team_ids'];
      if(_.isEmpty(joinedTeamIds)){
        return callback(null,[]);
      }
      queryParams['field'] = "t_qualifying.*,c.type AS court_type,CONCAT(v.name,'|',c.name) AS title,FROM_UNIXTIME(t_qualifying.start_time,'%Y年%c月%e日') AS date,FROM_UNIXTIME(t_qualifying.start_time,'%H:%i') AS start_hour,FROM_UNIXTIME(t_qualifying.end_time,'%H:%i') AS end_hour";
      queryParams['join'] = [
        'join t_court AS c on t_qualifying.court_id = c.court_id',
        'join t_venue AS v on v.venue_id = c.venue_id'
      ];
      queryParams['__string'] = Util.format('(home_team_id in (%s) OR guest_team_id in (%s))',_.toString(joinedTeamIds),_.toString(joinedTeamIds));
      QualifyingModel.search(queryParams,callback);
    }]
  },function (err, results) {
    if(err) return res.error(err);

    res.success(results['qualifying']['data']);
  })
};

/*用户关注的场馆*/
exports.attentionVenue = function (req, res, next) {
  var queryParams = req.data;
  var user_id = req.data.user_id;
  var lng = req.data.lng;
  var lat = req.data.lat;
  var now = moment().unix();
  queryParams['lat'] = undefined;
  queryParams['lng'] = undefined;
  queryParams['type'] = 0;

  async.auto({
    "attention":function (callback) {
      userAttentionModel.search(queryParams,callback);
    },
    "venue_list":["attention",function (results, callback) {
      var attentions = results['attention']['data'];
      var venue_ids = _.map(attentions,'type_id');

      if(_.isEmpty(venue_ids)){
        return callback(null,[]);
      }
      var params = {};
      params['field'] = Util.format('t_venue.*,ROUND(appraise_grade/appraise_num,2) AS appraise,gps_distance(%d,%d,lng,lat) AS distance',lng,lat);
      params['__string'] = ['venue_id in ('+_.toString(venue_ids)+')'];
      VenueModel.select(params,function (err, data) {
        if(err) return res.error(err);

        if(!_.isEmpty(data)){
          async.forEachOf(data,function (value, index, callback) {
            var is_discount = 0;
            CourtModel.select({"venue_id":value.venue_id},function (err, courts) {
              if(err) return callback(err);

              async.forEachOf(courts,function (court, i,callback) {
                OnceModel.select({"court_id":court.court_id},function (err, onces) {
                  if(err) return callback(err);

                  _.forEach(onces,function (once) {
                    if(once['discount_start_time']&&once['discount_end_time']&&now>=once['discount_start_time']&&now<=once['discount_end_time']){
                      is_discount = 1;
                      return false;
                    }
                  });
                  callback();
                })
              },function (err) {
                if(err) return callback(err);

                data[index]['is_discount'] = is_discount;
                callback();
              });
            });
          },function (err) {
            if(err) return callback(err);
            _.forEach(attentions,function (attention, index) {

              _.forEach(data,function (venue) {
                if(attention['type_id']==venue['venue_id']){
                  attentions[index]['venue'] = venue;
                }
              })
            });

            callback(null,attentions);
          });
        }else {
          return callback(null,[]);
        }
      });
    }]
  },function (err, results) {
    if(err) return res.error(err);

    res.success(results['venue_list']);
  });
};

/*用户关注的球队*/
exports.attentionBallTeam = function (req, res, next) {
  var queryParams = req.data;
  var user_id = req.data.user_id;
  queryParams['type'] = 1;

  async.auto({
    "attention":function (callback) {
      userAttentionModel.search(queryParams,callback);
    },
    "ballTeam_list":["attention",function (results, callback) {
      var attentions = results['attention']['data'];
      var data = [];
      async.forEachOf(attentions,function (attention, index, callback) {
        ballTeamModel.getById(attention['type_id'],function (err, ball_team) {
          data[index] = ball_team;
          callback();
        });
      },function (err) {
        callback(err,data);
      });
    }]
  },function (err, results) {
    if(err) return res.error(err);

    res.success(results['ballTeam_list']);
  });
};


/*用户关注的球友*/
exports.attentionUser = function (req, res, next) {
  var queryParams = req.data;
  var user_id = req.data.user_id;
  queryParams['type'] = 2;

  async.auto({
    "attention":function (callback) {
      userAttentionModel.search(queryParams,callback);
    },
    "team_user_info":["attention",function (results, callback) {
      var attentions = results['attention']['data'];
      var data = [];

      async.forEachOf(attentions,function (attention, index, callback) {
        ballTeamMemberModel.find({"uid":attention['type_id']},function (err, memeber) {
          if(err) return callback(err);
          data.push(memeber);
          callback();
        });
      },function (err) {
        if(err) return callback(err);
        callback(null,data);
      });

    }],
    "userList":["attention",function (results, callback) {
      var attentions = results['attention']['data'];
      var userIds = _.map(attentions,'type_id');
      var params = {};
      if(_.isEmpty(userIds)){
        return callback(null,[]);
      }
      params['__string'] = ['user_id in ('+_.toString(userIds)+')'];
      params['field'] = 't_user.user_id,t_user.phone,t_user.nickname,t_user.sex,t_user.avatar,t_user.height,t_user.weight,ageOfBirthday(birthday) AS age,(SELECT count(*) FROM `t_ball_team` where `uid`=t_user.user_id) AS isCaptain';
      userModel.select(params,callback);
    }]
  },function (err, results) {
    if(err) return res.error(err);

    var userList = results['userList'];
    var team_user_info = results['team_user_info'];
    _.forEach(userList,function (user, index) {
      _.forEach(team_user_info,function (info) {
        if(user.user_id==info.uid){
          userList[index]['teamInfo'] = info;
          return false;
        }
      });
    });
    res.success(userList);
  });
};

/*用户关注排位赛*/
exports.attentionQualifying = function (req, res, next) {
  var queryParams = req.data;
  var user_id = req.data.user_id;
  queryParams['type'] = 3;

  async.auto({
    "attention":function (callback) {
      userAttentionModel.search(queryParams,callback);
    },
    "qualifyingList":["attention",function (results, callback) {
      var attentions = results['attention']['data'];
      async.forEachOf(attentions,function (attention, index, callback) {
        async.auto({
          "qualifying_info":function (callback) {
            var params = {};
            params['field'] = "t_qualifying.*,c.type AS court_type,CONCAT(v.name,'|',c.name) AS title,FROM_UNIXTIME(t_qualifying.start_time,'%Y年%c月%e日') AS date,FROM_UNIXTIME(t_qualifying.start_time,'%H:%i') AS start_hour,FROM_UNIXTIME(t_qualifying.end_time,'%H:%i') AS end_hour";

            params['join'] = [
              'join t_court as c on c.court_id=t_qualifying.court_id',
              'join t_venue as v on v.venue_id=c.venue_id'
            ];
            params['qualifying_id'] = attention['type_id'];
            QualifyingModel.find(params,callback);
          },
          "home_team":["qualifying_info",function (results, callback) {
            var home_team_id = results['qualifying_info']['home_team_id'];
            if(home_team_id){
              ballTeamModel.find({"ball_team_id":home_team_id},callback);
            }else {
              callback(null,{});
            }
          }],
          "guest_team":["qualifying_info",function (results, callback) {
            var guest_team_id = results['qualifying_info']['guest_team_id'];
            if(guest_team_id){
              ballTeamModel.find({"ball_team_id":guest_team_id},callback);
            }else {
              callback(null,{});
            }
          }]
        },function (err, results) {
          if(err) return callback(err);
          attentions[index]['qualifying'] = results;
          callback()
        });
      },function (err) {
        callback(err,attentions);
      })
    }]
  },function (err, results) {
    if(err) return res.error(err);

    res.success(results['qualifyingList']);
  })
};

/*关注的赛程*/
exports.attentionRaces = function (req, res, next) {
  var queryParams = req.data;
  var user_id = req.data.user_id;
  queryParams['t_user_attention.type'] = 4;
  queryParams['t_user_attention.user_id'] = user_id;

  queryParams['field'] = [
    "t_competition_race.*,FROM_UNIXTIME(t_competition_race.start_time,'%m月%d日 %H:%i') AS race_start_time",
    'b1.name AS home_team_name,b1.logo AS home_team_logo,b1.san_score AS home_team_san_score,b2.name AS guest_team_name,b2.logo AS guest_team_logo,b2.san_score AS guest_team_san_score',
    "cr.title AS round_title,FROM_UNIXTIME(cr.date,'%Y年%m月%d日') AS round_date",
    'v.name AS venue_name',
    Util.format("CONCAT('%s/competition/raceDetail?competition_id=',t_competition_race.competition_id,'&race_id=',t_competition_race.race_id) AS url",Config.host)
  ];
  queryParams['join'] = [
    'join t_competition_race on t_competition_race.race_id = t_user_attention.type_id',
    'join t_competition_round AS cr on t_competition_race.round_id=cr.round_id',
    'join t_ball_team AS b1 on b1.ball_team_id = t_competition_race.home_team_id',
    'join t_ball_team AS b2 on b2.ball_team_id = t_competition_race.guest_team_id',
    'join t_court AS c on t_competition_race.court_id=c.court_id',
    'join t_venue AS v on c.venue_id = v.venue_id'
  ];

  userAttentionModel.search(queryParams,function (err, data) {
    if(err) res.error(err);

    res.success(data['data']);
  })

};

/*用户的钱包*/
exports.wallet = function (req, res, next) {
  var user = req.user;
  var user_id = req.user.user_id;
  var vip_id = req.user.vip_id;

  async.auto({
    "vip":function (callback) {
      VipModel.getById(vip_id,callback)
    },
    "vip_desc":function (callback) {
      VipDescModel.select({},function (err, data) {
        if(err) return callback(err);

        _.forEach(data,function (info, index) {
          var desc = JSON.parse(info['data']);
          data[index]['data'] = _.find(desc,{'vip_id':_.toString(vip_id)});
        });
        callback(null,data);
      });
    }
  },function (err, results) {
    if(err) return res.error(err);

    var vip = results['vip'];
    var vip_desc = results['vip_desc'];
    var data = {};

    data.san_money = user.san_money;
    data.vip_id = vip_id;
    data.vip = vip;
    data.vip_desc = vip_desc;
    res.success(data);
  })
};

/*钱包记录*/
exports.walletRecord = function (req, res, next) {
  var user_id = req.user.user_id;
  var queryParams = req.data;
  queryParams['uid'] = user_id;

  RecordModel.search(queryParams,function (err, data) {
    if(err) return res.error(err);

    res.success(data['data']);
  });
};

/*修改密码*/
exports.changePWD = function (req, res, next) {
  var user_id = req.user.user_id;
  var phone = req.user.phone;
  var password = req.data.password;
  var sms_id = req.data.sms_id;
  var code = req.data.code;

  async.auto({
    "check_code":function (callback) {
      verifyTool.verifySms(sms_id,code,function (err) {
        if(err) return callback(err);

        callback(null);
      })
    },
    "changePWD":["check_code",function (results, callback) {
      userModel.updateUser({user_id:user_id,phone:phone},{password:_.trim(password)},callback)
    }]
  },function (err, results) {
    if(err) return res.error(err);

    res.success();
  });
};

/*我的订单*/
exports.userOrder = function (req, res, next) {
  var user_id = req.user.user_id;
  var queryParams = req.data;
  queryParams['user_id'] = user_id|0;

  var orderList = [];
  async.auto({
    "orderList":function (callback) {
      OrderModel.search(queryParams,function (err, data) {
        if(err) return callback(err);
        orderList = data['data'];
        callback(null,data['data']);
      });
    },
    "friendly":["orderList",function (results, callback) {
      async.forEachOf(orderList,function (order, index, callback) {
        if(order['type']==1){
          var params = {
            "order_id":order['order_id']
          };
          params['field'] = 't_friendly_order.*,v.name as venue_name,v.address as venue_address,v.image_thumb as venue_img,c.name as court_name';
          params['join'] = [
            'join t_court as c on c.court_id=t_friendly_order.court_id',
            'join t_venue as v on v.venue_id=c.venue_id'
          ];
          FriendlyOrderModel.select(params,function (err, data) {
            if(err) return callback(err);

            orderList[index]['node_data'] = data;
            callback();
          });
        }else {
          callback();
        }
      },callback);
    }],
    "qualifying":["orderList",function (results, callback) {
      async.forEachOf(orderList,function (order, index, callback) {
        if(order['type']==0||order['type']==3){
          var params = {};
          params['field'] = 't_qualifying.*,v.name as venue_name,v.address as venue_address,v.image_thumb as venue_img,c.name as court_name';
          params['__string'] = Util.format('(home_order_id=%d OR guest_order_id=%d)',order['order_id'],order['order_id']);
          params['join'] = [
            'join t_court as c on c.court_id=t_qualifying.court_id',
            'join t_venue as v on v.venue_id=c.venue_id'
          ];
          QualifyingModel.select(params,function (err, data) {
            if(err) return callback(err);

            orderList[index]['node_data'] = data;
            callback();
          })
        }else {
          callback();
        }
      },callback)
    }],
    "recharge":["orderList",function (results, callback) {
      async.forEachOf(orderList,function (order, index, callback) {
        if(order['type']==2){
          var params = {
            "order_id":order['order_id']
          };
          RechargeOrderModel.select(params,function (err, data) {
            if(err) return callback(err);

            orderList[index]['node_data'] = data;
            callback();
          })
        }else {
          callback();
        }
      },callback);
    }],
    "enterCompetition":["orderList",function (results, callback) {
      async.forEachOf(orderList,function (order, index, callback) {
        if(order['type']==4){
          var params = {};
          params['field'] = 't_competition_ballteam.*,c.title AS competition_title,c.img AS competition_img';
          params['order_id'] = order['order_id'];
          params['join'] = [
            'join t_competition AS c on t_competition_ballteam.competition_id = c.competition_id'
          ];
          CompetitionBallTeam.select(params,function (err, data) {
            if(err) return callback(err);

            orderList[index]['node_data'] = data;
            callback();
          })
        }else {
          callback();
        }
      },callback)
    }]
  },function (err, results) {
    if(err) return res.error(err);

    res.success(orderList);
  });
};

/*消息*/
exports.messageList = function (req, res, next) {
  var user_id = req.user.user_id;
  var msg_type = req.data.msg_type;
  var queryParams = req.data;
  delete queryParams['msg_type'];
  queryParams['ext.msg_type'] = msg_type|0;
  queryParams['$or'] = [
    {
      "target_user":user_id|0
    },
    {
      "target_user":"all"
    }
  ];
  MessageModel.search(queryParams,function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  });
};

/*删除消息*/
exports.delMessage = function (req, res, next) {
  var _id = req.data._id;
  MessageModel.remove({_id:_id},function (err) {
    if(err) return res.error(err);

    res.success();
  })
};

/*获取消息详情*/
exports.getMessage = function (req, res, next) {
  var _id = req.data._id;
  MessageModel.findOne({_id:_id},function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  })
};

/*用户退出登录*/
exports.logout = function (req, res, next) {
  var user_id = req.user.user_id;
  var data = {"deviceuuid":""};
  userModel.updateUser({user_id:user_id},data,function (err, data) {
    if(err) return res.error(err);

    res.success();
  })
};

/*清除通知数*/
exports.clearPoint = function (req, res, next) {
  var user_id = req.user.user_id;
  var msg_type = req.data.msg_type|0;
  var param = {
    user_id:user_id
  };
  var data = {};
  var key = "";
  switch (msg_type){
    case 0:
      key = "book_point";
      break;
    case 1:
      key = "qualifying_point";
      break;
    case 2:
      key = "activity_point";
      break;
    case 3:
      key = "ball_team_point";
      break;
    case 4:
      key = "system_point";
      break;
  }
  data[key] = 0;
  userModel.update(param,data,function (err, data) {
    if(err) return res.error(err);

    res.success();
  })
};

/*获取消息通知点数*/
exports.getPoint = function (req, res, next) {
  var user_id = req.user.user_id;
  var param = {};
  param['field'] = 'user_id,book_point,qualifying_point,activity_point,ball_team_point,system_point';
  param['user_id'] = user_id;

  userModel.find(param,function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  })

};

/*热点记录*/
exports.hotPointRecord = function (req, res, next) {
  var user_id = req.user.user_id;
  var queryParams = req.data;
  queryParams['user_id'] = user_id;

  HotPointRecordModel.search(queryParams,function (err, data) {
    if(err) return res.error(err);

    res.success(data['data']);
  });
};

/*加点球队*/
exports.hotBallTeam = function (req, res, next) {
  var ball_team_id = req.data.ball_team_id|0;
  var ball_team_name = req.data.ball_team_name;
  var connection = null;
  var user = req.user;
  
  async.auto({
    "check_user_hot":function (callback) {
      if(user.hot_point<1){
        var error = new Error("您的热点不足");
        error.code = 459;
        return callback(error);
      }
      callback();
    },
    "get_connection":["check_user_hot",function (results,callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    }],
    "begin_trans":["get_connection",function (results, callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          connection = null;
          return callback(err);
        }
        callback();
      });
    }],
    "check_team_hot_point":["begin_trans",function (results, callback) {
      var query = {};
      var today_str = moment().format("YYYY-MM-DD");
      var today_start = moment(today_str).unix();
      var today_end = today_start+2600*24;
      query['user_id'] = user.user_id;
      query['type'] = 1;
      query['data'] = ball_team_id;
      query['create_time'] = ['between',today_start+" AND "+today_end];
      HotPointRecordModel.count(query,function (err, data) {
        if(err) return callback(err);

        if(data>=3){
          var error = new Error("一天最多只能给同一个球队加热3次");
          error.code = 465;
          return callback(error);
        }
        callback();
      })
    }],
    "add_team_hot_point":["check_team_hot_point",function (results, callback) {
      var data = {};
      data['hot_point'] = ["hot_point+",1];
      data['total_hot_point'] = ["total_hot_point+",1];
      ballTeamModel.update2(connection,{"ball_team_id":ball_team_id},data,callback);
    }],
    "dec_user_hot_point":["check_team_hot_point",function (results, callback) {
      var data = {};
      data['hot_point'] = ["hot_point-",1];
      userModel.update2(connection,{"user_id":user.user_id},data,callback);
    }],
    "add_hot_point_record":["check_team_hot_point",function (results, callback) {
      var data ={
        "user_id":user.user_id,
        "hot_point":-1,
        "type":1,
        "data":ball_team_id,
        "remark":Util.format("加热[%s]",ball_team_name),
        "last_hot_point":user.hot_point
      };
      HotPointRecordModel.addRecord2(connection,data,callback);
    }],
    "commit_trans":["add_team_hot_point","dec_user_hot_point","add_hot_point_record",function (results, callback) {
      connection.commit(function (err) {
        connection.release();
        if(err){
          return callback(err);
        }
        callback();
      });
    }]
  },function (err, results) {
    if(err){
      if(connection!==null){
        return connection.rollback(function () {
          connection.release();
          res.error(err);
        });
      }
      return res.error(err);
    }
    res.success();
  });
  
};
