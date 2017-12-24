/**
 * Created by walter on 2016/6/16.
 */
const express = require('express');
const _ = require('lodash');
var auth = require('../middlewares/auth');
var router = express.Router();

var ballTeamController = require('../controllers/ballTeam');

router.use('/joinTeam',auth,ballTeamController.joinTeam);
router.use('/buildTeam',auth,ballTeamController.buildTeam);
router.use('/getMyTeamInfo',auth,ballTeamController.getMyTeamInfo);
router.use('/addBallTeamImg',auth,ballTeamController.addBallTeamImg);
router.use('/cancelAct',auth,ballTeamController.cancelAct);
router.use('/addNoticeComment',auth,ballTeamController.addNoticeComment);
router.use('/joinAct',auth,ballTeamController.joinAct);
router.use('/quitAct',auth,ballTeamController.quitAct);
router.use('/inviteJoinBallTeam',auth,ballTeamController.inviteJoinBallTeam);
router.use('/kickTeamMember',auth,ballTeamController.kickTeamMember);
router.use('/dissolveBallTeam',auth,ballTeamController.dissolveBallTeam);
router.use('/kickTeamMember',auth,ballTeamController.kickTeamMember);
router.use('/ballTeamInfo',auth,ballTeamController.ballTeamInfo);
router.use('/quitBallTeam',auth,ballTeamController.quitBallTeam);
router.use('/changeBallTeamMember',auth,ballTeamController.changeBallTeamMember);

_.forEach(ballTeamController,function (action,name) {
  router.use('/'+name,action);
});



module.exports = router;