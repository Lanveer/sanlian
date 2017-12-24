/**
 * Created by walter on 2016/6/8.
 */
//
exports.redis = {
  host:'139.196.230.218',
  port:'6379',
  password:'sl123456'
};
//
exports.mongodb = {
  uri:'mongodb://sanlian:sl123456@139.196.230.218:27017/qiuchang3'
};

// exports.mysql_master = {
//   host:'139.196.230.218',
//   user:'root',
//   password:'slqz1123456',
//   database:'qiuchang3',
//   connectionLimit:100
// };
//
// exports.mysql_slave1 = {
//   host:'139.196.230.218',
//   user:'root',
//   password:'slqz1123456',
//   database:'qiuchang3',
//   connectionLimit:100
// };

exports.mysql_master = {
    host:'127.0.0.1',
    user:'root',
    password:'root',
    database:'qiuchang3',
    connectionLimit:100,
    // multipleStatements: true
};

exports.mysql_slave1 = {
    host:'127.0.0.1',
    user:'root',
    password:'root',
    database:'qiuchang3',
    connectionLimit:100,
    // multipleStatements: true
};


// exports.mysql_master = {
//   host:'inner.cdnhxx.com',
//   user:'root',
//   password:'123456',
//   database:'qiuchang3',
//   connectionLimit:100
// };
//
// exports.mysql_slave1 = {
//   host:'inner.cdnhxx.com',
//   user:'root',
//   password:'123456',
//   database:'qiuchang3',
//   connectionLimit:100
// };


exports.mysql_local = {
  host:'localhost',
  user:'root',
  password:'123456',
  database:'qiuchang3',
  connectionLimit:100,
    // multipleStatements: true
};


