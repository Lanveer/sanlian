/**
 * Created by walter on 2016/7/8.
 */
const mongoose = require('mongoose');
const utils = require('utility');
const _ = require('lodash');
const moment = require('moment');

var Schema = mongoose.Schema;

var MessageSchema = new Schema({
  content:{
    type:String,
    required:[true,'消息内容必须']
  },
  type:{                                                //0-订场 1-排位赛 2-活动 3-球队管理 4-系统
    type:Number,
    enum:[0,1,2,3,4]
  },
  target:{type:[],default:['all']},
  target_user:{type:[],default:['all']},
  ext:{},
  create_time:{type:Number,default:function () {
    return moment().unix();
  }}
},{
  collection:'message'
});

/*条件查询*/
MessageSchema.statics.search = function (queryParams, callback) {
  var offset = _.isNil(queryParams['offset'])?0:_.toNumber(queryParams['offset']);
  var limit = _.isNil(queryParams['limit'])?10:_.toNumber(queryParams['limit']);
  delete queryParams['offset'];
  delete queryParams['limit'];
  return this.find(queryParams)
    .skip(offset)
    .limit(limit)
    .sort({create_time:-1})
    .exec(callback);
};

module.exports = MessageSchema;