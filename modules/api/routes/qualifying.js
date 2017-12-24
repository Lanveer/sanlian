/**
 * Created by walter on 2016/6/24.
 */
const express = require('express');
const _ = require('lodash');
var auth = require('../middlewares/auth');
var router = express.Router();

var qualifyingController = require('../controllers/qualifying');

router.use('/qualifyingInfo',auth,qualifyingController.qualifyingInfo);

_.forEach(qualifyingController,function (action,name) {
  router.use('/'+name,action);
});



module.exports = router;