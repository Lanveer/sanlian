/**
 * Created by walter on 2016/6/7.
 */
const config = require('./config');
const redis = require('redis');


module.exports = redis.createClient(config.redis);

