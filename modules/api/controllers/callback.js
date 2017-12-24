/**
 * Created by walter on 2016/7/27.
 */
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const validator = require('validator');
const Util = require('util');
const xml2js = require('xml2js');
const mysql = require('mysql');

var sms = require('../../../util/sms');

var OrderModel = require('../../common/model').Order;
var RechargeModel = require('../../common/model').RechargeOrder;
var RecordModel = require('../../common/model').Record;
var UserModel = require('../../common/model').User;
var FriendlyOrderModel = require('../../common/model').FriendlyOrder;
var QualifyingModel = require('../../common/model').Qualifying;
var BallTeamModel = require('../../common/model').BallTeam;
var CourtModel = require('../../common/model').Court;
var MessageModel = require('../../common/model').Message;
var CompetitionBallTeam = require('../../common/model').CompetitionBallteam;
var AdminUser = require('../../common/model').AdminUser;


var JPush = require('../../../util/jPush');
var WxPay = require('../../../lib/wxpay').WXPay;
var AliPay = require('../../../lib/alipay').AliPay;


/*支付宝付款*/
exports.aliPayPay = function (req, res, next) {
  var data = req.data;
  // console.log(data);
  Redis.set('alipayPay:'+moment().format("MM-DD HH:mm:ss"),JSON.stringify(data).toString(),'EX',1800);
  // return res.end("hihih");
  var check_verify = AliPay.verifySign(data,data['sign']);
  if(!check_verify){
    return res.end("verify fail,please retry");
  }
  var order_no = data['out_trade_no'];
  var trade_no = data['trade_no'];
  var trade_status = 0;
  if(data['trade_status']=='WAIT_BUYER_PAY'){
    return res.end("success");
  }
  if(data['trade_status']=='TRADE_SUCCESS'||data['trade_status']=='TRADE_FINISHED'){
    trade_status = 1;
  }else {
    trade_status = 0;
  }
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
      pay(connection,order_no,trade_no,trade_status,callback);
    }
  ],function (err) {
    console.log(err);
    if(err) return res.end("fail");

    res.end("success");
  })
};

/*微信付款*/
exports.wxPay = function (req, res, next) {
  var xml = req.body;
  Redis.set('wxRecharge:'+moment().format("MM-DD HH:mm:ss"),(xml),'EX',1800);
  var request = {};
  var order_no;
  var trade_no;
  var trade_status = 0;
  var connection = null;
  async.waterfall([
    function (callback) {
      WxPay.toObject(xml,function (err,data) {
        if(err) return callback(err);
        request = data['xml'];
        callback();
      })
    },
    function (callback) {
      if(request['return_code'][0]=='SUCCESS'){
        trade_status = 1;
      }
      order_no = request['out_trade_no'][0];
      trade_no = request['transaction_id'][0];
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
      pay(connection,order_no,trade_no,trade_status,callback);
    }
  ],function (err) {
    var response=  {};
    if(err){
      response['return_code'] = 'FAIL';
      response['return_msg'] = err.message;
    }else {
      response['return_code'] = 'SUCCESS';
      response['return_msg'] = 'OK';
    }
    res.end(WxPay.toXML(response));
  })
};

/*微信充值*/
exports.wxRecharge = function (req, res, next) {
  var xml = req.body;
  // Redis.set('wxRecharge:'+moment().format("MM-DD HH:mm:ss"),(data),'EX',1800);
  var request = {};
  var order_no;
  var trade_no;
  var trade_status = 0;
  var connection = null;
  async.waterfall([
    function (callback) {
      WxPay.toObject(xml,function (err,data) {
        if(err) return callback(err);
        request = data['xml'];
        callback();
      })
    },
    function (callback) {
      if(request['return_code'][0]=='SUCCESS'){
        trade_status = 1;
      }
      order_no = request['out_trade_no'][0];
      trade_no = request['transaction_id'][0];
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
      recharge(connection,order_no,trade_no,trade_status,callback);
    }
  ],function (err) {
    var response=  {};
    if(err){
      response['return_code'] = 'FAIL';
      response['return_msg'] = err.message;
    }else {
      response['return_code'] = 'SUCCESS';
      response['return_msg'] = 'OK';
    }
    res.end(WxPay.toXML(response));
  })
};


