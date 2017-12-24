/**
 * Created by walter on 2016/7/12.
 */
const _ = require('lodash');
const async = require('async');
const Util = require('util');

var EmblemModel = require('../../common/model').Emblem;
var CategoryModel = require('../../common/model').Category;
var AdverModel = require('../../common/model').Adver;
var PromotedModel = require('../../common/model').Promoted;
var AgreementModel = require('../../common/model').Agreement;
var VerModel = require('../../common/model').Ver;
var CommodityBanner = require('../../common/model').CommodityBanner;

/*获取队徽*/
exports.getEmblem = function (req, res, next) {

  async.auto({
    "category_list":function (callback) {
      CategoryModel.select({},callback);
    },
    "emblem":["category_list",function (resutls, callback) {
      var categoryList = resutls['category_list'];
      async.forEachOf(categoryList,function (category, index, callback) {
        EmblemModel.select({"category_id":category['id'],"status":1},function (err, data) {
          if(err) return callback(err);
          
          categoryList[index]['emblems'] = data;
          callback();
        });
      },function (err) {
        if(err) return callback(err);
        
        callback(null,categoryList);
      });
    }]
  },function (err, results) {
    if(err) return res.error(err);
    
    res.success(results['emblem']);
  });
};

/*获取Banner*/
exports.getBanner = function (req, res, next) {
  var queryParams = req.data;
  queryParams['status'] = 1;
  AdverModel.search(queryParams,function (err, data) {
    if(err) return res.error(err);

    res.success(data['data']);
  });
};

/*获取晋级设置*/
exports.getPromoted = function (req, res, next) {
  PromotedModel.select({},function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  })
};

/*获取协议*/
exports.getAgreement = function (req, res, next) {
  var type = req.data.id;
  AgreementModel.find({type:type},function (err, data) {
    if(err) return res.error(err);

    res.success(data);
  })
};

/*获取最新版本*/
exports.getVer = function (req, res, next) {
  var version = req.data.version;
  var type = req.data.type|0;
  var query = {};
  var condition = {};
  if(version){
    query['version'] = version;
  }
  query['type'] = type;
  condition['order'] = 'version desc';
  VerModel.find(query,condition,function (err, data) {
    if(err) return res.error();

    res.success(data);
  })
};

/*商城Banner*/
exports.mallBanner = function (req, res, next) {
  var query  ={};
  query['status'] = 1;
  CommodityBanner.select(query,function (err, data) {
    if(err) return res.error(err);
    
    res.success(data);
  })
};