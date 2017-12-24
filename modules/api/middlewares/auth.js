/**
 * Created by walter on 2016/6/8.
 */
const _ = require('lodash');
var userModel = require('../../common/model').User;

var auth = function (req, res, next) {
  var accessToken = req.get('accessToken');
  // var user_id = req.get('currentUser');
    var user_id=5672;
    console.log('auth user_id='+ user_id)
  // var ip = req.headers['x-forwarded-for'] ||
  //     req.connection.remoteAddress ||
  //     req.socket.remoteAddress ||
  //     req.connection.socket.remoteAddress;
  // console.log(ip);
  userModel.getById(user_id|0,function (err, user) {
    if(_.isEmpty(user)){
      return res.error(409,'该用户不存在！');
    }
    // console.log(accessToken);
    // console.log(user.token);
    if(user.token !== accessToken){
      // return res.error(411,'错误的accessToken');
    }
    req.user = user;
    next();
  });
};
module.exports = auth;