/*支付宝充值*/
exports.alipayRecharge = function (req, res, next) {
  var data = req.data;
  // Redis.set('alipayRecharge:'+moment().format("MM-DD HH:mm:ss"),JSON.stringify(data).toString(),'EX',1800);
  var check_verify = AliPay.verifySign(data,data['sign']);
  if(!check_verify){
    return res.end("verify fail,please retry");
  }
  var order_no = data['out_trade_no'];
  var trade_no = data['trade_no'];
  var trade_status = 0;
  if(data['trade_status']=='WAIT_BUYER_PAY'){
    return res.end("success");
  }
  if(data['trade_status']=='TRADE_SUCCESS'||data['trade_status']=='TRADE_FINISHED'){
    trade_status = 1;
  }else {
    trade_status = 0;
  }
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
      recharge(connection,order_no,trade_no,trade_status,callback);
    }
  ],function (err) {
    if(err) return res.end("fail");

    res.end("success");
  })
};


/*微信支付应战*/
exports.wxChallenge = function (req, res, next) {
  var xml = req.body;
  // Redis.set('wxChallenge:'+moment().format("MM-DD HH:mm:ss"),(data),'EX',1800);
  var request = {};
  var order_no;
  var trade_no;
  var trade_status = 0;
  var connection = null;
  async.waterfall([
    function (callback) {
      WxPay.toObject(xml,function (err,data) {
        if(err) return callback(err);
        request = data['xml'];
        callback();
      })
    },
    function (callback) {
      if(request['return_code'][0]=='SUCCESS'){
        trade_status = 1;
      }
      order_no = request['out_trade_no'][0];
      trade_no = request['transaction_id'][0];
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
      challenge(connection,order_no,trade_no,trade_status,callback);
    }
  ],function (err) {
    var response=  {};
    if(err){
      response['return_code'] = 'FAIL';
      response['return_msg'] = err.message;
    }else {
      response['return_code'] = 'SUCCESS';
      response['return_msg'] = 'OK';
    }
    res.end(WxPay.toXML(response));
  })
};

/*支付宝应战*/
exports.alipayChallenge = function (req, res, next) {
  var data = req.data;
  // Redis.set('alipayChallenge:'+moment().format("MM-DD HH:mm:ss"),JSON.stringify(data).toString(),'EX',1800);
  var check_verify = AliPay.verifySign(data,data['sign']);
  if(!check_verify){
    return res.end("verify fail,please retry");
  }
  var order_no = data['out_trade_no'];
  var trade_no = data['trade_no'];
  var trade_status = 0;
  if(data['trade_status']=='WAIT_BUYER_PAY'){
    return res.end("success");
  }
  if(data['trade_status']=='TRADE_SUCCESS'||data['trade_status']=='TRADE_FINISHED'){
    trade_status = 1;
  }else {
    trade_status = 0;
  }
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
      challenge(connection,order_no,trade_no,trade_status,callback);
    }
  ],function (err) {
    if(err) return res.end("fail");

    res.end("success");
  })
};

/*报名赛事微信回调*/
exports.wxEnterCompetition = function (req, res, next) {
  var xml = req.body;
  // Redis.set('wxChallenge:'+moment().format("MM-DD HH:mm:ss"),(xml),'EX',1800);
  var request = {};
  var order_no;
  var trade_no;
  var trade_status = 0;
  var connection = null;
  async.waterfall([
    function (callback) {
      WxPay.toObject(xml,function (err,data) {
        if(err) return callback(err);
        request = data['xml'];
        callback();
      })
    },
    function (callback) {
      if(request['return_code'][0]=='SUCCESS'){
        trade_status = 1;
      }
      order_no = request['out_trade_no'][0];
      trade_no = request['transaction_id'][0];
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
      enterCompetition(connection,order_no,trade_no,trade_status,callback);
    }
  ],function (err) {
    var response=  {};
    if(err){
      response['return_code'] = 'FAIL';
      response['return_msg'] = err.message;
    }else {
      response['return_code'] = 'SUCCESS';
      response['return_msg'] = 'OK';
    }
    res.end(WxPay.toXML(response));
  })
};

