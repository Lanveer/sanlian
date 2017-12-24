/**
 * Created by walter on 2016/7/12.
 */
const express = require('express');
const path = require('path');
var Share = express();

Share.on('mount',function (parent) {
  console.log("Share Module is mounted at "+Share.mountpath);
});

Share.set('views',path.join(__dirname,'views'));
Share.set('views engine','pug');

var index = require('./controllers/index');

var ballTeam = require('./routes/ballTeam');
var booking = require('./routes/booking');
var qualifying = require('./routes/qualifying');
var competition = require('./routes/competition');

Share.use('/download',index.download);

Share.use('/ballTeam',ballTeam);
Share.use('/booking',booking);
Share.use('/qualifying',qualifying);
Share.use('/competition',competition);

module.exports = Share;