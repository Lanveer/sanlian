/**
 * Created by walter on 2016/6/8.
 */
const config = require('./config');

global.MongoDB = require('./mongo');
global.Mysql = require('./mysql');
global.Redis = require('./redis');


MongoDB.onOpen(function () {
  console.log('MongoDB is online... run at pid:'+process.pid);
});

Redis.on('ready',function () {
  console.log('Redis is online... run at pid:'+process.pid);
});