/*报名赛事支付宝回调*/
exports.alipayEnterCompetition = function (req, res, next) {
  var data = req.data;
  // Redis.set('alipayChallenge:'+moment().format("MM-DD HH:mm:ss"),JSON.stringify(data).toString(),'EX',1800);
  var check_verify = AliPay.verifySign(data,data['sign']);
  if(!check_verify){
    return res.end("verify fail,please retry");
  }
  
  var order_no = data['out_trade_no'];
  var trade_no = data['trade_no'];
  var trade_status = 0;
  if(data['trade_status']=='WAIT_BUYER_PAY'){
    return res.end("success");
  }
  if(data['trade_status']=='TRADE_SUCCESS'||data['trade_status']=='TRADE_FINISHED'){
    trade_status = 1;
  }else {
    trade_status = 0;
  }
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
      enterCompetition(connection,order_no,trade_no,trade_status,callback);
    }
  ],function (err) {
    if(err) return res.end("fail");

    res.end("success");
  })
};

/**
 * 报名参加赛事
 * @param connection
 * @param order_no
 * @param trade_no
 * @param trade_status
 * @param callback
 */
function enterCompetition(connection, order_no, trade_no, trade_status, callback) {
  var user_id = 0;
  var order_id = 0;
  var user = {};
  var ball_team = {};

  async.auto({
    "order_info":function (callback) {
      var params = {"order_no":order_no};
      OrderModel.find(params,function (err, data) {
        if(err) return callback(err);
        if(_.isEmpty(data)){
          var error = new Error("该订单不存在");
          return callback(error);
        }
        if(data['status']==1&&data['trade_no']){
          var error = new Error("该订单已操作");
          return callback(error);
        }
        order_id = data['order_id']|0;
        return callback(null,data);
      });
    },
    "userInfo":["order_info",function (results, callback) {
      var order = results['order_info'];
      var user_id = order['user_id'];
      UserModel.find({user_id:user_id},function (err, data) {
        user = data;
        callback(err,data);
      });
    }],
    "competition_ballteam":["order_info",function (results, callback) {
      var params = {};
      params['order_id'] = order_id;
      params['field'] = 't_competition_ballteam.*,c.title AS competition_title,c.img AS competition_img';
      params['join'] = [
          'join t_competition AS c on t_competition_ballteam.competition_id = c.competition_id'
      ];
      CompetitionBallTeam.find(params,function (err, data) {
        if(err) return callback(err);
        ball_team  =data;
        callback(null,data);
      });
    }],
    "change_order":["order_info",function (results,callback) {
      if(!trade_status){
        return callback();
      }
      var data ={
        "status":1,
        "trade_no":trade_no
      };
      OrderModel.update2(connection,{order_id:order_id},data,callback);
    }],
    "change_competition_team":["order_info",function (results,callback) {
      if(!trade_status){
        return callback();
      }
      var data = {
        status:1
      };
      CompetitionBallTeam.update2(connection,{order_id:order_id},data,callback);
    }],
    "add_point":["userInfo",function (results, callback) {
      var param = {};
      var data = {};

      param['__string'] = Util.format('user_id in (%s)',_.toString(user.user_id));
      data['ball_team_point'] = ['ball_team_point+',1];
      UserModel.update2(connection,param,data,callback);
    }],
    "add_message":["change_order","change_competition_team","userInfo","competition_ballteam","add_point",function (results, callback) {
      if(!trade_status){
        return callback();
      }
      var data = {
        "content":Util.format('你已成功报名【%s】',ball_team['competition_title']),
        "target":[user.deviceuuid],
        "target_user":[user.user_id],
        "type":3,
        "ext":{
          "msg_type":3,
          "type":7,
          "order_id":order_id,
          "competition_id":ball_team['competition_id'],
          "competition_title":ball_team['competition_title'],
          "competition_img":ball_team['competition_img']
        }
      };
      MessageModel.create(data,callback);
    }],
    "send_message":["add_message",function (results, callback) {
      if(!trade_status){
        return callback();
      }
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
      if(err) return callback(err);

      callback();
    });
  })
}

