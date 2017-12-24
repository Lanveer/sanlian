/**
 * Created by walter on 2016/6/8.
 */
const cluster = require("cluster");
const http = require("http");
const numCPUs = require('os').cpus().length;

cluster.setupMaster({
  exec:"./bin/www",
  silent:false
  // gid:2
});


for (var i=0;i<numCPUs;i++){
  cluster.fork();
}

cluster.setupMaster({
  exec:"./extend/polling",
  silent:false
});

startTask();

function startTask() {

  var tasks= cluster.fork();
  tasks.on('exit',function (code, signal) {
    console.log(code);
    console.log(signal);
    startTask();
  });
}

// cluster.setupMaster({
//   exec:"./extend/fix",
//   silent:false
// });
//
// var fix = cluster.fork();

