/**
 * Created by walter on 2016/7/12.
 */
const express = require('express');
const _ = require('lodash');
var router = express.Router();

var ballTeamController = require('../controllers/ballTeam');

_.forEach(ballTeamController,function (action,name) {
  router.use('/'+name,action);
});



module.exports = router;