/**
 * Created by walter on 2016/8/2.
 */

const express = require('express');
const _ = require('lodash');
var router = express.Router();

var Controller = require('../controllers/index');

_.forEach(Controller,function (action,name) {
  router.use('/'+name,action);
});



module.exports = router;