var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
const multer = require('multer');
const bytes = require('bytes');

const config = require('./config');

var routes = require('./routes/index');

var app = express();
var apiModule = require('./modules/api');       //API 模块
var shareModule = require('./modules/share');   //分享模块
var competitionModule = require('./modules/competition');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');

app.disable('x-powered-by');

app.use('/', routes);
// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.text({type:'text/xml'}));
app.use(bodyParser.json({
  limit:config.file_limit
}));
app.use(bodyParser.urlencoded({ extended: true,limit: config.file_limit }));
app.use(multer().any());
app.use(cookieParser());
app.use('/public',express.static(path.join(__dirname, 'public')));


app.use('/api', cors(),apiModule);
app.use('/share',cors(),shareModule);
app.use('/competition',cors(),competitionModule);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found hahaha');
  err.status = 404;
  next(err);
});
// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    // res.status(err.status || 500);
    console.log(err);
    res.json({
      code:err.status || 500,
      msg:err.message,
      data:{}
    })
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
