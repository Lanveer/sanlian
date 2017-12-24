/**
 * Created by walter on 2016/7/12.
 */
const express = require('express');
const _ = require('lodash');
var router = express.Router();

var bookingController = require('../controllers/booking');

_.forEach(bookingController,function (action,name) {
  router.use('/'+name,action);
});



module.exports = router;