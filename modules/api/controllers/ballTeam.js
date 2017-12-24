/**
 * Created by walter on 2016/6/16.
 */
const _ = require('lodash');
const async = require('async');
const Util = require('util');
const moment = require('moment');
var Config = require('../../../config');

var JPush = require('../../../util/jPush');
var ballTeamModel = require('../../common/model').BallTeam;
var ballTeamMember = require('../../common/model').BallTeamMember;
var ballTeamImg = require('../../common/model').BallTeamImg;
var ballTeamActivity = require('../../common/model').BallTeamActivity;
var ballTeamNotice = require('../../common/model').BallTeamNotice;
var ballTeamNoticeComment = require('../../common/model').BallTeamNoticeComment;
var buildTeamApply = require('../../common/model').BuildTeamApply;
var BallTeamActivityUserModel = require('../../common/model').BallTeamActivityUser;
var MessageModel = require('../../common/model').Message;
var UserModel = require('../../common/model').User;
var UserAttentionModel = require('../../common/model').UserAttention;
var CompetitionRaceModel = require('../../common/model').CompetitionRace;

var uploader = require('../../../util/uploader').upload;

/**
 * 进入球队页面——获取我创建的球队和我加入的球队
 * @param req
 * @param res
 * @param next
 */
exports.index = function (req, res, next) {
  var user_id = req.data.user_id;
  async.auto({
    "my_team":function (callback) {
      ballTeamModel.getDetail({uid:user_id},callback);
    },
    "joined_team":function (callback) {
      ballTeamMember.select({uid:user_id},function (err, results) {
        if(err) return callback(err);
        var ball_team_ids = _.map(results,'ball_team_id');
        async.map(ball_team_ids,function (id, callback) {
          ballTeamModel.getById(id,callback);
        },function (err, result) {
          if(err) return callback(err);

          callback(null,result);
        })
      })
    }
  },function (err, results) {
    if(err) return res.error(err);

    if(!_.isEmpty(results['my_team'])){
      results['joined_team'] = _.filter(results['joined_team'],function (v) {
        return (v.ball_team_id!=results['my_team']['ball_team_id'])
      });
    }

    res.success(results);
  })
};

exports.search = function (req, res, next) {
  var queryParams = req.data;

  ballTeamModel.search2(queryParams,function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  })

};

/*球队列表*/
exports.ballTeamList = function (req, res, next) {
  var queryParams = req.data;
  var exists_team = req.data.exists_team;
  var exists_county = req.data.exists_county;
  if(!_.isEmpty(exists_team)){
    var exists_team_str = '('+exists_team.join(',')+') ';
    queryParams['ball_team_id'] = ['NOT IN',exists_team_str];
    queryParams['exists_team'] = undefined;
  }
  if(!_.isEmpty(exists_county)){
    var exists_county_str = '('+exists_county.join(',')+') ';
    queryParams['county_id'] = ['NOT IN',exists_county_str];
    queryParams['exists_county'] = undefined;
  }

  queryParams['field'] = 'ball_team_id';
  ballTeamModel.search(queryParams,function (err, results) {
    if(err) return res.error(err);
    var total = results['total'];
    var ids = _.map(results['data'],'ball_team_id');
    async.map(ids,function (id,callback) {
      ballTeamModel.getById(id,callback);
    },function (err, result) {
      if(err) res.error(err);
      var data = {
        "total":total,
        "data":result
      };
      res.success(data);
    });
  })
};


/*用户加入的球队列表*/
exports.myJoinedTeam = function (req, res, next) {
  var queryParams = {
    uid:req.data.uid
  };
  ballTeamMember.select(queryParams,function (err, results) {
    if(err) return callback(err);
    var ball_team_ids = _.map(results,'ball_team_id');
    async.map(ball_team_ids,function (id, callback) {
      ballTeamModel.getById(id,callback);
    },function (err, result) {
      if(err) return res.error(err);

      res.success(result);
    })
  })
};

/*球队详情*/
exports.ballTeamInfo = function (req, res, next) {
  var ball_team_id = req.data.ball_team_id;
  var user_id = req.user.user_id;
  if(_.isNil(ball_team_id)){
    return res.error(400,'球队ID必须');
  }
  async.auto({
    "ball_team":function (callback) {
      ballTeamModel.getById(ball_team_id,callback);
    },
    "is_attention":function (callback) {
      UserAttentionModel.isAttention(user_id,1,ball_team_id,callback);
    },
    "ball_team_img":function (callback) {
      var queryParams = {
        // "limit":4,
        "ball_team_id":ball_team_id
      };
      ballTeamImg.search(queryParams,function (err, data) {
        if(err) return callback(err);

        callback(null,data['data']);
      });
    },
    "ball_team_activity":function (callback) {
      var queryParams = {
        "ball_team_id":ball_team_id,
      };
      var condition = {
        "order":"create_time desc"
      };
      ballTeamActivity.find(queryParams,condition,callback);
    },
    "ball_team_notice":function (callback) {
      var queryParams = {
        "t_ball_team_notice.ball_team_id":ball_team_id
      };
      var condition = {
        "order":"create_time desc"
      };
      queryParams['field'] = 't_ball_team_notice.*,u.nickname,u.avatar,u.sex,bm.type as user_type';
      queryParams['join'] = [
          'join t_user as u on u.user_id = t_ball_team_notice.user_id',
          'join t_ball_team_member as bm on t_ball_team_notice.user_id=bm.uid AND bm.ball_team_id=t_ball_team_notice.ball_team_id'
      ];
      ballTeamNotice.find(queryParams,condition,callback);
    }
  },function (err, results) {
    if(err) return res.error(err);
    res.success(results);
  })
};

