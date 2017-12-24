/**
 * Created by walter on 2016/6/15.
 */
const moment = require('moment');
var build_order = function () {
  var order_no = moment().format('YYYYMMDDHHmmss');
  order_no +=Math.random().toString().substr(2,10);
  return order_no;
};

module.exports = build_order;