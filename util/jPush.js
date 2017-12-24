/**
 * Created by walter on 2016/7/8.
 */
const JPush = require('../node_modules/jpush-sdk/lib/JPush/JPush');
const _ = require('lodash');
var config = require('../config');

var client = JPush.buildClient(config.jpush);

/**
 * 发送给所有人
 * @param {string} alert 提醒内容
 * @param {object} ext
 * @param callback
 */
var sendToAll = function (alert, ext, callback) {
    if (!ext) {
        ext = {};
    }
    client.push().setPlatform(JPush.ALL)
        .setOptions(null,null,null,true,null)
        .setAudience(JPush.ALL)
        .setNotification(
            alert,
            JPush.android(alert, "三联球战", 1, ext),
            JPush.ios(alert, 'sound', 1, false, ext)
        )
        .send(function (err, res) {
            if (err) {
                if (err instanceof JPush.APIConnectionError) {
                    console.log(err.message);
                } else if (err instanceof JPush.APIRequestError) {
                    console.log(err.message);
                }
                callback(err);
            } else {
                callback(null, {
                    "sendno": res.sendno,
                    "msg_id": res.msg_id
                });
                console.log('Sendno: ' + res.sendno);
                console.log('Msg_id: ' + res.msg_id);
            }
        });
};

/**
 * 发送给某些人
 * @param {array} deviceuuid 用户设备号
 * @param {string} alert  提醒内容
 * @param {object} ext
 * @param callback
 */
var sendToSomeone = function (deviceuuid, alert, ext, callback) {
    var alias = _.toString(deviceuuid);

    try {
        client.push().setPlatform('ios', 'android')
            .setOptions(null,null,null,true,null)
            .setAudience(JPush.alias(alias))
            .setNotification(
                alert,
                JPush.android(alert, "三联球战", 1, ext),
                JPush.ios(alert, 'sound', 1, false, ext)
            )
            .send(function (err, res) {
                if (err) {
                    if (err instanceof JPush.APIConnectionError) {
                        console.log(err.message);
                    } else if (err instanceof JPush.APIRequestError) {
                        console.log(err.message);
                    }
                    callback(err);
                } else {
                    callback(null, {
                        "sendno": res.sendno,
                        "msg_id": res.msg_id
                    });
                }
            });
    } catch (e) {
        return callback(e);
    }
};

module.exports = {
    "client": client,
    "sendToAll": sendToAll,
    "sendToSomeone": sendToSomeone
};