var express = require('express');
var router = express.Router();

const request = require('request');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.use('/admin', function(req, res, next) {
  var url = req.protocol+"://"+req.hostname+':8080/admin'+req.url;
  // console.log(url);
  res.redirect(url);
  // req.pipe(request(url)).pipe(res);
});

router.use('/ueditor',function (req, res, next) {
  var url = req.protocol+"://"+req.hostname+':8080/ueditor'+req.url;
  // console.log(url);
  res.redirect(url);
  // req.pipe(request(url)).pipe(res);
});

module.exports = router;
