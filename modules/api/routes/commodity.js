/**
 * Created by walter on 2017/1/5.
 */
var express = require('express');
const _ = require('lodash');

var auth = require('../middlewares/auth');
var router = express.Router();

var commodityController = require('../controllers/commodity');

_.forEach(commodityController,function (action,name) {
    router.use('/'+name,auth,action);
});



module.exports = router;