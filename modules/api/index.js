/**
 * Created by walter on 2016/6/8.
 */

const express = require('express');
var api = express();
var resMiddle = require('../common/middlewares/response');
var reqMiddle = require('../common/middlewares/request');

api.on('mount',function (parent) {
  console.log("Api Module is mounted at "+api.mountpath);
});

var login = require('./routes/login');
var card= require('./routes/card');
var teamInfo= require('./routes/teamInfo');
var ticketCard=require('./routes/ticketCard')
var order = require('./routes/order');
var ballTeam = require('./routes/ballTeam');
var user = require('./routes/user');
var qualifying = require('./routes/qualifying');
var booking = require('./routes/booking');
var upload = require('./routes/upload');
var setting = require('./routes/setting');
var callback = require('./routes/callback');
var competition = require('./routes/competition');
var commodity = require('./routes/commodity');
api.use('*',reqMiddle.mergeData,resMiddle.response);
api.use('/login',login);
api.use('/card/',card);
api.use('/teamInfo/',teamInfo);
api.use('/ticketCard',ticketCard);
api.use('/order',order);
api.use('/ballTeam',ballTeam);
api.use('/user',user);
api.use('/qualifying',qualifying);
api.use('/booking',booking);
api.use('/upload',upload);
api.use('/setting',setting);
api.use('/callback',callback);
api.use('/competition',competition);
api.use('/commodity',commodity);

module.exports = api;
