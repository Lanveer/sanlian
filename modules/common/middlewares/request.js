/**
 * Created by walter on 2016/6/8.
 */
const _ = require('lodash');

var mergeData = function (req, res, next) {
  var data = {};
  if(req.query){
    data = _.merge(data,req.query);
  }
  if(req.body){
    data = _.merge(data,req.body);
  }
  req.data = data;
  next();
};

exports.mergeData = mergeData;