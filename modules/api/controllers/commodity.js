/**
 * Created by walter on 2017/1/5.
 */
const _ = require('lodash');
const async = require('async');
const util = require('util');
const moment = require('moment');
const mysql = require('mysql');

var buildOrder = require('../../../util/buidOrder');
var User = require('../../common/model').User;
var Commodity = require('../../common/model').Commodity;
var CommodityOrder = require("../../common/model").CommodityOrder;
var HotPointRecord = require('../../common/model').HotPointRecord;
var BallTeam = require('../../common/model').BallTeam;

/*个人热点商品*/
exports.userCommodity = function (req, res, next) {
    var queryParams = req.data;
    queryParams['type'] = 0;
    queryParams['limit'] = 0;
    queryParams['status'] = 1;
    Commodity.search(queryParams,function (err, result) {
        if(err) return res.error(err);

        var data = result['data'];
        res.success(data);
    })
};

/*球队热点商品*/
exports.ballTeamCommodity = function (req, res, next) {
    var queryParams = req.data;
    queryParams['type'] = 1;
    queryParams['status'] = 1;
    Commodity.search(queryParams,function (err, result) {
        if(err) return res.error(err);

        var data = result['data'];
        res.success(data);
    })
};

/*商品详情*/
exports.commodityInfo = function (req, res, next) {
    var commodity_id = req.data.id|0;
    async.auto({
        "commodity":function (callback) {
            Commodity.find({id:commodity_id},function (err, data) {
                if(err) return callback(err);

                if(!_.isEmpty(data)){
                    if(!_.isEmpty(data.img)){
                        data.imgs = _.split(data.img,',');
                    }else {
                        data.imgs = [];
                    }
                }
                callback(null,data);
            });
        }
    },function (err, results) {
        if(err) return res.error(err);

        var data  = results['commodity'];
        res.success(data);
    })
};

