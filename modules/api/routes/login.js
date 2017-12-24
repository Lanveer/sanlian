/**
 * Created by walter on 2016/6/8.
 */
const express = require('express');
const _ = require('lodash');
var router = express.Router();


var loginController = require('../controllers/login');



_.forEach(loginController,function (action,name) {
  router.use('/'+name,action);
});

// /*发送短信验证码*/
// router.use('/sendVerify',loginController.sendVerify);
//
// /*验证短信验证码*/
// router.use('/verifySms',loginController.verifySms);
//
// /*注册*/
// router.use('/register',loginController.register);
//
// /*普通登录*/
// router.use('/login',loginController.login);
//
// /*三方登录*/
// router.use('/otherLogin',loginController.otherLogin);
//
// /*用户列表*/
// router.use('/userList',loginController.userList);

module.exports = router;