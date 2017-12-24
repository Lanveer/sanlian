/**
 * Created by walter on 2016/6/30.
 */
const _ = require('lodash');
const async = require('async');
const path=  require('path');

var uploader = require('../../../util/uploader').upload;


/*上传图片*/
exports.uploadImg = function (req, res, next) {
  var module = _.trim(req.data.module);
  var error = new Error("上传图片出错");
  error.code = 423;
  
  uploader(req.files,module,function (err,files) {
    if(err) return res.error(err);
    
    res.success(files)
  });
};