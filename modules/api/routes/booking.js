/**
 * Created by walter on 2016/6/27.
 */
var express = require('express');
const _ = require('lodash');

var auth = require('../middlewares/auth');
var router = express.Router();

var bookingController = require('../controllers/booking');

_.forEach(bookingController,function (action,name) {
  router.use('/'+name,auth,action);
});



module.exports = router;