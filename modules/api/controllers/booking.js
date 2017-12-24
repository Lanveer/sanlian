/**
 * Created by walter on 2016/6/27.
 */
const _ = require('lodash');
const async = require('async');
const Util = require('util');
const moment = require('moment');
const mysql = require('mysql');
var Venue = require('../../common/model').Venue;
var Court = require('../../common/model').Court;
var Once = require('../../common/model').Once;
var Vip = require('../../common/model').Vip;
var Qualifying = require('../../common/model').Qualifying;
var FriendlyOrder = require('../../common/model').FriendlyOrder;
var UserModel = require('../../common/model').User;
var BallTeamModel = require('../../common/model').BallTeam;
var VenueAppraise = require('../../common/model').VenueAppraise;
var UserAttentionModel = require('../../common/model').UserAttention;
var CloseOnceModel = require('../../common/model').CloseOnce;
var VenueVipModel = require('../../common/model').VenueVip;
var VenueRefereeModel = require('../../common/model').VenueReferee;
var RefereeModel = require('../../common/model').Referee;

/*场馆列表*/
exports.venueList = function (req, res, next) {
  var now = moment().unix();
  var queryParams = req.data;
  var lng = req.data['lng'];            //经度
  var lat = req.data['lat'];            //纬度
  queryParams['lat'] = undefined;
  queryParams['lng'] = undefined;
  queryParams['field'] = Util.format('t_venue.*,ROUND(appraise_grade/appraise_num,2) AS appraise,gps_distance(%d,%d,lng,lat) AS distance',lng,lat);
  queryParams['order'] = 'set_pos desc,';
  queryParams['sort'] = 'distance asc';
  queryParams['is_freeze'] = 0;
  // console.log(queryParams);
  Venue.search(queryParams,function (err, data) {
    if(err) return res.error(err);
    if(!_.isEmpty(data)){
      async.forEachOf(data,function (value, index, callback) {
        var is_discount = 0;
        Court.select({"venue_id":value.venue_id},function (err, courts) {
          if(err) return callback(err);

          async.forEachOf(courts,function (court, i,callback) {
            Once.select({"court_id":court.court_id},function (err, onces) {
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
        if(err) return res.error(err);
        res.success(data);
      });
    }else {
      res.success();
    }
  })
};

/*球场列表*/
exports.courtList = function (req, res, next) {
  var now = moment().unix();
  var queryParams = req.data;
  var lng = req.data['lng'];            //经度
  var lat = req.data['lat'];            //纬度
  queryParams['lat'] = undefined;
  queryParams['lng'] = undefined;

  queryParams['field'] = Util.format('t_court.*,gps_distance(%d,%d,lng,lat) AS distance',lng,lat);
  queryParams['order'] = Court.primary_key;
  queryParams['sort'] = 'asc';
  queryParams['is_freeze'] = 0;

  async.waterfall([
    function (callback) {
      Court.search(queryParams,callback);
    },
    function (courts, callback) {
      async.forEachOf(courts,function (court, index,callback) {
        var is_discount = 0;
        Once.select({"court_id":court.court_id},function (err, onces) {
          if(err) return callback(err);
          _.forEach(onces,function (once) {
            if(once['discount_start_time']&&once['discount_end_time']&&now>=once['discount_start_time']&&now<=once['discount_end_time']){
              is_discount = 1;
              return false;
            }
          });
          courts[index]['is_discount'] = is_discount;
          callback();
        });
      },function (err) {
        if(err) return callback(err);

        callback(null,courts);
      });
    }
  ],function (err, data) {
    if(err) return res.error(err);
    res.success(data);
  });
};

/*球场详情*/
exports.courtInfo = function (req, res, next) {
  var now = moment().unix();
  var queryParams = req.data;
  var user_id = req.user.user_id;

  // async.waterfall([
  //   function (callback) {
  //     Court.find(queryParams,callback);
  //   },
  //   function (court, callback) {
  //     var param = {venue_id:court.venue_id|0};
  //     param['field'] = 'phone,is_park,is_rest,is_camera,intro';
  //     Venue.find(param,function (err, venue) {
  //       court['venue'] = venue;
  //     })
  //   }
  // ]);
  
  async.auto({
    "court":function (callback) {
      Court.getById(queryParams['court_id'],callback);
    },
    "venue":["court",function (results, callback) {
      var court = results['court'];
      var param = {venue_id:court.venue_id|0};
      param['field'] = 'venue_id,phone,is_park,is_rest,is_camera,intro,is_referee,bus_line';
      Venue.find(param,callback);
    }],
    "vip":function (callback) {
      Vip.find({level:req.user.vip_id|0},callback);
    },
    "total_match":["court","vip",function (results, callback) {
      var court = results['court'];
      var vip = results['vip'];
      var pre_order_day = vip['pre_order_day'];         //可提前预定

      Once.count({"court_id":court.court_id},function (err, count) {
        if(err) return callback(err);

        callback(null,count*pre_order_day);
      });
    }],
    "qualifying_match":["court","vip",function (results, callback) {
      var court = results['court'];
      var vip = results['vip'];
      var pre_order_day = vip['pre_order_day']|0;         //可提前预定
      var queryParam = {court_id:court.court_id|0};
      queryParam['start_time'] = ['>=',now];
      queryParam['end_time'] = ['<=',now+pre_order_day*3600*24];
      queryParam['__string'] = '(refund_num!=1 AND refund_num!=3)';

      Qualifying.count(queryParam,callback);
    }],
    "friendly_match":["court","vip",function (results, callback) {
      var court = results['court'];
      var vip = results['vip'];
      var pre_order_day = vip['pre_order_day']|0;         //可提前预定
      var queryParam = {court_id:court.court_id|0};
      queryParam['start_time'] = ['>=',now];
      queryParam['end_time'] = ['<=',now+pre_order_day*3600*24];
      FriendlyOrder.count(queryParam,callback);
    }],
    "appraise":["court",function (results, callback) {
      var venue_id = results['court']['venue_id']|0;
      VenueAppraise.find({venue_id:venue_id,user_id:req.user.user_id},callback)
    }],
    "is_attention":["court",function (results, callback) {
      var venue_id = results['court']['venue_id']|0;
      UserAttentionModel.isAttention(user_id,0,venue_id,callback);
    }]
  },function (err, results) {
    if(err) return res.error(err);
    res.success(results);
  });
};

/*球场预定列表*/
exports.orderList = function (req, res, next) {
  var now = moment().unix();
  var today_string = moment().format('YYYY-MM-DD');
  var today = moment(today_string);
  var court_id = req.data.court_id;
  async.auto({
    "pre_order_day":function (callback) {
      var vip_id = req.user.vip_id|0;
      if(vip_id>3){
        vip_id = 3;
      }
      Vip.find({level:vip_id},function (err, vip) {
        if(err) return callback(err);

        var pre_order_day = vip['pre_order_day'];         //可提前预定
        callback(null,pre_order_day);
      });
    },
    "day_match":function (callback) {                       //一天所有的场次
      var param = {};
      param['court_id'] = court_id;
      Once.select(param,callback);
    },
    "order":["pre_order_day","day_match",function (results, callback) {
      var day_match = results['day_match'];
      var pre_order_day = results['pre_order_day'];
      var days = [];
      var today_time = today.unix();

      for (var i = 0;i<pre_order_day;i++){
        var day = {start_time:today_time+86400*(i),end_time:today_time+86400*(i+1)};
        days.push(day);
      }
      async.forEachOf(days,function (day, index, callback) {
        var queryParam = {'court_id':court_id};
        queryParam['start_time'] = ['>=',day['start_time']];
        queryParam['end_time'] = ['<',day['end_time']];

        async.auto({
          "qualifying":function (callback) {
            queryParam['__string'] = "((status < 2) OR (status=2 AND refund_num !=1))";
            Qualifying.select(queryParam, function (err, qualifyings) {
              if (err) return callback(err);

              var data = [];
              _.forEach(qualifyings, function (qualifying) {
                data.push({start_time: qualifying['start_time'], end_time: qualifying['end_time']});
              });
              callback(null, data);
            });
          },
          "friendlyOrder":function (callback) {
            queryParam['__string'] = '(status < 3)';
            FriendlyOrder.select(queryParam, function (err, friendlyOrders) {
              if (err) return callback(err);

              var data = [];
              _.forEach(friendlyOrders, function (friendlyOrder) {
                data.push({start_time: friendlyOrder['start_time'], end_time: friendlyOrder['end_time']});
              });
              callback(null, data);
            });
          },
          "closeOnce":function (callback) {
            var param = {};
            var condition = {};
            param['field'] = Util.format('start_time,end_time');
            param['court_id'] = court_id;
            param['join'] = [
                'join t_close_once AS c on t_once.once_id = c.once_id AND c.time='+day['start_time']
            ];
            condition['group'] = 'c.once_id';
            Once.select(param,condition,function (err, data) {
              if(err) return callback(err);

              _.forEach(data,function (v,i) {
                data[i]['start_time'] = day['start_time'] + v['start_time'];
                data[i]['end_time'] = day['start_time'] + v['end_time'];
              });

              callback(null,data);
            });
          },
          "rest_match":["qualifying","friendlyOrder","closeOnce",function (results,callback) {
            var qualifyings = results['qualifying'];
            var friendlys = results['friendlyOrder'];
            var close_onces = results['closeOnce'];
            var all = [];
            var had = [];
            var count = 0;
            var miss = 0;
            all = _.concat(qualifyings,friendlys,close_onces);

            _.forEach(all,function (one) {

              _.forEach(day_match,function (match) {
                var start_time = day['start_time']+match['start_time'];
                var end_time = day['start_time']+match['end_time'];

                if((one['start_time']<=start_time)&&(one['end_time']>=end_time)){
                  had.push(match);
                  count++;
                }
              });
            });

            _.forEach(_.difference(day_match,had),function (one) {
              if(now>=(one['end_time']+day['start_time'])){
                miss++
              }
            });

            var rest_match = day_match.length - count - miss;
            if(rest_match<0){
              rest_match = 0;
            }
            callback(null,rest_match);
          }],
          "price":function (callback) {
            var price = [];
            _.forEach(day_match,function (match) {
              var s_time = day['start_time']+match['start_time'];
              var e_time = day['start_time']+match['end_time'];
              if(s_time>match['discount_start_time']&&e_time<match['discount_end_time']){
                price.push(match['discount_price']);
              }else {
                price.push(match['price']);
              }
            });
            var data = {
              "min":_.min(price),
              "max":_.max(price)
            };
            callback(null,data);
          }
        },function (err, results) {

          days[index]['price'] = results['price'];
          days[index]['rest_match'] = results['rest_match'];
          callback();
        });
      },function (err) {
        if(err) return callback(err);

        callback(null,days);
      });
    }]
  },function (err, results) {
    if(err) return res.error(err);

    results['day_match'] = results['day_match'].length;
    res.success(results);
  })
};

/*按时间预定球场*/
exports.courtListWithTime = function (req, res, next) {
  var order_time = moment.unix(req.data.order_time|0);
  var order = req.data.order?req.data.order:'distance';
  var sort = req.data.sort?req.data.sort:'asc';
  var offset = req.data.offset?req.data.offset:0;
  var limit = req.data.limit?req.data.limit:5;
  var lng = req.data.lng;
  var lat = req.data.lat;
  var hour = order_time.hour();
  var hour_sec = hour*3600;
  var sql = mysql.format('call courtListWithTime(?,?,?,?,?,?,?,?)',[hour_sec,order_time.unix(),lng,lat,order,sort,offset,limit]);
  Mysql.slave.getConnection(function (err, connection) {
    if(err) return res.error(err);

    connection.query(sql,function (err, data, fields) {
      connection.release();
      if(err) return res.error(err);

      res.success(data[0]);
    })
  });
};

/*根据时间预定球馆*/
exports.venueListWithTime = function (req, res, next) {
  var param = {};
  var query_str = "";
  var order_time = moment.unix(req.data.order_time|0);
  var start_time = moment(order_time.format("YYYY/MM/DD"),"YYYY/MM/DD").unix();
  var end_time = start_time + 24*3600;
  var offset = req.data.offset|0;
  var limit = req.data.limit|0;
  var lng = req.data.lng;
  var lat = req.data.lat;
  query_str = "AND( v.is_freeze = 0 AND v.is_referee=1)";
  var sql = mysql.format('call venueListWithTime(?,?,?,?,?,?,?,?,?)',[start_time,end_time,lng,lat,'distance','asc',offset,limit,query_str]);
  Mysql.slave.getConnection(function (err, connection) {
    if(err) return res.error(err);

    connection.query(sql,function (err, data, fields) {
      connection.release();
      if(err) return res.error(err);

      var venues = data[0];
      async.forEachOf(venues,function (venue, index, callback) {
        async.auto({
          "is_discount":function (callback) {
            var param = {};
            param['venue_id'] = venue['venue_id'];
            param['is_discount'] = 1;
            Court.count(param,function (err, data) {
              if(err) return callback(err);
              venues[index]['is_discount'] = data;
              callback(null,data);
            })
          }
        },callback)
      },function (err) {
        if(err) return res.error(err);

        res.success(venues);
      })
    })
  })
};

/*根据时间定球场（排位赛相关）*/
exports.courtListWithDate = function (req, res, next) {
  var param = {};
  var query_str = "";
  var order_time = moment.unix(req.data.order_time|0);
  var start_time = moment(order_time.format("YYYY/MM/DD"),"YYYY/MM/DD").unix();
  var end_time = start_time + 24*3600;
  var offset = req.data.offset|0;
  var limit = req.data.limit|0;
  var lng = req.data.lng;
  var lat = req.data.lat;
  var venue_id = req.data.venue_id;
  query_str = Util.format("AND( c.is_freeze = 0 AND venue_id = %d)",venue_id);
  var sql = mysql.format('call courtListWithDate(?,?,?,?,?,?,?,?,?)',[start_time,end_time,lng,lat,'distance','asc',offset,limit,query_str]);

  Mysql.slave.getConnection(function (err, connection) {
    if(err) return res.error(err);

    connection.query(sql,function (err, data, fields) {
      connection.release();
      if(err) return res.error(err);

      res.success(data[0]);
    })
  })
};

/*预定球场场次列表*/
exports.bookCourtList = function (req, res, next) {
  var condition = {};
  var queryParams = req.data;
  var book_time = moment.unix(req.data.book_time|0);
  var book_day = moment(book_time.format('YYYY-MM-DD'),'YYYY-MM-DD');
  var book_day_time = book_day.unix();
  var court_id = req.data.court_id;
  queryParams['book_time'] = undefined;
  condition['order'] = 'start_time asc';
  var param = {court_id:court_id};
  param['start_time'] = ['>=',book_day.unix()];
  param['end_time'] = ['<=',book_day.unix()+86400];
  async.auto({
    "once":function (callback) {
      Once.select(queryParams,condition,callback);
    },
    "qualifying":function (callback) {
      Qualifying.select(param,callback);
    },
    "friendly":function (callback) {
      FriendlyOrder.select(param,callback);
    },
    "closeOnce":function (callback) {
      var param = {};
      param['field'] = Util.format('start_time,end_time');
      param['court_id'] = court_id;
      param['join'] = [
        'join t_close_once AS c on t_once.once_id = c.once_id AND c.time='+book_day_time
      ];
      Once.select(param,function (err, data) {
        if(err) return callback(err);

        _.forEach(data,function (v,i) {
          data[i]['start_time'] = book_day_time + v['start_time'];
          data[i]['end_time'] = book_day_time + v['end_time'];
        });

        callback(null,data);
      });
    }
  },function (err, results) {
    if(err) return res.error(err);

    var onces = results['once'];
    var del = [];

    _.forEach(onces,function (once, index) {
      var start_time = once['start_time']+book_day_time;
      var end_time = once['end_time']+book_day_time;
      onces[index]['is_book'] = 0;
      onces[index]['book_type'] = 0;
      onces[index]['book_type_id'] = 0;

      _.forEach(results['qualifying'],function (qualifying) {
        if((qualifying['refund_num']!=1&&qualifying['refund_num']!=3)&&(start_time>=qualifying['start_time']&&end_time<=qualifying['end_time'])){
          onces[index]['is_book'] = 1;
          onces[index]['book_type'] = 0;              //排位赛
          onces[index]['book_type_id'] = qualifying['qualifying_id'];
          return false;
        }
      });
      _.forEach(results['friendly'],function (friendly) {
        if((friendly['status']<3)&&(start_time>=friendly['start_time'])&&(end_time<=friendly['end_time'])){
          onces[index]['is_book'] = 1;
          onces[index]['book_type'] = 1;            //友谊赛
          onces[index]['book_type_id'] = friendly['friendly_order_id'];
          return false;
        }
      });
      _.forEach(results['closeOnce'],function (close_once) {
        if((start_time>=close_once['start_time'])&&(end_time<=close_once['end_time'])){
          onces[index]['is_book'] = 1;
          onces[index]['book_type'] = 2;            //已关闭
          del.push(index);
          return false;
        }
      });

    });
    _.pullAt(onces,del);
    res.success(onces);
  });
};

/*该球场已预订的场次*/
exports.hadBookList = function (req, res, next) {
  var court_id = req.data.court_id;
  var user = req.user;

  async.auto({
    "ball_team":function (callback) {
      BallTeamModel.find({uid:user.user_id},callback);
    },
    "qualifying":["ball_team",function (results, callback) {
      var ball_team_id = results['ball_team']['ball_team_id'];
      var params = {
        home_team_id:ball_team_id,
        court_id:court_id
      };
      params['__string'] = '(status < 2)';
      params['field'] = "qualifying_id,court_id,start_time,end_time,fee/2 as fee,create_time";
      Qualifying.select(params,callback);
    }],
    "friendly":function (callback) {
      var params = {
        user_id:user.user_id,
        court_id:court_id
      };
      params['status']  =['<',3];
      params["field"] = "friendly_order_id,court_id,start_time,end_time,(price+san_money) as fee,create_time";
      FriendlyOrder.select(params,callback);
    }
  },function (err, results) {
    if(err) return res.error(err);

    var all = [];
    all = _.concat(results['qualifying'],results['friendly']);
    res.success(all);
  })
};

/*球馆评分*/
exports.venueAppraise = function (req, res, next) {
  var appraise_id = req.data.appraise_id|0;
  var grade = _.toNumber(req.data.grade);
  var venue_id = req.data.venue_id|0;
  var user_id = req.user.user_id;

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
        "last_appraise":function (callback) {
          VenueAppraise.getById(appraise_id,callback);
        },
        "change_appraise":function (callback) {
          if(appraise_id){
            VenueAppraise.update2(connection,{id:appraise_id},{grade:grade},callback);
          }else {
            callback();
          }
        },
        "add_appraise":function (callback) {
          if(!appraise_id){
            var data = {
              "venue_id":venue_id,
              "user_id":user_id,
              "grade":grade
            };
            VenueAppraise.addVenueAppraise2(connection,data,callback);
          }else {
            callback();
          }
        },
        "change_venue_grade":["last_appraise",function (results, callback) {
          var last_grade = results['last_appraise']['grade'];
          var data = {
            "appraise_grade":["appraise_grade+ "+(grade-last_grade)]
          };
          if(appraise_id){
            Venue.update2(connection,{venue_id:venue_id},data,callback);
          }else {
            callback();
          }
        }],
        "add_venue_grade":function (callback) {
          if(!appraise_id){
            var data = {
              "appraise_grade":["appraise_grade+ "+grade],
              "appraise_num":["appraise_num+1"]
            };
            Venue.update2(connection,{venue_id:venue_id},data,callback);
          }else {
            callback();
          }
        }
      },function (err, results) {
        if(err) return callback(err);
        var new_appraise_id = results['add_appraise'];
        if(new_appraise_id){
          appraise_id = new_appraise_id;
        }
        var result = {
          "appraise_id":appraise_id
        };
        callback(result);
      });
    }
  ],function (result,err) {
    if(err){
      return connection.rollback(function () {
        connection.release();
        res.error(err);
      });
    }
    connection.commit(function (err) {
      connection.release();
      if(err) return res.error(err);

      res.success(result);
    });
  });
};

/*球馆详情*/
exports.venueInfo = function (req, res, next) {
  var venue_id = req.data.venue_id|0;
  var user = req.user;
  var now = moment().unix();

  async.auto({
    "court":function (callback) {
      var queryParam = {
        "venue_id":venue_id
      };
      queryParam['field'] = "court_id";
      Court.select(queryParam,function (err, data) {
        if(err) return callback(err);
        var courts = _.map(data,"court_id");
        if(_.isEmpty(courts)){
          courts = [0];
        }
        callback(null,courts);
      });
    },
    "venue":function (callback) {
      var param = {venue_id:venue_id};
      // param['field'] = 'venue_id,phone,is_park,is_rest,is_camera,intro,is_referee,bus_line';
      Venue.find(param,callback);
    },
    "vip":function (callback) {
      Vip.find({level:req.user.vip_id|0},callback);
    },
    "venue_vip":["venue","vip",function (results, callback) {
      var venue = results['venue'];
      var vip = results['vip'];
      var query = {};
      query['field'] = "t_venue_vip.*,v.level";
      query['venue_id'] = venue.venue_id;
      query['join'] = [
          'join t_vip as v ON t_venue_vip.vip_id=v.id'
      ];
      VenueVipModel.select(query,function (err, data) {
        if(err) return callback(err);

        callback(null,data);
      })
    }],
    "total_match":["court","vip",function (results, callback) {
      var courts = results['court'];
      var vip = results['vip'];
      var pre_order_day = vip['pre_order_day'];         //可提前预定
      var queryParams = {};
      if(!_.isEmpty(courts)){
        queryParams['court_id'] = ['in',"("+_.toString(courts)+")"];
      }else {
        queryParams['court_id'] = 0;
      }
      Once.count(queryParams,function (err, count) {
        if(err) return callback(err);

        callback(null,count*pre_order_day);
      });
    }],
    "qualifying_match":["court","vip",function (results, callback) {
      var courts = results['court'];
      var vip = results['vip'];
      var pre_order_day = vip['pre_order_day']|0;         //可提前预定
      var queryParam = {};
      queryParam['court_id'] = ['in',"("+_.toString(courts)+")"];
      queryParam['start_time'] = ['>=',now];
      queryParam['end_time'] = ['<=',now+pre_order_day*3600*24];
      queryParam['__string'] = '(refund_num!=1 AND refund_num!=3)';

      Qualifying.count(queryParam,callback);
    }],
    "friendly_match":["court","vip",function (results, callback) {
      var courts = results['court'];
      var vip = results['vip'];
      var pre_order_day = vip['pre_order_day']|0;         //可提前预定
      var queryParam = {};
      queryParam['court_id'] = ['in',"("+_.toString(courts)+")"];
      queryParam['start_time'] = ['>=',now];
      queryParam['end_time'] = ['<=',now+pre_order_day*3600*24];
      FriendlyOrder.count(queryParam,callback);
    }],
    "appraise":["court",function (results, callback) {
      VenueAppraise.find({venue_id:venue_id,user_id:user.user_id},callback);
    }],
    "is_attention":["court",function (results, callback) {
      UserAttentionModel.isAttention(user.user_id,0,venue_id,callback);
    }]
  },function (err, results) {
    if(err) return res.error(err);
    res.success(results);
  });
};

/*球馆球队列表*/
exports.venueBallTeamList = function (req, res, next) {
  var venue_id = req.data.venue_id|0;
  var user = req.user;
  async.auto({
    "courts":function (callback) {
      var queryParam = {
        "venue_id":venue_id
      };
      queryParam['field'] = "court_id";
      Court.select(queryParam,function (err, data) {
        if(err) return callback(err);
        var courts = _.map(data,"court_id");
        if(_.isEmpty(courts)){
          courts = [0];
        }
        callback(null,courts);
      });
    },
    "qualifying":["courts",function (results, callback) {
      var courts = results['courts'];
      var param = {};
      var condition = {};
      param['field'] = "home_team_id";
      param['court_id'] = ['in','('+_.toString(courts)+')'];
      condition['group'] = 'home_team_id';
      Qualifying.select(param,condition,callback);
    }],
    "ball_team":["qualifying",function (results, callback) {
      var ball_team_id = results['qualifying'];
      var ball_team_ids = _.map(ball_team_id,"home_team_id");
      if(_.isEmpty(ball_team_ids)){
        ball_team_ids = [0];
      }
      var queryParams = req.data;
      delete queryParams['venue_id'];
      queryParams['order'] = "san_score";
      queryParams['ball_team_id'] = ['in','('+_.toString(ball_team_ids)+')'];
      BallTeamModel.search(queryParams,callback);
    }]
  },function (err, results) {
    if(err) return res.error(err);

    var data = results['ball_team']['data'];
    res.success(data);
  })
};

/*球馆VIP打折信息*/
exports.venueVip = function (req, res, next) {
  var venue_id = req.data.venue_id|0;
  var user = req.user;
  async.auto({
    "venue":function (callback) {
      Venue.find({venue_id:venue_id},function (err, data) {
        if(err) return callback(err);

        if(_.isEmpty(data)){
          var error = new Error("该球馆不存在");
          error.code = 400;
          return callback(error);
        }
        return callback(null,data);
      });
    },
    "vip":function (callback) {
      var query = {
        "level":user.vip_id
      };
      Vip.find(query,callback);
    },
    "venue_vip":["venue","vip",function (results, callback) {
      var vip = results['vip'];
      var query = {};
      query['venue_id'] = venue_id;
      query['vip_id'] = vip.id;
      VenueVipModel.find(query,function (err, data) {
        if(err) return callback(err);

        if(_.isEmpty(data)){
          return callback(null,1);
        }else {
          return callback(null,data['discount']);
        }
      })
    }]
  },function (err, results) {
    if(err) return res.error(err);

    res.success(results);
  })
};

/*球馆裁判*/
exports.venueReferee = function (req, res, next) {
  var venue_id = req.data.venue_id|0;
  async.auto({
    "referee":function (callback) {
      var query = {};
      query['is_show'] = 1;
      RefereeModel.select(query,callback);
    },
    "venue_referee":function (callback) {
      var query = {};
      query['venue_id'] = venue_id;
      query['r.is_show'] = 1;
      query['field'] = "venue_id,r.*";
      query['join'] = [
          'join t_referee as r ON t_venue_referee.referee_id = r.id'
      ];
      VenueRefereeModel.select(query,callback);
    }
  },function (err, results) {
    if(err) return res.error(err);

    var data = results['venue_referee'];
    if(_.isEmpty(data)){
      data = results['referee'];
    }
    res.success(data);
  })
};