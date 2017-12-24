/**
 * Created by walter on 2016/8/29.
 */
const express= require('express');
const _ =require('lodash');
var router=express.Router();

router.use('/index',function (req,res,next) {
    res.send('llll')
});

module.exports=router;