/*队长踢人*/
exports.kickTeamMember = function (req, res, next) {
  var user_id = req.data.user_id;
  var ball_team_id = req.data.ball_team_id;
  var ball_team_name = req.data.ball_team_name;

  var connection = null;
  async.waterfall([
    function (callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    },
    function (callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          return callback(err);
        }
        callback();
      });
    },
    function (callback) {
      async.auto({
        "userInfo":function (callback) {
          UserModel.getById(user_id,callback);
        },
        "ball_team_info":function (callback) {
          var params = {};
          params['ball_team_id'] = ball_team_id;
          ballTeamModel.find(params,callback);
        },
        "kick_out":function (callback) {
          var params = {
            "uid":user_id,
            "ball_team_id":ball_team_id
          };
          ballTeamMember.delete2(connection,params,callback);
        },
        // "update_avg":["ball_team_info","userInfo",function (results,callback) {
        //   var user = results['userInfo'];
        //   var ball_team_info = results['ball_team_info'];
        //   var ball_team_id = ball_team_info['ball_team_id'];
        //   var member_num = ball_team_info['member_num'];
        //   var avg_age = ball_team_info['avg_age'];
        //   var avg_weight = ball_team_info['avg_weight'];
        //   var avg_height = ball_team_info['avg_height'];
        //   avg_age = (avg_age*member_num - user.age)/(member_num-1);
        //   avg_height = (avg_height*member_num - user.height)/(member_num-1);
        //   avg_weight = (avg_weight*member_num - user.weight)/(member_num-1);
        //   var update_data = {
        //     "avg_age":avg_age,
        //     "avg_height":avg_height,
        //     "avg_weight":avg_weight,
        //     "member_num":member_num-1
        //   };
        //   ballTeamModel.update2(connection,{ball_team_id:ball_team_id},update_data,callback);
        // }],
        "add_point":["userInfo",function (results, callback) {
          var user_info = results['userInfo'];
          var user_id = user_info['user_id'];
          var param = {user_id:user_id};
          var data = {};
          data['ball_team_point'] = ['ball_team_point+',1];
          UserModel.update2(connection,param,data,callback);
        }],
        "add_message":["kick_out","userInfo","add_point",function (results, callback) {
          var user_info = results['userInfo'];
          var members_uuid = user_info['deviceuuid'];
          var data = {
            "content":Util.format('【%s】把你踢出了【%s】',req.user.nickname,ball_team_name),
            "target":[members_uuid],
            "target_user":[user_id],
            "type":3,
            "ext":{
              "msg_type":3,
              "ball_team_id":ball_team_id,
              "ball_team_user_id":req.user.user_id,
              "type":3
            }
          };
          MessageModel.create(data,callback);
        }],
        "send_message":["add_message",function (results, callback) {
          var message = results['add_message'];
          JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
            callback();
          });
        }]
      },function (err,results) {
        if(err){
          return connection.rollback(function () {
            connection.release();
            callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          callback(err);
        })
      })
    }
    ],function (err) {
    if(err) return res.error(err);
    res.success();
  })
};

/*用户加入球队*/
exports.joinTeam = function (req, res, next) {
  var user = req.user;
  var data = {
    "ball_team_id":req.data.ball_team_id,
    "uid":req.user.user_id,
    "clubnumber":req.data.clubnumber,
    "position":req.data.position,
    "type":req.data.type
  };
  var connection = null;
  async.waterfall([
    function (callback) {
      ballTeamMember.count({"ball_team_id":data.ball_team_id,"uid":data.uid},function (err,result) {
        if(err) return callback(err);
        if(result){
          var error = new Error("您已加入过该球队");
          error.code = 413;
          return callback(error);
        }
        callback(null);
      })
    },
    function (callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    },
    function (callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          return callback(err);
        }
        callback();
      });
    },
    function (callback) {
      async.auto({
        "join_team":function (callback) {
          ballTeamMember.addBallTeamMember2(connection,data,function (err, result) {
            if(err) return callback(err);

            if(!result){
              var error = new Error("加入球队失败");
              error.code = 412;
              return callback(error);
            }
            callback(null,result);
          });
        },
        "ball_team_info":function (callback) {
          var params = {};
          params['field'] = 't_ball_team.*,u.deviceuuid as user_uuid';
          params['ball_team_id'] = req.data.ball_team_id;
          params['join'] = ['join t_user as u on u.user_id = t_ball_team.uid'];
          ballTeamModel.find(params,callback);
        },
        // "update_avg":["ball_team_info",function (results,callback) {
        //   var ball_team_info = results['ball_team_info'];
        //   var ball_team_id = ball_team_info['ball_team_id'];
        //   var member_num = ball_team_info['member_num'];
        //   var avg_age = ball_team_info['avg_age'];
        //   var avg_weight = ball_team_info['avg_weight'];
        //   var avg_height = ball_team_info['avg_height'];
        //   avg_age = (avg_age*member_num + user.age)/(member_num+1);
        //   avg_height = (avg_height*member_num + user.height)/(member_num+1);
        //   avg_weight = (avg_weight*member_num + user.weight)/(member_num+1);
        //   var update_data = {
        //     "avg_age":avg_age,
        //     "avg_height":avg_height,
        //     "avg_weight":avg_weight,
        //     "member_num":member_num+1
        //   };
        //   ballTeamModel.update2(connection,{ball_team_id:ball_team_id},update_data,callback);
        // }],
        "add_point":["ball_team_info",function (results, callback) {
          var ball_team_info = results['ball_team_info'];
          var members_user_id = ball_team_info['uid'];
          var param = {user_id:members_user_id};
          var data = {};
          data['ball_team_point'] = ['ball_team_point+',1];
          UserModel.update2(connection,param,data,callback);
        }],
        "add_message":["join_team","ball_team_info","add_point",function (results, callback) {
          var ball_team_info = results['ball_team_info'];
          var members_uuid = ball_team_info['user_uuid'];
          var members_user_id = ball_team_info['uid'];
          var data = {
            "content":Util.format('【%s】申请加入【%s】',req.user.nickname,ball_team_info['name']),
            "target":[members_uuid],
            "target_user":[members_user_id],
            "type":3,
            "ext":{
              "msg_type":3,
              "ball_team_id":ball_team_info['ball_team_id'],
              "ball_team_user_id":ball_team_info['uid'],
              "type":2,
              "user_id":user['user_id']
            }
          };
          MessageModel.create(data,callback);
        }],
        "send_message":["add_message",function (results, callback) {
          var message = results['add_message'];
          JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
            callback();
          });
        }]
      },function (err, results) {
        if(err){
          return connection.rollback(function () {
            connection.release();
            callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          callback(err);
        })
      });
    }
  ],function (err, result) {
    if(err) return res.error(err);

    res.success();
  });
};

