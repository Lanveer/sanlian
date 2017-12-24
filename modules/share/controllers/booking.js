/**
 * Created by walter on 2016/7/13.
 */
const _ = require('lodash');
const async = require('async');
const Util = require('util');
const moment = require('moment');


var VenueModel = require('../../common/model').Venue;
var CourtModel = require('../../common/model').Court;
var OnceModel = require('../../common/model').Once;
var VipModel = require('../../common/model').Vip;
var QualifyingModel = require('../../common/model').Qualifying;
var FriendlyOrderModel = require('../../common/model').FriendlyOrder;
var UserModel = require('../../common/model').User;
var BallTeamModel = require('../../common/model').BallTeam;
var VenueAppraiseModel = require('../../common/model').VenueAppraise;
var AdverModel = require('../../common/model').Adver;

/*订场*/
exports.index = function (req, res, next) {
  var now = moment().unix();
  var queryParams = {};
  var lng = req.query['lng'];            //经度
  var lat = req.query['lat'];            //纬度
  queryParams['lat'] = undefined;
  queryParams['lng'] = undefined;

  queryParams['field'] = Util.format('t_venue.*,ROUND(appraise_grade/appraise_num,2) AS appraise,gps_distance(%d,%d,lng,lat) AS distance',lng,lat);
  queryParams['order'] = 'set_pos desc,';
  queryParams['sort'] = 'distance asc';
  queryParams['limit'] = 20;
  
  async.auto({
    "banners":function (callback) {
      var params = {
        "location":3,
        "status":1
      };
      AdverModel.select(params,function (err, result) {
        if(err) return callback(err);
        var data ={
          "top":_.filter(result,{"type":1}),
          "bottom":_.filter(result,{"type":2})
        };
        data['top'] = _.slice(data['top'],0,6);
        data['bottom'] = _.slice(data['bottom'],0,3);
        callback(null,data);
      });
    },
    "venues":function (callback) {
      VenueModel.search(queryParams,function (err, data) {
        if(err) return callback(err);

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
            callback(null,data);
          });
        }
      });
    }
  },function (err, results) {
    if(err) next(err);

    res.render('booking/index',results);
  });
};