/*购买商品*/
exports.buyCommodity = function (req, res, next) {
    var commodity_id = req.data.commodity_id|0;
    var user = req.user;
    var connection = null;
    async.auto({
        "get_connect":function (callback) {
            Mysql.master.getConnection(function (err, connect) {
                if(err) return callback(err);
                connection = connect;
                callback();
            });
        },
        "begin_trans":["get_connect",function (result, callback) {
            connection.beginTransaction(function (err) {
                if(err){
                    connection.release();
                    connection = null;
                    return callback(err);
                }
                callback();
            })
        }],
        "commodity":["begin_trans",function (results,callback) {
            var query = {id:commodity_id};
            var condition = {"lock":1};
            Commodity.find2(connection,query,condition,function (err, data) {
                if(err) return callback(err);

                if(_.isEmpty(data)){
                    var error = new Error("该商品不存在");
                    error.code = 460;
                    return callback(error);
                }
                callback(null,data);
            })
        }],
        "ball_team":["commodity",function (results, callback) {
            var commodity = results['commodity'];
            if(commodity.type==0){
                return callback();
            }
            var query = {uid:user.user_id};
            BallTeam.find(query,callback);
        }],
        "check_ball_team":["ball_team",function (results, callback) {
            var commodity = results['commodity'];
            if(commodity.type==0){
                return callback();
            }
            var ball_team = results['ball_team'];
            if(_.isEmpty(ball_team)){
                var error = new Error("您未创建球队，不能兑换球队商品");
                error.code = 463;
                return callback(error);
            }
            if(commodity.hot_point>ball_team.hot_point){
                var error = new Error(util.format("您的球队热点剩余%d点，不足以支付",ball_team.hot_point));
                error.code = 461;
                return callback(error);
            }
            callback();
        }],
        "check_user":["commodity",function (results, callback) {
            var commodity = results['commodity'];
            if(commodity.type==1){
                return callback();
            }
            if(commodity.hot_point>user.hot_point){
                var error = new Error(util.format("您的热点剩余%d点，不足以支付",user.hot_point));
                error.code = 461;
                return callback(error);
            }
            callback();
        }],
        "check_commodity":["commodity",function (results, callback) {
            var commodity = results['commodity'];
            if(commodity.status==0){
                var error = new Error("该商品已下架");
                error.code = 464;
                return callback(error);
            }
           
            if(commodity.number==0){
                var error = new Error("商品库存数量不足");
                error.code = 462;
                return callback(error);
            }
            callback();
        }],
        "add_order":["check_commodity","check_ball_team","check_user",function (results, callback) {
            var commodity = results['commodity'];
            var order_no = buildOrder();
            var data = {
                "order_no":order_no,
                "user_id":user.user_id,
                "commodity_id":commodity.id,
                "ball_team_id":user.cur_ballteam_id|0,
                "consignee":req.data.consignee,
                "mobile":req.data.mobile,
                "province":req.data.province,
                "address":req.data.address,
                "number":1
            };
            CommodityOrder.addCommodityOrder2(connection,data,callback);
        }],
        "dec_user_hot_point":["check_commodity","check_user",function (results, callback) {
            var commodity = results['commodity'];
            if(commodity.type==1){
                return callback();
            }
            var data = {};
            data['hot_point'] = ['hot_point-',commodity.hot_point];
            User.update2(connection,{"user_id":user.user_id},data,callback);
        }],
        "dec_ballTeam_hot_point":["check_commodity","check_ball_team",function (results, callback) {
            var commodity = results['commodity'];
            if(commodity.type==0){
                return callback();
            }
            var ball_team = results['ball_team'];
            var data = {};
            data['hot_point'] = ['hot_point-',commodity.hot_point];
            BallTeam.update2(connection,{"ball_team_id":ball_team.ball_team_id},data,callback);
        }],
        "dec_commodity_number":["check_commodity",function (results, callback) {
            var commodity = results['commodity'];
            if(commodity.number<0){
                return callback();
            }
            var data = {};
            data['number'] = ['number-',1];
            Commodity.update2(connection,{"id":commodity.id},data,callback);
        }],
        "add_hotpoint_record":["add_order",function (results, callback) {
            var order_id = results['add_order'];
            var commodity = results['commodity'];
            if(commodity.type==1){
                return callback();
            }
            var data = {
                "user_id":user.user_id,
                "hot_point":-commodity.hot_point,
                "type":3,
                "remark":util.format("兑换[%s]",commodity.title),
                "data":order_id,
                "last_hot_point":user.hot_point
            };
            HotPointRecord.addRecord2(connection,data,callback);
        }],
        "commit":["add_order","dec_user_hot_point","dec_commodity_number","add_hotpoint_record","dec_ballTeam_hot_point",function (results, callback) {
            connection.commit(function (err) {
                connection.release();
                return callback(err);
            });
        }]
    },function (err, results) {
        if(err){
            if(connection!=null){
                return connection.rollback(function () {
                    connection.release();
                    res.error(err);
                })
            }
            return res.error(err);
        }
        res.success();
    })
};

/*商品兑换列表*/
exports.commodityOrderList = function (req, res, next) {
    var user = req.user;
    var queryParams = req.data;

    queryParams['user_id'] = user.user_id;
    async.auto({
        "commodity_order":function (callback) {
            CommodityOrder.search(queryParams,function (err, result) {
                if(err) return callback(err);

                var data = result['data'];
                callback(null,data);
            })
        },
        "commodity":["commodity_order",function (results, callback) {
            var orders = results['commodity_order'];
            async.forEachOf(orders,function (order, index, callback) {
                var query = {
                    "id":order.commodity_id
                };
                Commodity.find(query,function (err, data) {
                    if(err) return callback(err);
                    
                    orders[index]['commodity'] = data;
                    callback();
                });
            },function (err) {
                if(err) return callback(err);
                callback(null,orders);
            });
        }]
    },function (err, results) {
        if(err) return res.error(err);
        
        var data = results['commodity'];
        res.success(data);
    })
};