/*获取我的球队详情*/
exports.getMyTeamInfo = function (req, res, next) {
  var user_id = req.user.user_id;
  ballTeamModel.getDetail({uid:user_id},function (err, data) {
    if(err) return res.error(err);
    res.success(data);
  });
};

/*创建球队*/
exports.buildTeam = function (req, res, next) {
  var data = req.data;
  var user = req.user;
  data.user_id = user.user_id;
  data.uid = user.user_id;
  data.avg_age = user.age;
  data.avg_height = user.height;
  data.avg_weight = user.weight;
  data.member_num = 1;
  data.is_verify = 1;
  // console.log(data);
  var connection = null;
  async.waterfall([
    function (callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    },
    function (callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          return callback(err);
        }
        callback();
      });
    },
    function (callback) {
      async.auto({
        "check_same_team":function (callback) {
          var ball_team_name = _.trim(data['name']);
          var query = {
            "name":ball_team_name
          };
          ballTeamModel.count(query,function (err, data) {
            if(err) return callback(err);
            
            if(data){
              var error = new Error("该球队已存在");
              error.code = 458;
              return callback(error);
            }
            callback();
          })
        },
        "add_apply":["check_same_team",function (results,callback) {
          buildTeamApply.addBuildTeamApply2(connection,data,callback);
        }],
        "add_team":["check_same_team",function (results,callback) {
          ballTeamModel.addBallTeam2(connection,data,callback);
        }],
        "update_user":["add_team",function (results,callback) {
          var cur_ballteam_id = results['add_team'];
          UserModel.update2(connection,{user_id:user.user_id},{cur_ballteam_id:cur_ballteam_id},callback);
        }],
        "add_team_member":["add_team","update_user",function (results,callback) {
          var ball_team_id = results['add_team'];
          var member_info = {
            "ball_team_id":ball_team_id,
            "uid":data.user_id,
            "type":"队长",
            "position":""
          };
          ballTeamMember.addBallTeamMember2(connection,member_info,callback);
        }]
      },function (err, results) {
        var insertIds = _.values(results);
        if(err||!_.min(insertIds)){
          var error = new Error("申请建队失败");
          error.code = 415;
          if(err.code==458){
            error = err;
          }
          
          return connection.rollback(function () {
            connection.release();
            return callback(error);
          })
        }
        connection.commit(function (err) {
          connection.release();
          callback(err);
        });
      });
    }
  ],function (err) {
    if(err) return res.error(err);
    res.success();
  });
};

/*队长解散球队*/
exports.dissolveBallTeam = function (req, res, next) {
  var ball_team_id = req.data.ball_team_id;
  var ball_team_name = req.data.ball_team_name;

  var connection = null;
  async.waterfall([
    function (callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    },
    function (callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          return callback(err);
        }
        callback();
      });
    },function (callback) {
      async.auto({
        "check_captain":function (callback) {
          ballTeamModel.find({"ball_team_id":ball_team_id},function (err, data) {
            if(err) return callback(err);

            if(data['uid']!=req.user.user_id){
              var error = new Error("只有队长才能解散球队");
              error.code = 442;
              return callback(error);
            }
            callback();
          });
        },
        "ball_team_members":function (callback) {
          var params = {};
          params['field'] = 'u.user_id,u.deviceuuid';
          params['ball_team_id'] = ball_team_id;
          params['join'] = ['join t_user as u on u.user_id = t_ball_team_member.uid'];
          ballTeamMember.select(params,callback);
        },
        "dissolve_ballTeam":["check_captain",function (results,callback) {
          ballTeamModel.delete2(connection,{"ball_team_id":ball_team_id},callback);
        }],
        "del_attention":function (callback) {
          var params = {};
          params['type'] = 1;
          params['type_id'] = ball_team_id;
          UserAttentionModel.delete2(connection,params,callback);
        },
        "add_point":["ball_team_members",function (results, callback) {
          var param = {};
          var data = {};
          var ball_team_members = results['ball_team_members'];
          if(_.isEmpty(ball_team_members)){
            return callback();
          }
          var members_user_id = _.map(ball_team_members,'user_id');
          param['__string'] = Util.format('user_id in (%s)',_.toString(members_user_id));
          data['ball_team_point'] = ['ball_team_point+',1];
          UserModel.update2(connection,param,data,callback);
        }],
        "add_message":["dissolve_ballTeam","ball_team_members","add_point",function (results, callback) {
          var ball_team_members = results['ball_team_members'];
          if(_.isEmpty(ball_team_members)){
            return callback();
          }
          var members_uuid = _.map(ball_team_members,'deviceuuid');
          var members_user_id = _.map(ball_team_members,'user_id');
          var data = {
            "content":Util.format('【%s】已被解散',ball_team_name),
            "target":members_uuid,
            "target_user":members_user_id,
            "type":3,
            "ext":{
              "msg_type":3,
              "ball_team_id":ball_team_id,
              "ball_team_user_id":req.user.user_id,
              "type":4
            }
          };
          MessageModel.create(data,callback);
        }],
        "send_message":["add_message",function (results, callback) {
          var message = results['add_message'];
          if(!_.isEmpty(message)){
            JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
              callback();
            });
          }else {
            callback();
          }
        }]
      },function (err, results) {
        if(err){
          return connection.rollback(function () {
            connection.release();
            callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          callback(err);
        });
      });
    }
  ],function (err) {
    if(err) return res.error(err);

    res.success();
  })
};

