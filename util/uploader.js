/**
 * Created by walter on 2016/6/1.
 */
const multer = require('multer');
const path = require('path');
const moment = require('moment');
const crypto = require('crypto');
const fs = require('fs');
const mkdirp = require('mkdirp');
const async = require('async');
const _ = require('lodash');

const config = require('../config');

var storage = function (module) {
  if(!module){
    module = 'tmp';
  }
  const main_path = 'uploads';
  var file_path = path.join(main_path,module,moment().format('YYYYMMDD'));
  return multer.diskStorage({
    destination:function (req, file, callback) {
      console.log(file_path);
      try {
        fs.accessSync(file_path, fs.F_OK);
      } catch (e) {
        mkdirp.sync(file_path);
      }

      callback(null,file_path);
    },
    filename:function (req, file, callback) {
      crypto.randomBytes(16,function (err, chunk) {
        var random = '';
        if(err){
          random = undefined;
        }
        random = chunk.toString('hex');
        var filename = random+path.extname(file.originalname);
        console.log(filename);
        callback(null,filename);
      });
    }
  });

};
/**
 * 
 * @param {string} module 模块 如user,team等
 * @returns {*}
 */
exports.multerUpload = function(module) {
  return multer({
   storage:storage(module)
 });
};

/**
 * 上传Buffer文件
 * @param {array} files
 * @param {string} module 模块 如user,team等
 * @param callback
 */
exports.upload = function (files, module,callback) {
  var data = [];
  if(!module){
    module = 'tmp';
  }
  var main_path = 'public/uploads';
  var file_path = path.join(main_path,module,moment().format('YYYYMMDD'));
  try {
    fs.accessSync(file_path, fs.F_OK);
  } catch (e) {
    mkdirp.sync(file_path);
  }
  async.forEachOf(files,function (file, index, callback) {
    var filename = path.join(file_path,random()+path.extname(file.originalname));
    // console.log(data,index);
    var relative_path = _.replace(filename,/\\/g,'/');
    var url = config.host+'/'+relative_path;
    // console.log(file);
    data[index] = {
      "field_name":file['fieldname'],
      "original_name":file['originalname'],
      "mime_type":file['mime_type'],
      'path':relative_path,
      'url':url
    };


    fs.writeFile(filename,file.buffer,{flag:'w+'},callback);
  },function (err) {
    callback(err,data);
  });
};


/**
 *
 * @param {int} [length]
 * @returns {*}
 */
function random(length) {
  if(!length){
    length = 16;
  }
  return crypto.randomBytes(length).toString('hex');
}