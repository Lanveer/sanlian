/**
 * Created by walter on 2016/7/12.
 */
const express = require('express');
const _ = require('lodash');
var auth = require('../middlewares/auth');
var router = express.Router();

var settingController = require('../controllers/setting');

_.forEach(settingController,function (action,name) {
  router.use('/'+name,action);
});

module.exports = router;