/*用户退出球队*/
exports.quitBallTeam = function (req, res, next) {
  var user = req.user;
  var user_id = user.user_id;
  var ball_team_id = req.data.ball_team_id;
  var connection = null;

  async.waterfall([
    function (callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    },
    function (callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          return callback(err);
        }
        callback();
      });
    },
    function (callback) {
      async.auto({
        "ball_team":function (callback) {
          var params = {};
          params['field'] = 't_ball_team.*,u.deviceuuid,u.nickname,u.phone';
          params['join'] = ['join t_user AS u on u.user_id = t_ball_team.uid'];
          params['ball_team_id'] = ball_team_id;
          ballTeamModel.find(params,callback);
        },
        "quit":function (callback) {
          var params = {};
          params['uid'] = user_id;
          params['ball_team_id'] = ball_team_id;
          ballTeamMember.delete(params,callback);
        },
        // "update_avg":["ball_team",function (results,callback) {
        //   var ball_team_info = results['ball_team'];
        //   var ball_team_id = ball_team_info['ball_team_id'];
        //   var member_num = ball_team_info['member_num'];
        //   var avg_age = ball_team_info['avg_age'];
        //   var avg_weight = ball_team_info['avg_weight'];
        //   var avg_height = ball_team_info['avg_height'];
        //   avg_age = (avg_age*member_num - user.age)/(member_num-1);
        //   avg_height = (avg_height*member_num - user.height)/(member_num-1);
        //   avg_weight = (avg_weight*member_num - user.weight)/(member_num-1);
        //   var update_data = {
        //     "avg_age":avg_age,
        //     "avg_height":avg_height,
        //     "avg_weight":avg_weight,
        //     "member_num":member_num-1
        //   };
        //   ballTeamModel.update2(connection,{ball_team_id:ball_team_id},update_data,callback);
        // }],
        "add_point":["ball_team",function (results, callback) {
          var ball_team_info = results['ball_team'];
          var captain_id = ball_team_info['uid'];
          var param = {user_id:captain_id};
          var data = {};
          data['ball_team_point'] = ['ball_team_point+',1];
          UserModel.update2(connection,param,data,callback);
        }],
        "add_message":["ball_team","quit","add_point",function (results, callback) {
          var ball_team_info = results['ball_team'];
          var captain_id = ball_team_info['uid'];
          var members_uuid = ball_team_info['deviceuuid'];
          var data = {
            "content":Util.format('【%s】退出了【%s】球队',user['nickname'],ball_team_info['name']),
            "target":[members_uuid],
            "target_user":[captain_id],
            "type":3,
            "ext":{
              "msg_type":3,
              "type":6,
              "user_id":user_id,
              "ball_team_id":ball_team_id
            }
          };
          MessageModel.create(data,callback);
        }],
        "send_message":["add_message",function (results, callback) {
          var message = results['add_message'];
          if(!_.isEmpty(message)){
            JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
              callback();
            });
          }else {
            callback();
          }
        }]
      },function (err) {
        if(err){
          return connection.rollback(function () {
            connection.release();
            callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          callback(err);
        });
      })
    }
  ],function (err) {
    if(err) return res.error(err);

    res.success();
  })
};

/*邀请加入球队*/
exports.inviteJoinBallTeam = function (req, res, next) {
  var user_id = req.user.user_id;
  var invited_user_id = req.data.invited_user_id;
  var ball_team_id = req.data.ball_team_id;
  var ball_team_name = req.data.ball_team_name;
  var connection = null;
  async.waterfall([
    function (callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    },
    function (callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          return callback(err);
        }
        callback();
      });
    },
    function (callback) {
      async.auto({
        "userInfo":function (callback) {
          UserModel.find({"user_id":invited_user_id},callback);
        },
        "isJoined":function (callback) {
          var params = {
            "uid":invited_user_id,
            "ball_team_id":ball_team_id
          };
          ballTeamMember.count(params,function (err, result) {
            if(err) return callback(err);

            if(result){
              var error = new Error("此用户已加入了该球队");
              error.code = 441;
              return callback(error);
            }
            callback();
          });
        },
        "add_point":["userInfo",function (results, callback) {
          var user_info = results['userInfo'];
          var user_id = user_info['user_id'];
          var param = {user_id:user_id};
          var data = {};
          data['ball_team_point'] = ['ball_team_point+',1];
          UserModel.update2(connection,param,data,callback);
        }],
        "add_message":["isJoined","userInfo","add_point",function (results, callback) {
          var userInfo = results['userInfo'];
          var members_uuid = userInfo['deviceuuid'];
          var members_user_id = userInfo['user_id'];
          var data = {
            "content":Util.format('【%s】邀请您加入【%s】',req.user.nickname,ball_team_name),
            "target":[members_uuid],
            "target_user":[members_user_id],
            "type":3,
            "ext":{
              "msg_type":3,
              "ball_team_id":ball_team_id,
              "user_id":user_id,
              "type":1
            }
          };
          MessageModel.create(data,callback);
        }],
        "send_message":["add_message",function (results, callback) {
          var message = results['add_message'];
          JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
            callback();
          });
        }]
      },function (err, results) {
        if(err){
          return connection.rollback(function () {
            connection.release();
            callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          callback(err);
        })
      });
    }
  ],function (err) {
    if(err) return res.error(err);

    res.success();
  });
};