/**
 * 应战
 * @param connection
 * @param order_no
 * @param trade_no
 * @param trade_status
 * @param callback
 */
function challenge(connection, order_no, trade_no, trade_status, callback) {
  var ball_team_id = 0;
  var order_id = 0;
  var qualifying_id = 0;
  var ball_team = {};
  async.auto({
    "order_info":function (callback) {
      var params = {"order_no":order_no};
      OrderModel.find(params,function (err, data) {
        if(err) return callback(err);
        if(_.isEmpty(data)){
          var error = new Error("该订单不存在");
          return callback(error);
        }
        if(data['status']==1&&data['trade_no']){
          var error = new Error("该订单已操作");
          return callback(error);
        }
        order_id = data['order_id']|0;
        return callback(null,data);
      });
    },
    "userInfo":["order_info",function (results, callback) {
      var order = results['order_info'];
      var user_id = order['user_id'];
      UserModel.find({user_id:user_id},callback);
    }],
    "qualifying_info":["order_info",function (results, callback) {
      var param = {};
      param['guest_order_id'] = order_id;
      QualifyingModel.find(param,callback);
    }],
    "ball_team":["qualifying_info",function (results, callback) {
      var qualifying_info = results['qualifying_info'];
      ball_team_id = qualifying_info['home_team_id'];
      BallTeamModel.find({ball_team_id:ball_team_id},function (err, data) {
        if(err) return callback(err);
        ball_team = data;
        callback(null,data);
      });
    }],
    "change_order":["order_info",function (results,callback) {
      if(!trade_status){
        return callback();
      }
      var data ={
        "status":1,
        "trade_no":trade_no
      };
      OrderModel.update2(connection,{order_id:order_id},data,callback);
    }],
    "change_home_team":["ball_team",function (results,callback) {
      if(!trade_status){
        return callback();
      }
      var ball_team_id = ball_team['ball_team_id'];
      var data = {
        is_qualifying:0
      };
      BallTeamModel.update2(connection,{ball_team_id:ball_team_id},data,callback);
    }],
    "san_money":["order_info",function (results, callback) {
      if(!trade_status){
        return callback();
      }
      var order_info = results['order_info'];
      var user_id = order_info['user_id'];
      var san_money = order_info['san_money'];
      if(!san_money){
        return callback();
      }
      var record = {
        "uid":user_id,
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
          UserModel.update2(connection,{user_id:user_id},data,callback)
        }
      ],function (err, results) {
        if(err) return callback(err);

        if(!results[0]||!results[1]){
          var error = new Error("三联币支付失败");
          return callback(error);
        }
        callback();
      });
    }],
    "change_qualifying":["qualifying_info",function (results,callback) {
      if(!trade_status){
        return callback();
      }
      qualifying_id = results['qualifying_info']['qualifying_id'];
      var data = {
        pay_num:2,
        status:1
      };
      QualifyingModel.update2(connection,{qualifying_id:qualifying_id},data,callback);
    }],
    "add_point":["userInfo",function (results, callback) {
      var user = results['userInfo'];
      var param = {};
      var data = {};

      param['__string'] = Util.format('user_id in (%s)',_.toString(user.user_id));
      data['qualifying_point'] = ['qualifying_point+',1];
      UserModel.update2(connection,param,data,callback);
    }],
    "add_message":["change_order","change_home_team","change_qualifying","san_money","userInfo","add_point",function (results, callback) {
      var user = results['userInfo'];
      if(!trade_status){
        return callback();
      }
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
      if(!trade_status){
        return callback();
      }
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
      if(err) return callback(err);

      callback();
    });
  })
}


/**
 * 充值
 * @param connection 链接句柄
 * @param order_no 订单号
 * @param trade_no  交易号
 * @param trade_status  交易状态
 * @param callback
 */
