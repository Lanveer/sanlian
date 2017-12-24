/**
 * Created by walter on 2016/6/15.
 */
const validator = require('validator');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const qs = require('querystring');
const mysql = require('mysql');
const Util = require('util');
var functions = require('../../../util/functions');

var sms = require('../../../util/sms');

var buildOrder = require('../../../util/buidOrder');
var JPush = require('../../../util/jPush');
var WXPay =require('../../../lib/wxpay').WXPay;
var AliPay = require('../../../lib/alipay').AliPay;
var AliConfig = require('../../../lib/alipay').config;
var WxConfig = require('../../../lib/wxpay').config;
var RefereeModel = require('../../common/model').Referee;
var CameramanModel = require('../../common/model').Cameraman;
var CourtModel = require('../../common/model').Court;
var OnceModel = require('../../common/model').Once;
var VipModel = require('../../common/model').Vip;
var QualifyingModel = require('../../common/model').Qualifying;
var FriendlyOrderModel = require('../../common/model').FriendlyOrder;
var BallTeamModel = require('../../common/model').BallTeam;
var OrderModel = require('../../common/model').Order;
var RecordModel = require('../../common/model').Record;
var UserModel = require('../../common/model').User;
var ConfigModel = require('../../common/model').Config;
var RechargeOrderModel = require('../../common/model').RechargeOrder;
var ApplyRefundOrderModel = require('../../common/model').ApplyRefund;
var MessageModel = require('../../common/model').Message;
var CompetitionModel = require('../../common/model').Competition;
var CompetitionBallTeam = require('../../common/model').CompetitionBallteam;
var AdminUser = require('../../common/model').AdminUser;

/*裁判列表*/
exports.refereeList = function (req, res, next) {
  RefereeModel.select({"is_show":1},function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  });
};

/*摄像组*/
exports.cameraman = function (req, res, next) {
  CameramanModel.find({"is_show":1},function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  });
};