/*球队相册图片列表*/
exports.ballTeamImgList = function (req, res, next) {
  var ball_team_id = req.data.ball_team_id;
  ballTeamImg.select({ball_team_id:ball_team_id},function (err, data) {
    if(err) return res.error(err);
    res.success(data);
  });
};

/*添加球队照片*/
exports.addBallTeamImg = function (req, res, next) {
  var imgs = req.files;
  var ball_team_id = req.data.ball_team_id;
  var data = {
    "ball_team_id":ball_team_id,
    "user_id":req.user.user_id,
    "url":""
  };

  uploader(imgs,'ball_team',function (err, files) {
    if(err) return res.error(err);
    async.forEachOf(files,function (file, index, callback) {
      data['url'] = file.url;
      ballTeamImg.addBallTeamImg(data,callback);
    },function (err) {
      if(err) return res.error(err);

      res.success();
    })
  });
};

/*删除球队照片*/
exports.delBallTeamImg = function (req, res, next) {
  var id = req.data.img_id|0;

  ballTeamImg.delete({id:id},function (err, result) {
    var error = new Error("删除球队照片失败");
    error.code = 424;
    if(err) return res.error(error);

    res.success();
  })
};

/*球队活动列表*/
exports.ballTeamActList = function (req, res, next) {
  var queryParams = req.data;
  // console.log(queryParams);
  ballTeamActivity.search(queryParams,function (err, data) {
    if(err) return res.error(err);

    res.success(data['data']);
  });
};

/*活动详情*/
exports.activityInfo = function (req, res, next) {
  var activity_id = req.data.activity_id|0;
  var ball_team_id = req.data.ball_team_id|0;
  async.auto({
    "activity_info":function (callback) {
      ballTeamActivity.getById(activity_id,callback);
    },
    "activity_member":function (callback) {
      var queryParams = {
        "ball_team_activity_id":activity_id
      };
      queryParams['field'] = 't_ball_team_activity_user.*,tm.*,t_user.phone,t_user.nickname,t_user.avatar,t_user.sex,t_user.birthday,t_user.height,t_user.weight,ageOfBirthday(t_user.birthday) AS age';
      queryParams['join'] = [
        'join t_user on t_user.user_id = t_ball_team_activity_user.user_id',
        'join t_ball_team_member AS tm on tm.uid=t_ball_team_activity_user.user_id AND tm.ball_team_id='+ball_team_id
      ];
      BallTeamActivityUserModel.select(queryParams,callback);
    }
  },function (err, results) {
    if(err) return res.error(err);
    var activityInfo = results['activity_info'];
    activityInfo['members'] = results['activity_member'];

    res.success(activityInfo);
  });
};

/*取消活动*/
exports.cancelAct = function (req, res, next) {
  var activity_id = req.data.activity_id|0;
  var activity_name = req.data.activity_name;
  var ball_team_id = req.data.ball_team_id;
  var data = {
    "status":3
  };
  var connection = null;
  async.waterfall([
    function (callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    },
    function (callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          return callback(err);
        }
        callback();
      });
    },
    function (callback) {
      async.auto({
        "activity_member":function (callback) {
          var params = {};
          params['field'] = 'u.user_id,u.nickname,u.phone,u.deviceuuid';
          params['join'] = ['join t_user as u on u.user_id=t_ball_team_activity_user.user_id'];
          params['ball_team_activity_id'] = activity_id;
          BallTeamActivityUserModel.select(params,callback);
        },
        "cancel_activity":function (callback) {
          ballTeamActivity.update2(connection,{"id":activity_id},data,function (err, result) {
            if(err||result===false){
              return callback(err);                                        ///??????
            }
            callback();
          });
        },
        "add_point":["activity_member",function (results, callback) {
          var param = {};
          var data = {};
          var joined_members = results['activity_member'];
          var members_user_id = _.map(joined_members,'user_id');
          if(_.isEmpty(joined_members)){
            return callback();
          }
          param['__string'] = Util.format('user_id in (%s)',_.toString(members_user_id));
          data['activity_point'] = ['activity_point+',1];
          UserModel.update2(connection,param,data,callback);
        }],
        "add_message":["activity_member","add_point",function (results, callback) {
          var joined_members = results['activity_member'];
          var members_uuid = _.map(joined_members,'deviceuuid');
          var members_user_id = _.map(joined_members,'user_id');
          if(_.isEmpty(joined_members)){
            return callback();
          }
          var data = {
            "content":Util.format('你所参加的活动【%s】已取消',activity_name),
            "target":members_uuid,
            "target_user":members_user_id,
            "type":2,
            "ext":{
              "activity_name":activity_name,
              "activity_id":activity_id,
              "ball_team_id":ball_team_id,
              "msg_type":2
            }
          };
          MessageModel.create(data,callback);
        }],
        "send_message":["add_message","cancel_activity",function (results, callback) {
          var message = results['add_message'];
          if(_.isEmpty(message)){
            return callback();
          }
          JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
            callback();
          });
        }]
      },function (err) {
        if(err){
          return connection.rollback(function () {
            connection.release();
            return callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          callback(err);
        });
      })
    }
  ],function (err) {
    var error = new Error("取消活动失败");
    error.code = 424;
    if(err) return res.error(error);

    res.success();
  });
};