function recharge(connection,order_no,trade_no,trade_status,callback) {
  async.auto({
    "order_info":function (callback) {
      var params = {"order_no":order_no};
      OrderModel.find(params,function (err, data) {
        if(err) return callback(err);
        if(_.isEmpty(data)){
          var error = new Error("该订单不存在");
          return callback(error);
        }
        if(data['status']==1&&data['trade_no']){
          var error = new Error("该订单已操作");
          return callback(error);
        }
        return callback(null,data);
      });
    },
    "recharge_info":["order_info",function (results, callback) {
      var order_info = results['order_info'];
      var order_id = order_info['order_id'];
      RechargeModel.find({order_id:order_id},callback);
    }],
    "change_order":["recharge_info",function (results, callback) {
      var recharge_info = results['recharge_info'];
      var order_id = recharge_info['order_id'];
      if(trade_status!=1){
        return callback();
      }
      var data = {
        "status":1,
        "trade_no":trade_no
      };
      OrderModel.update2(connection,{order_id:order_id},data,callback);
    }],
    "change_recharge":["recharge_info",function (results, callback) {
      var recharge_info = results['recharge_info'];
      if(trade_status!=1){
        return callback();
      }
      RechargeModel.update2(connection,{id:recharge_info['id']},{status:1},callback);
    }],
    "add_record":["recharge_info",function (results, callback) {
      var recharge_info = results['recharge_info'];
      var order_id = recharge_info['order_id'];
      if(trade_status!=1){
        return callback();
      }
      var data = {
        "type":1,
        "remark":"充值",
        "data":order_id,
        "uid":recharge_info['user_id'],
        "money":recharge_info['money']
      };
      RecordModel.addRecord2(connection,data,callback);
    }],
    "add_send_record":["recharge_info",function (results, callback) {
      return callback();
      var recharge_info = results['recharge_info'];
      var order_id = recharge_info['order_id'];
      if(trade_status!=1||!recharge_info['send']){
        return callback();
      }
      var data = {
        "type":2,
        "remark":"充值赠送",
        "data":order_id,
        "uid":recharge_info['user_id'],
        "money":recharge_info['send']
      };
      RecordModel.addRecord2(connection,data,callback);
    }],
    "change_wallet":["recharge_info",function (results, callback) {
      var recharge_info = results['recharge_info'];
      var order_id = recharge_info['order_id'];
      var money = recharge_info['money'];
      var user_id = recharge_info['user_id'];
      if(trade_status!=1){
        return callback();
      }
      var data = {};
      data['san_money'] = ['san_money+',money];
      data['recharge_money'] = ['recharge_money+',recharge_info['money']];
      UserModel.update2(connection,{user_id:user_id},data,callback);
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

      callback();
    });
  })
}


/**
 * 订场付款
 * @param connection
 * @param order_no
 * @param trade_no
 * @param trade_status
 * @param callback
 */
