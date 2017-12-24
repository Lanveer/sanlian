/**
 * Created by walter on 2016/6/15.
 */

exports.getClientIp = function (req) {
  var ip = req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;
  var array = ip.split(':');
  ip = array[array.length-1];
  if(ip==1){
    ip = '127.0.0.1';
  }
  return ip;
};