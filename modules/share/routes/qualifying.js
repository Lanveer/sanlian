/**
 * Created by walter on 2016/6/24.
 */
const express = require('express');
const _ = require('lodash');
var router = express.Router();

var qualifyingController = require('../controllers/qualifying');


_.forEach(qualifyingController,function (action,name) {
  router.use('/'+name,action);
});



module.exports = router;