/*用户加入活动*/
exports.joinAct = function (req, res, next) {
  var user_id = req.user.user_id;
  var activity_id = req.data.activity_id;
  var user_nickname = req.user.nickname;
  var connection = null;
  async.waterfall([
    function (callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    },
    function (callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          return callback(err);
        }
        callback();
      });
    },
    function (callback) {
      async.auto({
        "activity_info":function (callback) {
          var params = {};
          params['field'] = 't_ball_team_activity.*,u.deviceuuid as user_uuid';
          params['join'] = ['join t_user as u on u.user_id = t_ball_team_activity.user_id'];
          params['id'] = activity_id;
          ballTeamActivity.find(params,callback);
        },
        "canJoin":["activity_info",function (results, callback) {
          var activity_info = results['activity_info'];
          if(activity_info['activity_time']<moment().unix()){
            var error = new Error("该活动已截止报名");
            error.code = 443;
            return callback(error);
          }else {
            callback();
          }
        }],
        "isJoined":function (callback) {
          BallTeamActivityUserModel.count({"user_id":user_id,"ball_team_activity_id":activity_id},function (err, result) {
            if(err) return callback(err);
            if(result){
              var error = new Error("你已参加了该活动");
              error.code = 438;
              return callback(error);
            }
            callback(null,result);
          });
        },
        "isFull":["activity_info",function (results, callback) {
          var activity_info = results['activity_info'];
          if(activity_info['join_num']>=activity_info['plan_person_num']){
            var error = new Error("该活动人数已满");
            error.code = 439;
            return callback(error);
          }
          callback();
        }],
        "join_activity":["isJoined","isFull",function (results,callback) {
          var data = {
            "ball_team_activity_id":activity_id,
            "user_id":user_id,
            "is_pay":1
          };
          BallTeamActivityUserModel.addBallTeamActivityUser2(connection,data,callback);
        }],
        "change_activity_num":["join_activity",function (results, callback) {
          var data = {};
          data['join_num'] = ['join_num+',1];
          ballTeamActivity.update2(connection,{"id":activity_id},data,callback);
        }],
        "add_point":["activity_info",function (results, callback) {
          var param = {};
          var data = {};
          var activity_info = results['activity_info'];
          var members_uid = activity_info['user_id'];
          param['__string'] = Util.format('user_id in (%s)',_.toString(members_uid));
          data['activity_point'] = ['activity_point+',1];
          UserModel.update2(connection,param,data,callback);
        }],
        "add_message":["activity_info","join_activity","change_activity_num","add_point",function (results, callback) {
          var activity_info = results['activity_info'];
          var members_uuid = activity_info['user_uuid'];
          var members_uid = activity_info['user_id'];
          var data = {
            "content":Util.format('【%s】加入了【%s】活动',user_nickname,activity_info['name']),
            "target":[members_uuid],
            "target_user":[members_uid],
            "type":2,
            "ext":{
              "msg_type":2,
              "ball_team_id":activity_info['ball_team_id'],
              "activity_id":activity_id
            }
          };
          MessageModel.create(data,callback);
        }],
        "send_message":["add_message","join_activity",function (results, callback) {
          var message = results['add_message'];
          JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
            callback();
          });
        }]
      },function (err, results) {
        if(err){
          return connection.rollback(function () {
            connection.release();
            return callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          callback(err);
        });
      })
    }
  ],function (err) {
    if(err) return res.error(err);

    res.success();
  })
};

/*用户退出活动*/
exports.quitAct = function (req, res, next) {
  var user_id = req.user.user_id;
  var activity_id = req.data.activity_id;
  var connection = null;
  async.waterfall([
    function (callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    },
    function (callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          return callback(err);
        }
        callback();
      });
    },
    function (callback) {
      async.auto({
        "activity_info":function (callback) {
          var params = {};
          params['field'] = 't_ball_team_activity.*,u.deviceuuid as user_uuid';
          params['join'] = ['join t_user as u on u.user_id = t_ball_team_activity.user_id'];
          params['id'] = activity_id;
          ballTeamActivity.find(params,callback);
        },
        "isJoined":function (callback) {
          BallTeamActivityUserModel.count({"user_id":user_id,"ball_team_activity_id":activity_id},function (err, result) {
            if(err) return callback(err);
            if(!result){
              var error = new Error("你还未参加该活动");
              error.code = 440;
              return callback(error);
            }
            callback(null,result);
          });
        },
        "delete_link":['isJoined',function (results, callback) {
          var params = {
            "ball_team_activity_id":activity_id,
            "user_id":user_id,
          };
          BallTeamActivityUserModel.delete2(connection,params,callback);
        }],
        "change_activity_num":["isJoined",function (results, callback) {
          var data = {};
          data['join_num'] = ['join_num-',1];
          ballTeamActivity.update2(connection,{"id":activity_id},data,callback);
        }],
        "add_point":["activity_info",function (results, callback) {
          var param = {};
          var data = {};
          var activity_info = results['activity_info'];
          var members_uid = activity_info['user_id'];
          param['__string'] = Util.format('user_id in (%s)',_.toString(members_uid));
          data['activity_point'] = ['activity_point+',1];
          UserModel.update2(connection,param,data,callback);
        }],
        "add_message":["activity_info","change_activity_num","delete_link","add_point",function (results, callback) {
          var activity_info = results['activity_info'];
          var members_uuid = activity_info['user_uuid'];
          var members_uid = activity_info['user_id'];
          var data = {
            "content":Util.format('【%s】退出了【%s】活动',req.user.nickname,activity_info['name']),
            "target":[members_uuid],
            "target_user":[members_uid],
            "type":2,
            "ext":{
              "msg_type":2,
              "ball_team_id":activity_info['ball_team_id'],
              "activity_id":activity_id
            }
          };
          MessageModel.create(data,callback);
        }],
        "send_message":["add_message","change_activity_num","delete_link",function (results, callback) {
          var message = results['add_message'];
          JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
            callback();
          });
        }]
      },function (err,results) {
        if(err){
          return connection.rollback(function () {
            connection.release();
            return callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          callback(err);
        });
      });
    }
  ],function (err) {
    if(err) return res.error(err);

    res.success();
  })
};


