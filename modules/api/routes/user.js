/**
 * Created by walter on 2016/6/23.
 */
const express = require('express');
const _ = require('lodash');

var auth = require('../middlewares/auth');
var router = express.Router();

var userController = require('../controllers/user');


_.forEach(userController,function (action,name) {
  router.use('/'+name,auth,action);
});



module.exports = router;