/*下订单*/
exports.addOrder = function(req, res, next){
  var now = moment().unix();
  var user = req.user;
  var court_id = req.data.court_id;
  var game_type = req.data.game_type|0;                   //0-排位赛 1-友谊赛
  var san_money = _.toNumber(req.data.san_money);   //三联币
  var fee = _.toNumber(req.data.fee);                 //RMB
  var pay_type = req.data.pay_type|0;               //支付方式 1-支付宝 2-微信
  var describe = _.trim(req.data.describe);         //订单描述
  var time_zones = req.data.time_zones;
  var count = time_zones.length;      //定了几场
  var phone = req.data.phone;     //友谊赛联系电话
  var old_order_id = req.data.old_order_id;       //之前的订单ID
  var court_price = (req.data.court_price*100|0)/100;   //球场价格
  var referee_price = (req.data.referee_price*100|0)/100;  //裁判价格
  var ball_team_id = 0;


  async.waterfall([
    function (callback) {
      if(!describe){
        var error = new Error('订单描述必须!');
        error.code = 400;
        return callback(error);
      }
      if(san_money>user['san_money']){
        var error = new Error('您的三联币不足');
        error.code = 416;
        return callback(error);
      }
      if(_.indexOf([0,1],game_type)==-1){
        var error = new Error('游戏类型未知');
        error.code = 400;
        return callback(error);
      }
      callback();
    },
    function (callback) {
      if(game_type==0){
        if(!req.data.referee_id){
          var error = new Error("排位赛必须需要裁判");
          error.code = 420;
          return callback(error);
        }
        if((now+86400)>=_.min(_.map(time_zones,'start_time'))){
          var error = new Error("排位赛需要提前24小时预定");
          error.code = 421;
          return callback(error);
        }
        BallTeamModel.getDetail({uid:user.user_id},function (err, data) {
          if(err) return callback(err);

          if(_.isEmpty(data)){
            var error = new Error("你不是队长，不能创建排位赛");
            error.code = 418;
            return callback(error);
          }
          if(data['members'].length<5){
            var error = new Error("你的球队当前人数为"+data['members'].length+"人，不足5人");
            error.code = 419;
            return callback(error);
          }
          ball_team_id = data['ball_team_id'];
          callback();
        });
      }else {
        callback();
      }
    },
    function (callback) {
      async.forEachOf(time_zones,function (time_zone, index, callback) {
        var params = {court_id:court_id};
        params['start_time'] = ['<=',time_zone['start_time']];
        params['end_time'] = ['>=',time_zone['end_time']];
        async.auto({
          "del_old_order":function (callback) {
            if (!old_order_id) return callback();

            OrderModel.delete({order_id: old_order_id}, callback);
          },
          "del_old_qualifying":function (callback) {
            if (!old_order_id) return callback();

            QualifyingModel.delete({home_order_id: old_order_id}, callback);
          },
          "del_old_friendly":function (callback) {
            if (!old_order_id) return callback();

            FriendlyOrderModel.delete({order_id: old_order_id}, callback);
          },
          "count_friendly":["del_old_friendly","del_old_order","del_old_qualifying",function (results,callback) {
            params['__string'] = '(status<3)';
            FriendlyOrderModel.count(params, callback);
          }],
          "count_qualifying":["del_old_friendly","del_old_order","del_old_qualifying",function (results,callback) {
            params['__string'] = '((status<2) OR (refund_num=0 AND status=2))';
            QualifyingModel.count(params, callback);
          }]
        },function(err,results){
          if(err) return callback(err);

          var count = results['count_friendly'] + results['count_qualifying'];

          if(count){
            var start_time = moment.unix(time_zone['start_time']).format('YYYY-MM-DD HH:mm');
            var end_time = moment.unix(time_zone['end_time']).format('-HH:mm');
            var info = "该球场"+start_time+end_time+"时间段已被预定";
            var error = new Error(info);
            error.code = 417;
            return callback(error);
          }
          callback();
        });
      },function (err) {
        if(err) return callback(err);

        callback();
      });
    },
    function (callback) {
      var connection = null;
      async.waterfall([
        function (callback) {
          Mysql.master.getConnection(function (err, connect) {
            if(err) return callback(err);
            connection = connect;
            callback();
          });
        },
        function(callback){
          connection.beginTransaction(function (err) {
            if(err){
              connection.release();
              return callback(err);
            }
            callback();
          });
        },
        function (callback) {
          var order_no = buildOrder();
          async.auto({
            "add_order":function (callback) {
              var order = {
                "user_id":user.user_id,
                "price":fee,
                "pay_type":pay_type,
                "order_no":order_no,
                "san_money":san_money,
                "type":game_type|0,
                "order_data":JSON.stringify(req.data)
              };
              OrderModel.addOrder2(connection,order,callback);
            },
            "add_son":["add_order",function (results, callback) {
              var order_id = results['add_order'];
              async.forEachOf(time_zones,function (time_zone, index, callback) {
                if(game_type==0){
                  var qualifying = {
                    "home_team_id":ball_team_id,
                    "home_order_id":order_id,
                    "home_color":req.data.color,
                    "court_id":court_id,
                    "referee_id":req.data.referee_id|0,
                    "cameraman_id":req.data.cameraman_id|0,
                    "start_time":time_zone['start_time'],
                    "end_time":time_zone['end_time'],
                    "fee":(fee+san_money)*2/count,
                    "court_price":court_price,
                    "referee_price":referee_price
                  };
                  QualifyingModel.addQualifying2(connection,qualifying,function (err, newId) {
                    time_zones[index]['son_order_id'] = newId;
                    callback(err);
                  });
                }else if(game_type==1){
                  var friendly = {
                    "order_id":order_id,
                    "user_id":user.user_id,
                    "court_id":court_id,
                    "start_time":time_zone['start_time'],
                    "end_time":time_zone['end_time'],
                    "price":fee/count,
                    "san_money":san_money/count,
                    "referee_id":req.data.referee_id|0,
                    "referee_price":_.toNumber(req.data.referee_price)/count,
                    "cameraman_id":req.data.cameraman_id|0,
                    "team_name":_.trim(req.data.team_name),
                    "user_phone":phone
                  };
                  FriendlyOrderModel.addFriendlyOrder2(connection,friendly,function (err, newId) {
                    time_zones[index]['son_order_id'] = newId;
                    callback(err);
                  });
                }else {
                  var error = new Error("游戏类型未知");
                  error.code = 400;
                  return callback(error);
                }
              },function (err) {
                callback(err);
              });
            }],
            "pay":["add_order",function (results, callback) {
              var order_id = results['add_order'];

              if(fee>0){                                                            //需要RMB支付
                if(pay_type==1){                          //支付宝支付
                  try {
                    var request_str = AliPay.getAppRequest(order_no, fee, describe, AliConfig.PAY_NOTIFY_URL);
                    return callback(null,{request_str:request_str});
                  } catch (e) {
                    return callback(e);
                  }
                }else if(pay_type==2){                  //微信支付
                  var start_time = moment().format('YYYYMMDDHHmmss');
                  var client_ip = functions.getClientIp(req);
                  async.waterfall([
                    function (callback) {
                      WXPay.unifiedOrder(order_no,start_time,fee,describe,client_ip,WxConfig.PAY_NOTIFY_URL,callback);
                    },
                    function (result,callback){
                      var prepay_id = result['prepay_id'][0];
                      var data = WXPay.getAppRequest(prepay_id);
                      data['_package'] = data['package'];
                      delete data['package'];
                      callback(null,data);
                    }
                  ],function (err, result) {
                    if(err) return callback(err);

                    callback(null,result);
                  });
                }else {
                  var error = new Error("支付方式错误");
                  error.code = 400;
                  return callback(error);
                }
              }else if(san_money>0){                  //不需要RMB支付，需要三联币支付
                var record = {
                  "uid":user.user_id,
                  "type":3,
                  "remark":"消费",
                  "data":order_id,
                  "money":-san_money
                };
                async.series([
                  function (callback) {
                    RecordModel.addRecord2(connection,record,callback);
                  },
                  function (callback) {
                    var data = {
                      "san_money":["san_money -"+mysql.escape(san_money)]
                    };
                    UserModel.update2(connection,{user_id:user.user_id},data,callback)
                  }
                ],function (err, results) {
                  if(err) return callback(err);

                  if(!results[0]||!results[1]){
                    var error = new Error("三联币支付失败");
                    return callback(error);
                  }
                  callback();
                });
              }else {                                 //免费
                callback();
              }
            }]
          },function (err, results) {
            if(err) return callback(err);

            var data = results['pay'];
            var order_id = results['add_order'];
            if(!data){                                    //订单成功完成支付
              async.forEachOf(time_zones,function (time_zone, index, callback) {
                async.auto({
                  "change_order_status":function (callback) {
                    OrderModel.update2(connection,{order_id:order_id},{status:1},function (err, result) {
                      if(result===false){
                        var error = new Error("修改订单支付完成状态失败");
                        return callback(error);
                      }
                      callback();
                    });
                  },
                  "change_ballTeam_status":function (callback) {
                    if(game_type==0){
                      BallTeamModel.update2(connection,{ball_team_id:ball_team_id},{is_qualifying:1},function (err, result) {
                        if(result===false){
                          var error = new Error("修改球队应战状态失败");
                          return callback(error);
                        }
                        callback();
                      });
                    }else {
                      callback();
                    }
                  },
                  "change_qualifying_status":function (callback) {
                    if(game_type==0){
                      QualifyingModel.update2(connection,{qualifying_id:time_zone['son_order_id']},{pay_num:1},function (err, result) {
                        if(result===false){
                          var error = new Error("修改排位赛支付状态失败");
                          return callback(error);
                        }
                        callback();
                      });
                    }else {
                      callback();
                    }
                  },
                  "change_friendly_status":function (callback) {
                    if(game_type==1){
                      FriendlyOrderModel.update2(connection,{friendly_order_id:time_zone['son_order_id']},{status:2},function (err, result) {
                        if(result===false){
                          var error = new Error("修改友谊赛支付状态失败");
                          return callback(error);
                        }
                        callback();
                      });
                    }else {
                      callback();
                    }
                  }
                },function (err) {
                  callback(err);
                });
              },function (err) {
                if(err) return callback(err);

                var order_day = moment.unix(time_zones[0]['start_time']).format('YYYY-MM-DD');
                async.auto({
                  "court_info":function (callback) {
                    var params = {};
                    params['field'] = 't_court.venue_id,v.address as venue_address,v.name as venue_name,t_court.name as court_name,t_court.address as court_address';
                    params['join'] = ['join t_venue as v on v.venue_id = t_court.venue_id'];
                    params['court_id'] = court_id;
                    CourtModel.find(params,callback);
                  },
                  "ballTeamInfo":function (callback) {
                    BallTeamModel.getById(ball_team_id,callback);
                  },
                  "court_admin":["court_info",function (results, callback) {
                    var courtInfo = results['court_info'];
                    var venue_id = courtInfo['venue_id'];
                    AdminUser.find({"venue_id":venue_id},callback);
                  }],
                  "add_point":["court_info","ballTeamInfo",function (results, callback) {
                    var param = {};
                    var data = {};
                    if(game_type==0){
                      var ball_team_info = results['ballTeamInfo'];
                      var ball_team_member = ball_team_info['members'];
                      var membersId = _.map(ball_team_member,"uid");
                      param['__string'] = Util.format('user_id in (%s)',_.toString(membersId));
                    }else {
                      param['__string'] = Util.format('user_id in (%s)',_.toString(user.user_id));
                    }
                    
                    data['book_point'] = ['book_point+',1];
                    UserModel.update2(connection,param,data,callback);
                  }],
                  "add_message":["court_info","add_point","ballTeamInfo",function (results, callback) {
                    var court_info = results['court_info'];
                    if(game_type==0){
                      var ball_team_info = results['ballTeamInfo'];
                      var ball_team_member = ball_team_info['members'];
                      var membersId = _.map(ball_team_member,"uid");
                      var membersDeviceId = _.map(ball_team_member,"deviceuuid");
                      var data = {
                        "content":Util.format('你所在的球队[%s]已成功预定%s在%s,地址：%s',ball_team_info['name'],order_day,court_info['venue_name']+court_info['court_name'],court_info['venue_address']),
                        "target":membersDeviceId,
                        "target_user":membersId,
                        "type":0,
                        "ext":{
                          "msg_type":0,
                          "order_id":order_id,
                          "court_id":court_id
                        }
                      };
                    }else {
                      var data = {
                        "content":Util.format('你的球队已成功预定%s在%s,地址：%s',order_day,court_info['venue_name']+court_info['court_name'],court_info['venue_address']),
                        "target":[user.deviceuuid],
                        "target_user":[user.user_id],
                        "type":0,
                        "ext":{
                          "msg_type":0,
                          "order_id":order_id,
                          "court_id":court_id
                        }
                      };
                    }
                    
                    MessageModel.create(data,callback);
                  }],
                  "send_message":["add_message",function (results, callback) {
                    var message = results['add_message'];
                    JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
                      callback();
                    });
                  }],
                  "send_sms":["add_message","court_admin",function (results, callback) {
                    var courtAdmin = results['court_admin'];
                    if(!_.isEmpty(courtAdmin)){
                      console.log(courtAdmin['phone'],courtAdmin['name'],user['phone']);
                      sms.sendToManager(courtAdmin['phone'],courtAdmin['name'],user['phone'],function (err) {
                        callback();
                      })
                    }else {
                      return callback();
                    }
                  }]
                },function (err) {
                  callback(err);
                });
              });
            }else {
              callback(null,data);
            }
          });
        }
      ],function (err,data) {
        if(err){
          return connection.rollback(function () {
            connection.release();
            callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          if(err) return callback(err);

          callback(null,data);
        });
      });
    }
  ],function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  });
};


