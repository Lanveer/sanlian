/**
 * Created by walter on 2016/6/7.
 */
const log4js = require('../util/log');
const mysql = require('mysql');
const config = require('./config');

var logger = log4js.getLogger('db');
var poolCluster = mysql.createPoolCluster({
  'canRetry':true,
  'removeNodeErrorCount':2,
  'restoreNodeTimeout':5*60*1000
});
poolCluster.add('MASTER', config.mysql_master);
poolCluster.add('SLAVE1', config.mysql_slave1);
// poolCluster.add('SLAVE2', config.mysql_local);
// poolCluster.add('SLAVE3', config.mysql_slave3);

poolCluster.on('remove',function (nodeId) {
  console.log('Mysql Removed node : '+nodeId);
});

var master = poolCluster.of('MASTER');
var slave = poolCluster.of('SLAVE*');
// var slave2 = poolCluster.of('SLAVE2');



exports.master = master;
exports.slave = slave;
// exports.slave2= slave2;