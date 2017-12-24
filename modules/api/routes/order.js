/**
 * Created by walter on 2016/6/15.
 */
const express = require('express');
const _ = require('lodash');

var router = express.Router();

var auth = require('../middlewares/auth');
var orderController = require('../controllers/order');

_.forEach(orderController,function (action,name) {
  router.use('/'+name,auth,action);
});

module.exports = router;