/*创建活动*/
exports.addAct = function (req, res, next) {
  var data = req.data;
  var user_id = data.user_id;
  var ball_team_id = data.ball_team_id;
  var activity_title = data.name;
  var connection = null;
  async.waterfall([
    function (callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    },
    function (callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          return callback(err);
        }
        callback();
      });
    },
    function (callback) {
      async.auto({
        "ball_team_info":function (callback) {
          ballTeamModel.getById(data.ball_team_id,callback);
        },
        "add_activity":function (callback) {
          ballTeamActivity.addBallTeamActivity2(connection,data,function (err, newId) {

            if(err||newId===false){
              return callback(err);
            }
            callback(null,newId);
          });
        },
        "add_point":["ball_team_info",function (results, callback) {
          var param = {};
          var data = {};
          var ball_team = results['ball_team_info'];
          if (_.isEmpty(ball_team['members'])){
            return callback();
          }
          var members_user_id = _.map(ball_team['members'],'uid');
          param['__string'] = Util.format('user_id in (%s)',_.toString(members_user_id));
          data['activity_point'] = ['activity_point+',1];
          UserModel.update2(connection,param,data,callback);
        }],
        "add_message":["ball_team_info","add_activity","add_point",function (results, callback) {
          var ball_team = results['ball_team_info'];
          var activity_id = results['add_activity'];
          var members_uuid = _.map(ball_team['members'],'deviceuuid');
          var members_user_id = _.map(ball_team['members'],'uid');
          var data = {
            "content":Util.format('你所在的球队【%s】发布了一个活动：【%s】',ball_team['name'],activity_title),
            "target":members_uuid,
            "target_user":members_user_id,
            "type":2,
            "ext":{
              "msg_type":2,
              "sender_id":user_id,
              "ball_team_id":ball_team_id,
              "activity_id":activity_id
            }
          };
          MessageModel.create(data,callback);
        }],
        "send_message":["add_message","add_activity",function (results, callback) {
          var message = results['add_message'];
          JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
            callback();
          });
        }]
      },function (err, results) {
        if(err){
          return connection.rollback(function () {
            connection.release();
            return callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          callback(err);
        });
      });
    }
  ],function (err) {
    if(err){
      var error = new Error("创建球队活动失败");
      error.code = 425;
      return res.error(error);
    }

    res.success();
  });
};

/*发布球队公告*/
exports.addNotice = function (req, res, next) {
  var data = req.data;
  var user_id = data.user_id;
  var ball_team_id = data.ball_team_id;
  var connection = null;
  async.waterfall([
    function (callback) {
      Mysql.master.getConnection(function (err, connect) {
        if(err) return callback(err);
        connection = connect;
        callback();
      });
    },
    function (callback) {
      connection.beginTransaction(function (err) {
        if(err){
          connection.release();
          return callback(err);
        }
        callback();
      });
    },
    function (callback) {
      async.auto({
        "ball_team_info":function (callback) {
          ballTeamModel.getById(data.ball_team_id,callback);
        },
        "add_notice":function (callback) {
          ballTeamNotice.addBallTeamNotice2(connection,data,function (err, result) {
            if(err||!result){
              return callback(err);
            }
            callback();
          });
        },
        "add_point":["ball_team_info",function (results, callback) {
          var param = {};
          var data = {};
          var ball_team = results['ball_team_info'];
          if (_.isEmpty(ball_team['members'])){
            return callback();
          }
          var members_user_id = _.map(ball_team['members'],'uid');
          param['__string'] = Util.format('user_id in (%s)',_.toString(members_user_id));
          data['activity_point'] = ['activity_point+',1];
          UserModel.update2(connection,param,data,callback);
        }],
        "add_message":["ball_team_info","add_point",function (results, callback) {
          var ball_team = results['ball_team_info'];
          var members_uuid = _.map(ball_team['members'],'deviceuuid');
          var members_user_id = _.map(ball_team['members'],'uid');
          var data = {
            "content":Util.format('你所在的球队【%s】发布了一条公告',ball_team['name']),
            "target":members_uuid,
            "target_user":members_user_id,
            "type":3,
            "ext":{
              "msg_type":3,
              "sender_id":user_id,
              "ball_team_id":ball_team_id,
              "type":5
            }
          };
          MessageModel.create(data,callback);
        }],
        "send_message":["add_notice","add_message",function (results, callback) {
          var message = results['add_message'];
          JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
            callback();
          });
        }]
      },function (err, results) {
        if(err){
          return connection.rollback(function () {
            return callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          callback(err);
        });
      });
    }
  ],function (err) {
    if(err){
      var error = new Error("发布球队公告失败");
      error.code = 426;
      return res.error(error);
    }
    res.success();
  })
};

