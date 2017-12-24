/**
 * Created by walter on 2016/6/7.
 */
const config = require('./config');
const mongoose = require('mongoose');

module.exports = mongoose.createConnection(config.mongodb.uri);