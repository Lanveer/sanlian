/**
 * Created by walter on 2016/6/30.
 */
const express = require('express');
const _ = require('lodash');

var auth = require('../middlewares/auth');
var router = express.Router();

var uploadController = require('../controllers/upload');


_.forEach(uploadController,function (action,name) {
  router.use('/'+name,auth,action);
});



module.exports = router;