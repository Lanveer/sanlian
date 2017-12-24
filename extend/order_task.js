/**
 * Created by walter on 2016/8/16.
 * 订单任务
 */
const _ = require("lodash");
const moment = require('moment');
const async = require('async');
const Util = require('util');
var Config = require('../config');

var QualifyingModel = require('../modules/common/model').Qualifying;
var FriendlyModel = require('../modules/common/model').FriendlyOrder;
var ApplyRefundOrderModel = require('../modules/common/model').ApplyRefund;
var OrderModel = require('../modules/common/model').Order;
var RecordModel = require('../modules/common/model').Record;
var UserModel = require('../modules/common/model').User;
var buildOrder = require('../util/buidOrder');
var JPush = require('../util/jPush');
var WXPay =require('../lib/wxpay').WXPay;
var AliPay = require('../lib/alipay').AliPay;
var AliConfig = require('../lib/alipay').config;
var WxConfig = require('../lib/wxpay').config;


var refund_task = function (callback) {

    async.auto({
        "qualifying":function (callback) {
            // console.log("task is query");
            var param = {};
            var now = moment().unix();
            param['field'] = [
                'o.*'
            ];
            param['t_qualifying.status'] = 0;
            param['t_qualifying.start_time'] = ['<=',now+24*3600];
            param['join'] = [
                'join t_order AS o on t_qualifying.home_order_id = o.order_id AND o.status=1'
            ];
            QualifyingModel.select(param,callback);
        },
        "refund":["qualifying",function (results, callback) {
            var qualifying = results['qualifying'];
            // console.log(qualifying);
            async.forEachOf(qualifying,function (order, index, callback) {
                var batch_no = buildOrder();
                var connection = null;
                var user_id = order.user_id;
                var order_id = order.order_id;

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
                             "aliRefund":function (callback) {
                                 if(order['pay_type']==1&&order['price']){
                                     var data = {
                                         "order_id":order_id,
                                         "user_id":user_id,
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
                             },
                             "wxRefund":function (callback) {
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
                             },
                             "sanRefund":function ( callback) {
                                 if(!order['price']&&order['san_money']){
                                     return callback(null,1);
                                 }else {
                                     callback(null,0);
                                 }
                             }
                         },function (err, results) {
                             if(err) return callback(err);

                             if(results['wxRefund']||results['sanRefund']){
                                 return callback(null,1);
                             }else {
                                 return callback(null,0);
                             }
                         })
                    },
                    function (isRefundOk, callback) {
                        if(!isRefundOk){
                            return callback();
                        }
                        async.series({
                            "update_order":function (callback) {
                                OrderModel.update2(connection,{"order_id":order_id},{"status":3},callback);
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
                                                refund_num = 1;
                                                data['status'] = 2;
                                                data['pay_num'] = 0;
                                            }else if(results['isGuest']){
                                                refund_num = 2;
                                                data['pay_num'] = 1;
                                                data['status'] = 0;
                                            }else {
                                                var error = new Error("未查到排位赛退款信息");
                                                return callback(error);
                                            }

                                            var params = {};

                                            data['refund_num'] = ['refund_num +',refund_num];
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
                        return callback(err);
                    }else {
                        if(err){
                            return connection.rollback(function () {
                                connection.release();
                                callback(err);
                            })
                        }
                        return connection.commit(function (err) {
                            connection.release();
                            callback(err);
                        })
                    }
                })
            },callback)
        }]
    }, callback)
};
exports.refund_task = refund_task;

