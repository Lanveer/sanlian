/**
 * Created by walter on 2016/8/16.
 */
const express = require('express');
const _ = require('lodash');
var router = express.Router();

var competitionController = require('../controllers/competition');

_.forEach(competitionController,function (action,name) {
    router.use('/'+name,action);
});



module.exports = router;