function pay(connection,order_no,trade_no,trade_status,callback) {
  var order_id = null;
  var time_zones = [];
  var game_type = 0;
  var ball_team_id = 0;
  var court_id = 0;
  async.auto({
    "order_info":function (callback) {
      var params = {"order_no":order_no};
      OrderModel.find(params,function (err, data) {
        if(err) return callback(err);
        if(_.isEmpty(data)){
          var error = new Error("该订单不存在");
          return callback(error);
        }
        var status = data['status']|0;
        if(status>0||data['trade_no']){
          var error = new Error("该订单已操作");
          return callback(error);
        }
        order_id = data['order_id']|0;
        game_type = data['type'];
        return callback(null,data);
      });
    },
    "friendly":["order_info",function (results, callback) {
      FriendlyOrderModel.select({order_id:order_id},function (err, data) {
        if(err) return callback(err);

        if(!_.isEmpty(data)){
          _.forEach(data,function (value) {
            var time_zone = {};
            time_zone['son_order_id'] = value['friendly_order_id'];
            time_zone['start_time'] = value['start_time'];
            time_zone['end_time'] = value['end_time'];
            time_zones.push(time_zone);
            court_id = value['court_id'];
          });
        }

        callback(null,data);
      })
    }],
    "qualifying":["order_info",function (results, callback) {
      QualifyingModel.select({home_order_id:order_id},function (err,data) {
        if(err) return callback(err);

        if(!_.isEmpty(data)){
          _.forEach(data,function (value) {
            var time_zone = {};
            time_zone['son_order_id'] = value['qualifying_id'];
            time_zone['start_time'] = value['start_time'];
            time_zone['end_time'] = value['end_time'];
            time_zones.push(time_zone);
            ball_team_id = value['home_team_id'];
            court_id = value['court_id'];
          });
        }

        callback(null,data);
      })
    }],
    "change_status":["friendly","qualifying",function (results, callback) {
      if(trade_status!=1){
        return callback();
      }
      async.forEachOf(time_zones,function (time_zone, index, callback) {
        async.auto({
          "change_order":function (callback) {
            var data ={
              "status":1,
              "trade_no":trade_no
            };
            console.log("====修改订单支付完成状态");
            OrderModel.update2(connection,{order_id:order_id},data,function (err, result) {
              if(result===false){
                var error = new Error("修改订单支付完成状态失败");
                return callback(error);
              }
              callback();
            });
          },
          "change_ballTeam_status":function (callback) {
            if(game_type==0){
              console.log("====修改球队应战状态");
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
                  console.log("====修改排位赛支付状态");
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
              console.log("====修改友谊赛支付状态");
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
        },callback);
      },callback)
    }],
    "san_money":["order_info",function (results, callback) {
      var order_info = results['order_info'];
      var user_id = order_info['user_id'];
      var san_money = order_info['san_money'];
      if(!san_money){
        return callback();
      }
      var record = {
        "uid":user_id,
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
          
          console.log("====用户扣三联币");
          UserModel.update2(connection,{user_id:user_id},data,callback)
        }
      ],function (err, results) {
        if(err) return callback(err);

        if(!results[0]||!results[1]){
          var error = new Error("三联币支付失败");
          return callback(error);
        }
        callback();
      });
    }],
    "court_info":["change_status",function (results,callback) {
      var params = {};
      params['field'] = 't_court.venue_id,v.address as venue_address,v.name as venue_name,t_court.name as court_name,t_court.address as court_address';
      params['join'] = ['join t_venue as v on v.venue_id = t_court.venue_id'];
      params['court_id'] = court_id;
      CourtModel.find(params,callback);
    }],
    "ballTeamInfo":["change_status",function (results, callback) {
      if(game_type==1){
        return callback();
      }
      BallTeamModel.getById(ball_team_id,callback);
    }],
    "userInfo":["order_info",function (results, callback) {
      var order = results['order_info'];
      var user_id = order['user_id'];
      UserModel.find({user_id:user_id},callback);
    }],
    "court_admin":["court_info",function (results, callback) {
      var courtInfo = results['court_info'];
      var venue_id = courtInfo['venue_id'];
      AdminUser.find({"venue_id":venue_id},callback);
    }],
    "add_point":["userInfo","ballTeamInfo",function (results, callback) {
      var user = results['userInfo'];
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
      
      console.log("====更新用户消息点数");
      UserModel.update2(connection,param,data,callback);
    }],
    "add_message":["court_info","userInfo","san_money","change_status","add_point","ballTeamInfo",function (results, callback) {

      var court_info = results['court_info'];
      var user = results['userInfo'];
      var order_day = moment.unix(time_zones[0]['start_time']).format('YYYY-MM-DD');
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
      console.log("====消息存MongoDB");
      MessageModel.create(data,callback);
    }],
    "send_message":["add_message",function (results, callback) {
      var message = results['add_message'];
      JPush.sendToSomeone(message['target'],message['content'],message['ext'],function (err, data) {
        console.log("====sendJPush");
        callback();
      });
    }],
    "send_sms":["add_message","court_admin","userInfo",function (results, callback) {
      var courtAdmin = results['court_admin'];
      var user = results['userInfo'];
      if(!_.isEmpty(courtAdmin)){
        console.log(courtAdmin);
        try {
          sms.sendToManager(courtAdmin['phone'], courtAdmin['name'], user['phone'], function (err) {
            console.log("====sendSMS");
            callback();
          })
        } catch (e) {
          console.log("====SMS catch error");
          callback();
        }
      }else {
        return callback();
      }
    }]
  },function (err, results) {
    console.log(err);
    if(err){
      return connection.rollback(function () {
        connection.release();
        callback(err);
      });
    }
    connection.commit(function (err) {
      connection.release();
      if(err) return callback(err);

      callback();
    });
  })
}