var status_tasks = function (callback) {
    console.log(Util.format("========== excuse order status task at %s",moment().format('YYYY-MM-DD HH:mm:ss')));
    async.auto({
        "non_refundable_friendly":function (callback) {
            console.log("============non_refundable_friendly");
            var now = moment().unix();
            var queryParam = {};
            queryParam['t_order.refund_type'] = ['=',0];
            queryParam['join'] = [
                'join t_friendly_order AS f on t_order.order_id = f.order_id AND f.start_time<='+(now+48*3600)
            ];
            OrderModel.select(queryParam,callback);
        },
        "non_refundable_qualifying":function (callback) {
            console.log("===============non_refundable_qualifying");
            var now = moment().unix();
            var queryParam = {};
            queryParam['t_order.refund_type'] = ['=',0];
            queryParam['q.start_time'] = ['<=',now+48*3600];
            // queryParam['q.start_time '] = ['>=',now];
            queryParam['join'] = [
                'join t_qualifying AS q on q.home_order_id = t_order.order_id OR q.guest_order_id = t_order.order_id'
            ];
            OrderModel.select(queryParam,callback);
        },
        "non_refundable":["non_refundable_friendly","non_refundable_qualifying",function (results, callback) {
            console.log("=================non refundable");
            var now = moment().unix();
            var order_id = [];
            var orders = _.concat(results['non_refundable_friendly'],results['non_refundable_qualifying']);
            order_id = _.map(orders,"order_id");
            // console.log(order_id);
            var queryParam = {};
            var data = {
                "refund_type":1
            };
            if(!order_id.length){
                return callback();
            }
            queryParam['order_id'] = ['in',"("+_.toString(order_id)+")"];
            queryParam['refund_type'] = ['<',3];
            OrderModel.update(queryParam,data,callback);
        }],
        "can_refundable_friendly":function (callback) {
            var now = moment().unix();
            var queryParam = {};
            queryParam['t_order.refund_type'] = ['<',3];
            queryParam['t_order.refund_type'] = ['!=',0];
            queryParam['join'] = [
                'join t_friendly_order AS f on t_order.order_id = f.order_id AND f.start_time>'+(now+48*3600)
            ];
            OrderModel.select(queryParam,callback);
        },
        "can_refundable_qualifying":function (callback) {
            var now = moment().unix();
            var queryParam = {};
            queryParam['t_order.refund_type'] = ['<',3];
            queryParam['t_order.refund_type'] = ['!=',0];
            queryParam['q.start_time'] = ['>',now+48*3600];
            queryParam['join'] = [
                'join t_qualifying AS q on q.home_order_id = t_order.order_id OR q.guest_order_id = t_order.order_id'
            ];
            OrderModel.select(queryParam,callback);
        },
        "can_refundable":["can_refundable_friendly","can_refundable_qualifying",function (results, callback) {
            var now = moment().unix();
            var order_id = [];
            var orders = _.concat(results['can_refundable_friendly'],results['can_refundable_qualifying']);
            order_id = _.map(orders,"order_id");
            var queryParam = {};
            var data = {
                "refund_type":0
            };
            if(!order_id.length){
                return callback();
            }
            queryParam['order_id'] = ['in',"("+_.toString(order_id)+")"];
            queryParam['refund_type'] = ['<',3];
            OrderModel.update(queryParam,data,callback);
        }],
        "finished_friendly_order":["non_refundable",function (result,callback) {
            console.log("============== finished_friendly_order");
            var now = moment().unix();
            var queryParam = {};
            queryParam['t_order.refund_type'] = ['<',2];
            queryParam['join'] = [
                'join t_friendly_order AS f on t_order.order_id = f.order_id AND f.end_time<='+now
            ];
            OrderModel.select(queryParam,callback);
        }],
        "finished_qualifying_order":["non_refundable",function (results,callback) {
            var now = moment().unix();
            var queryParam = {};
            queryParam['t_order.refund_type'] = ['<',2];
            queryParam['q.end_time'] = ['<=',now];
            queryParam['join'] = [
                'join t_qualifying AS q on q.home_order_id = t_order.order_id OR q.guest_order_id = t_order.order_id'
            ];
            OrderModel.select(queryParam,callback);
        }],
        "finished_order":["finished_friendly_order","finished_qualifying_order",function (results, callback) {
            console.log("===============  finished_order");
            var queryParams = {};
            var data = {
                "refund_type":2
            };
            var order_id = [];
            var orders = _.concat(results['finished_friendly_order'],results['finished_qualifying_order']);
            order_id = _.map(orders,"order_id");
            // console.log(order_id);
            if(!order_id.length){
                return callback();
            }
            queryParams['order_id'] = ['in',"("+_.toString(order_id)+")"];
            OrderModel.update(queryParams,data,callback);
        }]
    },callback);
};
exports.status_tasks = status_tasks;

/**
 * 删除未支付订单
 */
var remove_nonpay = function (callback) {
    var now = moment().unix();
    async.auto({
        "order":function (callback) {
            var queryParam = {};
            queryParam['create_time'] = ["<=",now-10*60];
            queryParam['order_id'] = ['>',14608];
            queryParam['status'] = 0;
            OrderModel.select(queryParam,callback);
        },
        "remove_order":["order",function (results, callback) {
            var order_ids = _.map(results['order'],"order_id");
            var queryParams = {};
            if(!order_ids.length){
                return callback();
            }
            queryParams['order_id'] = ["in","("+_.toString(order_ids)+")"];
            OrderModel.delete(queryParams,callback);
        }],
        "friendly":function (callback) {
            var queryParams = {};
            queryParams['friendly_order_id'] = ['>',6323];
            queryParams['join'] = [
                'join t_order AS o on t_friendly_order.order_id = o.order_id AND o.status=0 AND o.create_time <='+(now-600)
            ];
            FriendlyModel.select(queryParams,callback);
        },
        "remove_friendly":["friendly",function (results, callback) {
            var ids = _.map(results['friendly'],"friendly_order_id");
            if(!ids.length){
                return callback();
            }
            var queryParams = {};
            queryParams['friendly_order_id'] = ["in","("+ids+")"];
            FriendlyModel.delete(queryParams,callback);
        }],
        "qualifying":function (callback) {
            var queryParams = {};
            queryParams['qualifying_id'] = ['>',109];
            queryParams['join'] = [
                'join t_order AS o on t_qualifying.home_order_id = o.order_id AND o.status=0 AND o.create_time <='+(now-600)
            ];
            QualifyingModel.select(queryParams,callback);
        },
        "remove_qualifying":["qualifying",function (results, callback) {
            var ids = _.map(results['qualifying'],"qualifying_id");
            if(!ids.length){
                return callback();
            }
            var queryParams = {};
            queryParams['qualifying_id'] = ["in","("+ids+")"];
            QualifyingModel.delete(queryParams,callback);
        }]
    },callback)
};
exports.remove_nonpay = remove_nonpay;