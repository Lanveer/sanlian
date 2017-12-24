/**
 * Created by walter on 2016/8/3.
 */
var express = require('express');
const _ = require('lodash');

var auth = require('../middlewares/auth');
var router = express.Router();

var competitionController = require('../controllers/competition');

_.forEach(competitionController,function (action,name) {
  router.use('/'+name,auth,action);
});



module.exports = router;