/*球队公告留言*/
exports.addNoticeComment = function (req, res, next) {
  var data = {
    "ball_team_notice_id":req.data.notice_id,
    "user_id":req.user.user_id,
    "content":req.data.content
  };
  ballTeamNoticeComment.addBallTeamNoticeComment(data,function (err, result) {
    if(err) return res.error(err);

    res.success();
  })
};

/*球队公告列表*/
exports.noticeList = function (req, res, next) {
  var queryParams = req.data;
  queryParams['t_ball_team_notice.ball_team_id'] = queryParams['ball_team_id'];
  delete queryParams['ball_team_id'];
  queryParams['field'] = 't_ball_team_notice.*,u.nickname,u.avatar,u.sex,u.phone,bm.type as user_type';
  queryParams['join'] = [
      'join t_user as u on u.user_id = t_ball_team_notice.user_id',
      Util.format('join t_ball_team_member as bm on bm.ball_team_id=t_ball_team_notice.ball_team_id AND bm.uid=t_ball_team_notice.user_id')
  ];
  async.auto({
    "notices":function (callback) {
      ballTeamNotice.search(queryParams,callback);
    },
    "notice_comment":['notices',function (results, callback) {
      var notices = results['notices']['data'];

      async.forEachOf(notices,function (notice, index, callback) {
        var params = {};
        params['field'] = 't_ball_team_notice_comment.*,u.nickname,u.avatar,u.sex,u.phone';
        params['ball_team_notice_id'] = notice['id'];
        params['join'] = ['join t_user as u on u.user_id=t_ball_team_notice_comment.user_id'];
        ballTeamNoticeComment.select(params,function (err, data) {
          if(err) return callback(err);

          notices[index]['comment'] = data;
          callback();
        });
      },function (err) {
        if(err) return callback(err);
        callback(null,notices);
      });
    }]
  },function (err, results) {
    if(err) return res.error(err);

    res.success(results['notice_comment']);
  });

};

/*球队成员*/
exports.ballTeamMembers = function (req, res, next) {
  var queryParams = req.data;
  queryParams['field'] = 't_ball_team_member.*,u.phone,u.nickname,u.avatar,u.height,u.weight,u.customary,u.goodAt,u.birthday,ageOfBirthday(u.birthday) as age';
  queryParams['join'] = ['join t_user as u on t_ball_team_member.uid=u.user_id'];
  ballTeamMember.search(queryParams,function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  });
};

/*修改球队信息*/
exports.updateBallTeam = function (req, res, next) {
  var data = req.data;
  var ball_team_id = data['ball_team_id'];
  async.auto({
    "check_same_team":function (callback) {
      var ball_team_name = _.trim(data['name']);
      var query = {
        "name":ball_team_name
      };
      query['ball_team_id'] = ['!=',ball_team_id];
      ballTeamModel.count(query,function (err, data) {
        if(err) return callback(err);

        if(data){
          var error = new Error("该球队已存在");
          error.code = 458;
          return callback(error);
        }
        callback();
      })
    },
    "update":["check_same_team",function (results, callback) {
      ballTeamModel.updateBallTeam(ball_team_id,data,function (err, result) {
        if(err) return callback(err);

        callback();
      });
    }]
  },function (err, results) {
    if(err) return res.error(err);
    
    res.success();
  })

};

/*球队赛程列表*/
  exports.ballRaceList = function (req, res, next) {
  var queryParam = req.data;
  var ball_team_id = req.data.ball_team_id;
  delete queryParam['ball_team_id'];
  var condition = {};
  queryParam['field'] = [
    "t_competition_race.*,FROM_UNIXTIME(t_competition_race.start_time,'%m月%d日 %H:%i') AS race_start_time",
    'b1.name AS home_team_name,b1.logo AS home_team_logo,b1.san_score AS home_team_san_score,b2.name AS guest_team_name,b2.logo AS guest_team_logo,b2.san_score AS guest_team_san_score',
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
  queryParam['__string'] = Util.format('(t_competition_race.home_team_id = %d OR t_competition_race.guest_team_id=%d)',ball_team_id,ball_team_id);
  CompetitionRaceModel.search(queryParam,function (err, result) {
    if(err) return res.error(err);

    var data = result['data'];
    res.success(data);
  });
};

/*查看用户在该球队*/
exports.isTeamMember = function (req, res, next) {
  var user_id = req.data.user_id;
  var ball_team_id = req.data.ball_team_id;
  var param = {
    "ball_team_id":ball_team_id,
    "uid":user_id
  };
  ballTeamMember.count(param,function (err, data) {
    if(err) return res.error(err);

    res.success({is_join:data});
  })
};

/*修改球队成员信息*/
exports.changeBallTeamMember = function (req, res, next) {
  var id = req.data.id|0;
  var data = {
    "type":req.data.type,
    "clubnumber":req.data.clubnumber,
    "position":req.data.position
  };
  async.auto({
    "update_member":function (callback) {
      ballTeamMember.update({"id":id},data,callback);
    }
  },function (err, results) {
    if(err) return res.error(err);
    
    res.success();
  })
};
