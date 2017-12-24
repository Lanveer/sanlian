/**
 * Created by walter on 2016/8/2.
 */
const express = require('express');
const path = require('path');

var Competition = express();
var resMiddle = require('../common/middlewares/response');
var reqMiddle = require('../common/middlewares/request');

Competition.on('mount',function () {
  console.log("Competition Module is mounted at "+Competition.mountpath);
});

Competition.set('views',path.join(__dirname,'views'));
Competition.set('views engine','pug');

// Competition.set('views',path.join(__dirname,'views'));
// Competition.set('views engine','ejs');

Competition.use('*',reqMiddle.mergeData,resMiddle.response);

var Index = require('./routes/index');

Competition.use('/',Index);

module.exports = Competition;