/**
 * Created by walter on 2016/9/13.
 */
require('../db_server');

const moment = require('moment');
const async = require('async');
const _ = require('lodash');


var tfOrder = function () {
  async.auto({
      "order":function (callback) {
          Mysql.local.getConnection(function (err, connection) {
              if(err) return callback(err);

              var sql = "SELECT * FROM t_order order by order_id asc";
              console.log("111111111111111111111111111111111");
              connection.query(sql,function (err, data) {
                  connection.release();
                  if(err) return callback(err);

                  callback(null,data);
              })
          })
      },
      "friendly":function (callback) {
          Mysql.local.getConnection(function (err, connection) {
              if(err) return callback(err);

              console.log("2222222222222222222222222222222222222");
              var sql = "SELECT * FROM t_friendly_order order by friendly_order_id asc";
              connection.query(sql,function (err, data) {
                  connection.release();
                  if(err) return callback(err);

                  callback(null,data);
              })
          })
      },
      "tfOrder":["order",function (results, callback) {
          var order = results['order'];
          Mysql.master.getConnection(function (err, connection) {
              if(err) return callback(err);
              var total = order.length;
              var done = 0;
              console.log(total);
              async.forEachOf(order,function (v, k, callback) {
                  var sql = "SELECT COUNT(*) AS num FROM t_order where order_id="+v['order_id'];
                  connection.query(sql,function (err, data) {
                      var is_has = data[0]['num'];
                      if(!is_has){
                          var insert_sql = 'INSERT INTO t_order SET ?';
                          connection.query(insert_sql,v,function (err, data) {
                              console.log(err);
                              console.log("order_id:"+data.insertId);
                              console.log("reset_order:"+(total--));
                              console.log("order_done:"+(done++));
                              callback()
                          })
                      }else {
                          console.log("reset_order:"+(total--));
                          callback(null,data);
                      }

                  })
              },callback)
          })
      }],
      "tfF":["friendly",function (results, callback) {
          var order = results['friendly'];
          Mysql.master.getConnection(function (err, connection) {
              if(err) return callback(err);

              var total = order.length;
              var done = 0;
              console.log(total);
              async.forEachOf(order,function (v, k, callback) {
                  var sql = "SELECT COUNT(*) AS num FROM t_friendly_order where friendly_order_id="+v['friendly_order_id'];
                  connection.query(sql,function (err, data) {
                      var is_has = data[0]['num'];
                      if(!is_has){
                          var insert_sql = 'INSERT INTO t_friendly_order SET ?';
                          connection.query(insert_sql,v,function (err, data) {
                              console.log(err);
                              console.log("f_order_id:"+data.insertId);
                              console.log("reset_f:"+(total--));
                              console.log("f_done:"+(done++));
                              callback()
                          })
                      }else {
                          console.log("reset_f:"+(total--));
                          callback(null,data);
                      }

                  })
              },callback)
          })
      }],
  },function (err, results) {
      console.log(err);
      console.log("end…………");
  })
};
// tfOrder();


