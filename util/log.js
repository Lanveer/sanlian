/**
 * Created by walter on 2016/6/8.
 */
const log4js = require('log4js');

var log_config = {
  appenders:[
    {
      type:'file',
      filename:'log/db.log',
      maxLogSize:20480,
      backups:3,
      category:'db'
    }
  ]
};

log4js.configure(log_config);

module.exports = log4js;