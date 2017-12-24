/**
 * Created by lanveer on 2017/7/4 0004.
 */



const express= require('express');
const _=require('lodash');
var auth= require('../middlewares/auth');
var router= express.Router();
var ticketCardController = require('../controllers/ticketCard');
_.forEach(ticketCardController,function (action,name) {
    router.use('/'+ name,action)
});
module.exports =router;
