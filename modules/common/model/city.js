/**
 * Created by walter on 2016/6/13.
 */
const util = require('util');
var baseModel = require('./baseModel');

function City() {
  this.table = 'city';
  baseModel.call(this);
  this.primary_key = 'city_id';

}
util.inherits(City,baseModel);


module.exports = City;