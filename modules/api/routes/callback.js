/**
 * Created by walter on 2016/7/27.
 */
const express = require('express');
const _ = require('lodash');
var auth = require('../middlewares/auth');
var router = express.Router();

var callbackController = require('../controllers/callback');


_.forEach(callbackController,function (action,name) {
  router.use('/'+name,action);
});



module.exports = router;