/*充值*/
exports.recharge = function(req, res, next){
  var money = _.toNumber(req.data.money);
  var user = req.user;
  var user_id = user.user_id|0;
  var pay_type = req.data.pay_type|0;                                 //支付方式 1-支付宝 2-微信

  var old_order_id = req.data.old_order_id|0;

  var describe = "充值三联币";

  var connection = null;
  async.waterfall([
    function (callback) {
      var error = new Error("充值金额需大于0元");
      error.code = 431;
      if(money<=0){
        return callback(error);
      }
      callback();
    },
    function (callback) {
      var error = new Error("支付方式不存在！");
      error.code = 400;
      if(_.indexOf([1,2],pay_type)<0){
        return callback(error);
      }
      callback();
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
      var order_no = buildOrder();
      async.auto({
        "config":function(callback){
          var params = {};
          params['name'] = ['like',connection.escape('chongzhi_num%')];
          ConfigModel.select(params,function(err, result){
            if(err) return callback(err);

            var data = [];
            _.forEach(result,function(value,index){
              if(!_.endsWith(value['name'],'send')){
                var send = _.find(result,{"name":value['name']+'_send'});
                value['send'] = send['val'];
                data.push(value);
              }
            });
            callback(null,data);
          });
        },
        "get_send":["config",function (results, callback) {
          var config = results['config'];
          var send = [0];
          _.forEach(config,function (value) {
            if(money>=_.toNumber(value['val'])){
              send.push(_.toNumber(value['send']));
            }
          });
          send = _.max(send);
          callback(null,send);
        }],
        "del_old_order":function (callback) {
          if(!old_order_id) return callback();
          var param = {};
          param['order_id'] = old_order_id;
          OrderModel.delete2(connection,param,callback);
        },
        "del_old_recharge_order":function (callback) {
          if(!old_order_id) return callback();
          var param = {};
          param['order_id'] = old_order_id;
          RechargeOrderModel.delete2(connection,param,callback);
        },
        "add_order":function (callback) {
          var order = {
            "user_id":user_id,
            "price":money,
            "pay_type":pay_type,
            "order_no":order_no,
            "san_money":0,
            "type":2,
            "order_data":JSON.stringify(req.data)
          };
          OrderModel.addOrder2(connection,order,callback);
        },
        "add_recharge_order":["add_order","get_send",function (results, callback) {
          var order_id = results['add_order'];
          var send = results['get_send'];
          var data = {
            "user_id":user_id,
            "money":money,
            "order_id":order_id,
            "send":send
          };
          RechargeOrderModel.addRechargeOrder2(connection,data,callback);
        }],
        "pay":["add_order",function (results, callback) {
          var order_id = results['add_order'];

          if(money>0){                                                            //需要RMB支付
            if(pay_type==1){                          //支付宝支付
              try {
                var request_str = AliPay.getAppRequest(order_no, money, describe, AliConfig.RECHARGE_NOTIFY_URL);
                return callback(null,{request_str:request_str});
              } catch (e) {
                return callback(e);
              }
            }else if(pay_type==2){                  //微信支付
              var start_time = moment().format('YYYYMMDDHHmmss');
              var client_ip = functions.getClientIp(req);
              async.waterfall([
                function (callback) {
                  WXPay.unifiedOrder(order_no,start_time,money,describe,client_ip,WxConfig.RECHARGE_NOTIFY_URL,callback);
                },
                function (result,callback){
                  var prepay_id = result['prepay_id'][0];
                  var data = WXPay.getAppRequest(prepay_id);
                  data['_package'] = data['package'];
                  delete data['package'];
                  callback(null,data);
                }
              ],function (err, result) {
                if(err) return callback(err);

                callback(null,result);
              });
            }else {
              var error = new Error("支付方式错误");
              error.code = 400;
              return callback(error);
            }
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
          if(err) return callback(err);

          callback(null,results['pay']);
        });
      });
    }
  ],function (err,data) {
    if(err) return res.error(err);

    res.success(data);
  });
};


/*用户退款*/
exports.refund = function (req, res, next) {
  var order_id = req.data.order_id|0;
  var user = req.user;

  var batch_no = buildOrder();
  var order = {};
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
        "order":function (callback) {
          OrderModel.find({"order_id":order_id},function (err, data) {
            if(err) return callback(err);

            if(_.isEmpty(data)){
              var error = new Error("该订单不存在！");
              error.code = 400;
              return callback(error);
            }
            order = data;
            callback(null,data);
          });
        },
        "check_qualifying":["order",function (results,callback) {
          if(order['type'] != 0) return callback();
          var param = {};
          var ball_team_id = user['cur_ballteam_id'];
          param['__string'] = Util.format('(home_order_id=%d OR guest_order_id=%d)',order_id,order_id);
          QualifyingModel.find(param,function (err, data) {
            if(err) return callback(err);
            
            if(data['home_team_id']==ball_team_id&&data['status']==1){
              var error = new Error("此场排位赛已应战，作为主队不能退款");
              error.code = 453;
              return callback(error);
            }
            callback();
          });
        }],
        "check_status":["order",function (results, callback) {
          var refund_type = order['refund_type']|0;
          if(order['status']==0){
            var error = new Error("该订单未支付");
            error.code = 432;
            return callback(error);
          }else if(order['status']==2){
            var error = new Error("该订单申请退款中");
            error.code = 433;
            return callback(error);
          }else if(order['status']==3){
            var error = new Error("该订单已退款");
            error.code = 434;
            return callback(error);
          }else if(order['status']!=1){
            var error = new Error("订单状态出错，请联系客服");
            error.code = 435;
            return callback(error);
          }
          if(order['price']&&!order['trade_no']){
            var error = new Error("该订单未交易成功");
            error.code = 436;
            return callback(error);
          }
          if(refund_type!=0&&refund_type!=3){
            var error = new Error("该订单不可退款");
            error.code = 457;
            return callback(error);
          }
          callback();
        }],
        "aliRefund":["check_status","check_qualifying",function (results, callback) {
          if(order['pay_type']==1&&order['price']){
            var data = {
              "order_id":order_id,
              "user_id":req.user.user_id,
              "is_priority":1,
              "reason":"支付宝交易，需优先退款"
            };
            async.auto({
              "add_apply":function (callback) {
                ApplyRefundOrderModel.addApplyRefund2(connection,data,function (err, newId) {
                  if(err) return callback(err);
                  if(!newId){
                    var error = new Error("支付宝添加退款申请失败");
                    error.code = 437;
                    return callback(error);
                  }
                  callback();
                });
              },
              "update_order":function (callback) {
                OrderModel.update2(connection,{order_id:order_id},{status:2},callback);
              },
              "update_friendly":function (callback) {
                FriendlyOrderModel.update2(connection,{order_id:order_id},{status:3},callback)
              },
              "update_qualifying":function (callback) {
                var param = {};
                var data = {};
                if(order['type']==0){
                  param['home_order_id'] = order_id;
                  data['status'] = 2;
                }else if(order['type']==3){
                  param['guest_order_id'] = order_id;
                  data['status'] = 0;
                }else {
                  return callback();
                }

                QualifyingModel.update2(connection,param,data,callback);
              }
            },callback)

          }else {
            callback();
          }
        }],
        "wxRefund":["check_status","check_qualifying",function (results, callback) {
          if(order['pay_type']==2&&order['price']){
            async.waterfall([
              function (callback) {
                WXPay.refund(order['trade_no'],batch_no,order['price'],callback)
              },
              function (refundInfo, callback) {
                var data = {
                  "batch_no":refundInfo['out_refund_no']
                };
                OrderModel.update2(connection,{"order_id":order_id},data,callback);
              }
            ],function (err, result) {
              if(err) return callback(err);

              if(result===false){
                var error = new Error("退款单号更新失败！");
                return callback(error);
              }
              callback(null,1);
            });
          }else {
            callback(null,0);
          }
        }],
        "sanRefund":["check_status","check_qualifying",function (results, callback) {
          if(!order['price']&&order['san_money']){
            return callback(null,1);
          }else {
            callback(null,0);
          }
        }]
      },function (err, results) {
        if(err) return callback(err);

        if(results['wxRefund']||results['sanRefund']){
          return callback(null,1);
        }else {
          return callback(null,0);
        }
      });
    },
    function (isRefundOk, callback) {
      if(!isRefundOk){
        return callback();
      }
      async.series({
        "update_order":function (callback) {
          OrderModel.update2(connection,{"order_id":order_id},{"status":3},callback);
        },
        "update_friendly":function (callback) {
          if(order['type']==1){
            FriendlyOrderModel.update2(connection,{"order_id":order_id},{"status":4},callback);
          }else {
            callback()
          }
        },
        "update_qualifying":function (callback) {
          if(order['type']==0||order['type']==3){
            async.auto({
              "isHome":function (callback) {
                QualifyingModel.count({"home_order_id":order_id},callback);
              },
              "isGuest":function (callback) {
                QualifyingModel.count({"guest_order_id":order_id},callback);
              },
              "change":["isHome","isGuest",function (results, callback) {
                var refund_num = 0;
                var data = {};
                if(results['isHome']){
                  data['status'] = 2;
                  data['pay_num'] = 0;
                  data['refund_num'] = 1;
                }else if(results['isGuest']){
                  data['pay_num'] = 1;
                  data['status'] = 0;
                  data['refund_num'] =2;
                }else {
                  var error = new Error("未查到排位赛退款信息");
                  return callback(error);
                }

                var params = {};

                params['__string'] = Util.format('(home_order_id=%d OR guest_order_id=%d)',order_id,order_id);
                QualifyingModel.update2(connection,params,data,callback);
              }]
            },function (err, results) {
              callback(err,results['change']);
            });
          }else {
            callback();
          }
        },
        "return_san_money":function (callback) {
          if(order['san_money']){
            async.series({
              "change_money":function (callback) {
                var data = {};
                data['san_money'] = ['san_money+',Math.abs(order['san_money'])];
                UserModel.update2(connection,{"user_id":order['user_id']},data,callback);
              },
              "add_record":function (callback) {
                var data = {
                  "uid":order['user_id'],
                  "type":4,
                  "remark":"退款",
                  "data":order_id,
                  "money":Math.abs(order['san_money'])
                };
                RecordModel.addRecord2(connection,data,callback);
              }
            },callback)
          }else {
            callback();
          }
        }
      },function (err, results) {
        if(err) return callback(err);

        callback();
      });
    }
  ],function (err) {
    if(!connection){
      if(err) return res.error(err);
      return res.success();
    }else {
      if(err){
        return connection.rollback(function () {
          connection.release();
          res.error(err);
        })
      }
      return connection.commit(function (err) {
        connection.release();
        if(err) return res.error(err);
        res.success();
      })
    }
  });
};



