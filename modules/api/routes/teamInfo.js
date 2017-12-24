/**
 * Created by Administrator on 2017/6/16 0016.
 */

const express = require('express');
const _=require('lodash');
var auth=require('../middlewares/auth');
var router = express.Router();
var teamInfoController = require('../controllers/teamInfo');
_.forEach(teamInfoController,function (action,name) {
    router.use('/'+name,action);
});
module.exports =router;