/*应战*/
exports.acceptBattle = function (req, res, next) {
  var user = req.user;
  var user_id = user.user_id|0;
  var now_time = moment().unix();
  var pay_type = req.data.pay_type|0;
  var fee = _.toNumber(req.data.fee);
  var san_money = _.toNumber(req.data.san_money);
  var qualifying_id = req.data.qualifying_id|0;
  var clothes_color = req.data.clothes_color;

  var old_order_id = req.data.old_order_id|0;

  var order_no = buildOrder();
  var ball_team = {};
  var order_id = 0;
  var describe = '';
  var connection = null;

  async.waterfall([
    function (callback) {
      if(san_money>user.san_money){
        var error = new Error("您的三联币不足");
        error.code = 444;
        return callback(error);
      }
      if(!clothes_color){
        var error = new Error("球衣颜色必须");
        error.code = 400;
        return callback(error);
      }
      async.auto({
        "check_ball_team":function (callback) {
          var param = {};
          param['uid'] = user_id;
          param['field'] = [
            '*',
            '(SELECT COUNT(*) FROM t_ball_team_member AS m WHERE m.ball_team_id = t_ball_team.ball_team_id) AS member_num'
          ];
          BallTeamModel.find(param,function (err, result) {
            if(_.isEmpty(result)){
              var error = new Error("你还为创建球队");
              error.code = 445;
              return callback(error);
            }
            var member_num = result['member_num']|0;
            if(member_num<5){
              var error = new Error("你的球队人数不足5人");
              error.code = 446;
              return callback(error);
            }
            ball_team = result;
            describe = Util.format("应战【%s】",ball_team.name);
            callback();
          })
        }
      },function (err) {
        callback(err);
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
        "qualifying_info":function (callback) {
          var param = {};
          var condition = {};
          param['qualifying_id'] = qualifying_id;
          condition['lock'] = 1;
          QualifyingModel.find(param,condition,callback);
        },
        "check_qualifying":["qualifying_info",function (results, callback) {
          var qualifying_info = results['qualifying_info'];
          var last_guest_join_time = qualifying_info['guest_join_time'];
          var status = qualifying_info['status'];
          var guest_team_id = qualifying_info['guest_team_id'];
          if(ball_team['ball_team_id'] == qualifying_info['home_ball_team_id']){
            var error = new Error("你不能应战自己的球队");
            error.code = 447;
            return callback(error);
          }
          if(last_guest_join_time&&(Math.abs(now_time-last_guest_join_time)<900&&status!=1)&&(guest_team_id!=ball_team['ball_team_id'])){
            var error = new Error("该队正在应战准备中,请于"+Math.abs(900+last_guest_join_time-now_time)+"秒后重试");
            error.code = 452;
            return callback(error);
          }
          if(status==1){
            var error = new Error("该队已应战");
            error.code = 448;
            return callback(error);
          }

          if(status==2){
            var error = new Error("该排位赛已取消");
            error.code = 449;
            return callback(error);
          }
          // if((fee+san_money)*2!=qualifying_info['fee']){
          //   var error = new Error("支付金额不正确");
          //   error.code = 450;
          //   return callback(error);
          // }
          if(qualifying_info['pay_num']<1){
            var error = new Error("主队未付款");
            error.code = 451;
            return callback(error);
          }
          callback();
        }],
        "del_old_order":function (callback) {
          if(!old_order_id) return callback();

          OrderModel.delete2(connection,{order_id:old_order_id},callback);
        },
        "add_order":["check_qualifying",function (results, callback) {
          var data = {
            user_id:user_id,
            price:fee,
            san_money:san_money,
            pay_type:pay_type,
            order_no:order_no,
            type:3,
            order_data:JSON.stringify(req.data)
          };
          OrderModel.addOrder2(connection,data,function (err, result) {
            if(err) return callback(err);
            order_id = result;
            callback(null,result);
          })
        }],
        "update_qualifying":["add_order",function (results, callback) {
          var data = {
            "guest_team_id":ball_team['ball_team_id'],
            "guest_order_id":order_id,
            "guest_color":clothes_color,
            "guest_join_time":now_time
          };
          QualifyingModel.update2(connection,{qualifying_id:qualifying_id},data,callback);
        }],
        "pay":["add_order","update_qualifying",function (results, callback) {

          if(fee>0){                                                            //需要RMB支付
            if(pay_type==1){                          //支付宝支付
              try {
                var request_str = AliPay.getAppRequest(order_no, fee, describe, AliConfig.CHALLENGE_NOTIFY_URL);
                return callback(null,{request_str:request_str});
              } catch (e) {
                return callback(e);
              }
            }else if(pay_type==2){                  //微信支付
              var start_time = moment().format('YYYYMMDDHHmmss');
              var client_ip = functions.getClientIp(req);
              async.waterfall([
                function (callback) {
                  WXPay.unifiedOrder(order_no,start_time,fee,describe,client_ip,WxConfig.CHALLENGE_NOTIFY_URL,callback);
                },
                function (result,callback){
                  var prepay_id = result['prepay_id'][0];
                  var data = WXPay.getAppRequest(prepay_id);
                  data['_package'] = data['package'];
                  delete data['package'];
                  callback(null,data);
                }
              ],function (err, result) {
                if(err) return callback(err);

                callback(null,result);
              });
            }else {
              var error = new Error("支付方式错误");
              error.code = 400;
              return callback(error);
            }
          }else if(san_money>0){                  //不需要RMB支付，需要三联币支付
            var record = {
              "uid":user.user_id,
              "type":3,
              "remark":"应战消费",
              "data":order_id,
              "money":-san_money
            };
            async.series([
              function (callback) {
                RecordModel.addRecord2(connection,record,callback);
              },
              function (callback) {
                var data = {
                  "san_money":["san_money -"+mysql.escape(san_money)]
                };
                UserModel.update2(connection,{user_id:user.user_id},data,callback)
              }
            ],function (err, results) {
              if(err) return callback(err);

              if(!results[0]||!results[1]){
                var error = new Error("三联币支付失败");
                return callback(error);
              }
              callback();
            });
          }else {                                 //免费
            callback();
          }
        }],
        "pay_success":["pay",function (results, callback) {
          var data = results['pay'];
          if(data){                       //需要三方支付
            return callback(null,data);
          }
          async.auto({
            "change_order":function (callback) {
              OrderModel.update2(connection,{order_id:order_id},{status:1},callback);
            },
            "change_home_team":function (callback) {
              var ball_team_id = ball_team['ball_team_id'];
              var data = {
                is_qualifying:0
              };
              BallTeamModel.update2(connection,{ball_team_id:ball_team_id},data,callback);
            },
            "change_qualifying":function (callback) {
              var data = {
                pay_num:2,
                status:1
              };
              QualifyingModel.update2(connection,{qualifying_id:qualifying_id},data,callback);
            },
            "add_point":["change_order",function (results, callback) {
              var param = {};
              var data = {};

              param['__string'] = Util.format('user_id in (%s)',_.toString(user.user_id));
              data['qualifying_point'] = ['qualifying_point+',1];
              UserModel.update2(connection,param,data,callback);
            }],
            "add_message":["change_order","change_home_team","change_qualifying","add_point",function (results, callback) {
              var data = {
                "content":Util.format('你已成功应战【%s】，请准时参加比赛',ball_team['name']),
                "target":[user.deviceuuid],
                "target_user":[user.user_id],
                "type":1,
                "ext":{
                  "msg_type":1,
                  "order_id":order_id,
                  "qualifying_id":qualifying_id
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
          },function (err) {
            callback(err);
          });
        }]
      },function (err, results) {
        var data = results['pay_success'];
        if(err){
          return connection.rollback(function () {
            connection.release();
            callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          if(err) return callback(err);

          callback(null,data);
        });
      })
    }
  ],function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  })
};

/*报名参加赛事*/
exports.enterCompetition = function (req, res, next) {
  var user = req.user;
  var user_id = user.user_id;
  var pay_type = req.data.pay_type|0;
  var competition_id = req.data.competition_id|0;
  var fee = _.toNumber(req.data.fee);
  var san_money = _.toNumber(req.data.san_money);
  var old_order_id = req.data.old_order_id|0;

  var order_no = buildOrder();
  var order_id = 0;
  var describe = '';
  var competition = {};
  var ball_team = {};
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
        "competition":function (callback) {
          var param = {};
          param['competition_id'] = competition_id;
          CompetitionModel.find(param,function (err, data) {
            if(err) return callback(err);
            competition = data;
            describe = Util.format("报名参加【%s】",data['title']);
            callback(null,data);
          });
        },
        "check_user":function (callback) {
          var param = {};
          param['uid'] = user_id;
          BallTeamModel.find(param,function (err, data) {
            if(err) return callback(err);

            ball_team = data;
            if(_.isEmpty(data)){
              var error = new Error("你还为创建自己的球队，不能报名参加赛事");
              error.code = 455;
              return callback(error);
            }
            callback();
          })
        },
        "check_joined":["check_user",function (results, callback) {
          var ball_team_id = ball_team['ball_team_id'];
          var params = {};
          params['competition_id'] = competition_id;
          params['ball_team_id'] = ball_team_id;
          params['status'] = 1;
          CompetitionBallTeam.find(params,function (err, data) {
            if(err) return callback(err);

            if(!_.isEmpty(data)){
              var error = new Error("你已参加了该赛事，不能重复报名");
              error.code = 456;
              return callback(error);
            }
            callback();
          })
        }],
        "del_old_order":function (callback) {
          if(!old_order_id) return callback();

          OrderModel.delete2(connection,{order_id:old_order_id},callback);
        },
        "del_old_competition_ballteam":["check_joined",function (results,callback) {
          // if(!old_order_id) return callback();

          var param = {};
          param['competition_id'] = competition_id;
          param['ball_team_id'] = ball_team['ball_team_id'];
          CompetitionBallTeam.delete2(connection,param,callback);
        }],
        "check_fee":["competition",function (results, callback) {
          var competition = results['competition'];
          if(competition['fee']!=fee){
            var error = new Error("报名费用不正确");
            error.code = 454;
            return callback(error);
          }
          callback();
        }],
        "add_order":["check_fee","check_user",function (results, callback) {
          var data = {
            user_id:user_id,
            price:fee,
            san_money:san_money,
            pay_type:pay_type,
            order_no:order_no,
            type:4,
            order_data:JSON.stringify(req.data)
          };
          OrderModel.addOrder2(connection,data,function (err, result) {
            if(err) return callback(err);
            order_id = result;
            callback(null,result);
          })
        }],
        "add_competiton_ballteam":["add_order","del_old_competition_ballteam",function (results, callback) {
          var order_id = results['add_order'];
          var send = results['get_send'];
          var data = {
            "user_id":user_id,
            "competition_id":competition_id,
            "order_id":order_id,
            "ball_team_id":ball_team['ball_team_id'],
            "join_time":moment().unix()
          };
          CompetitionBallTeam.addCompetitionBallteam2(connection,data,callback);
        }],
        "pay":["check_fee","add_order","del_old_order","add_competiton_ballteam",function (results, callback) {
          var competition_ballteam_id = results['add_competiton_ballteam'];
          if(fee>0){                                                            //需要RMB支付
            if(pay_type==1){                          //支付宝支付
              try {
                var request_str = AliPay.getAppRequest(order_no, fee, describe, AliConfig.ENTERCOMPETITION_NOTIFY_URL);
                return callback(null,{request_str:request_str});
              } catch (e) {
                return callback(e);
              }
            }else if(pay_type==2){                  //微信支付
              var start_time = moment().format('YYYYMMDDHHmmss');
              var client_ip = functions.getClientIp(req);
              async.waterfall([
                function (callback) {
                  WXPay.unifiedOrder(order_no,start_time,fee,describe,client_ip,WxConfig.ENTERCOMPETITION_NOTIFY_URL,callback);
                },
                function (result,callback){
                  var prepay_id = result['prepay_id'][0];
                  var data = WXPay.getAppRequest(prepay_id);
                  data['_package'] = data['package'];
                  delete data['package'];
                  callback(null,data);
                }
              ],function (err, result) {
                if(err) return callback(err);

                callback(null,result);
              });
            }else {
              var error = new Error("支付方式错误");
              error.code = 400;
              return callback(error);
            }
          }else if(san_money>0){                  //不需要RMB支付，需要三联币支付
            return callback();
            var record = {
              "uid":user.user_id,
              "type":3,
              "remark":"应战消费",
              "data":order_id,
              "money":-san_money
            };
            async.series([
              function (callback) {
                RecordModel.addRecord2(connection,record,callback);
              },
              function (callback) {
                var data = {
                  "san_money":["san_money -"+mysql.escape(san_money)]
                };
                UserModel.update2(connection,{user_id:user.user_id},data,callback)
              }
            ],function (err, results) {
              if(err) return callback(err);

              if(!results[0]||!results[1]){
                var error = new Error("三联币支付失败");
                return callback(error);
              }
              callback();
            });
          }else {                                 //免费
            async.auto({
              "update_order":function (callback) {
                OrderModel.update2(connection,{order_id:order_id},{status:1},callback);
              },
              "update_competition_ballteam":function (callback) {
                CompetitionBallTeam.update2(connection,{id:competition_ballteam_id},{status:1},callback);
              }
            },callback);
          }
        }],
      },function (err, results) {
        var data = results['pay'];
        if(err){
          return connection.rollback(function () {
            connection.release();
            callback(err);
          });
        }
        connection.commit(function (err) {
          connection.release();
          if(err) return callback(err);

          callback(null,data);
        });
      })
    }
  ],function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  })
};







