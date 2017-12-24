/**
 * Created by lanveer on 2017/6/16 0016.
 */
const util = require('util');
const _ = require('lodash');
const async = require('async');
const moment = require('moment');
const mysql = require('mysql');
const Mysql = require('../../../db_server/mysql.js');
var baseModel = require('./baseModel');
var Uploader = require('../../../util/uploader');
function card() {
    this.table = 't_user';
    baseModel.call(this);
    this.primary_key = 'id';
    this.rules = [];
}
util.inherits(card,baseModel);

/*当前球队参加的赛事*/
/*
* 当前队长报名参加的赛事
*
* 所需要的参数：user_id
* SELECT `user`.nickname,t_competition_ballteam.competition_id,t_competition.title FROM `t_competition_ballteam`left JOIN t_user as user on(t_competition_ballteam.ball_team_id=`user`.cur_ballteam_id) LEFT JOIN t_competition on(t_competition_ballteam.competition_id= t_competition.competition_id) where `user`.user_id=5672;
 *
 * 当前队员参加的赛事
 * select t_competition.title,t_competition.address from t_ball_team_card LEFT JOIN t_competition on(t_ball_team_card.competition_id= t_competition.competition_id) where uid=5667;
* */

card.prototype.getMemberCompetitions = function (query,callback) {
     var uid= query.uid;
     var ball_team_id= query.ball_team_id;
     var sql='select t_competition.address,t_competition.start_time,t_competition.end_time,t_competition.img,t_competition.type,t_competition.create_time,t_competition.competition_id,t_competition.title,t_competition.switched,t_competition.ticket_card_num as card_num from t_ball_team_card LEFT JOIN t_competition on(t_ball_team_card.competition_id= t_competition.competition_id) where uid='+uid+''
    Mysql.master.getConnection(function (err,connection) {
        if(err) return callback(err);
        connection.query(sql,function (err,result) {
            if(err) return callback(err);
            callback(null,result);
        })
    })
};

card.prototype.getCompetitions= function (query,callback) {
    var uid= query.uid;
    var ball_team_id= query.ball_team_id;
    var sql='SELECT t_competition.address,t_competition.start_time,t_competition.end_time,t_competition.img,t_competition.type,t_competition.create_time,t_competition.competition_id,t_competition.title,t_competition.switched,t_competition.ticket_card_num as card_num FROM `t_competition_ballteam`left JOIN t_user as user on(t_competition_ballteam.ball_team_id=`user`.cur_ballteam_id) LEFT JOIN t_competition on(t_competition_ballteam.competition_id= t_competition.competition_id) where `user`.user_id='+uid+'';
    Mysql.master.getConnection(function (err,connection) {
        if(err) return callback(err);
        connection.query(sql,function (err,result) {
            if(err) return callback(err);
            callback(null,result);
        })
    })
};

//之前的取消开始
card.prototype.getCompetitions0000000000= function(query,callback){
    this.table = 't_competition_ballteam';
    var self = this;
    var condition = {};
    var offset = 0;
    var limit = '';
    var order = this.primary_key;
    var sort = 'desc';
    var queryParams = {
        'field': [
            'b.title',
            'b.address',
            'b.start_time',
            'b.end_time',
            'b.img',
            'b.type',
            'b.create_time',
            'b.competition_id'
        ],
        't_competition_ballteam.ball_team_id': query.ball_team_id,
        'order': 'b.start_time'
    };
    queryParams['join'] = [
        'JOIN t_competition as b on(b.competition_id=t_competition_ballteam.competition_id)',
    ]

    if(!_.isNil(queryParams['limit'])){
        limit = queryParams['limit'] | 0;
        queryParams['limit'] = undefined;
    }
    if(!_.isNil(queryParams['offset'])){
        offset = queryParams['offset'] | 0;
        queryParams['offset'] = undefined;
    }
    if(limit){
        condition['limit'] = offset+','+limit;
    }

    if(!_.isNil(queryParams['order'])){
        order = _.trim(queryParams['order']);
        queryParams['order'] = undefined;
    }
    if(!_.isNil(queryParams['sort'])){
        sort = _.trim(queryParams['sort']);
        queryParams['sort'] = undefined;
    }
    condition['order'] = order+' '+sort;
    async.auto({
        "total":function (callback) {
            self.count(queryParams,callback);
        },
        "data":function (callback) {
            self.select(queryParams,condition,callback);
        }
    },function (err, result) {
        if(err) return callback(err);
        callback(null,result);
    });
};
//之前的取消


/*
获取当前用户(队长) 当前赛事 当前球队 所有球员
*/
card.prototype.getBallTeamMembers= function (query,callback) {
    this.table= 't_ball_team_member';
    var self=this;
    var conditions={};
    var offset=0;
    var limit=20;
    var order= this.primary_key;
    var sort= 'desc';
    var queryParams={
        'field':[
            't_ball_team_member.*',
            'b.is_get_card',
            'b.competition_id',
            'c.nickname',
            'c.avatar',
            // '(c.birthday) AS age',
            'ageOfBirthday(c.birthday) as age',
            // ' date_format(from_unixtime(c.birthday),"%Y") AS birthday',
            // ' date_format(from_unixtime(unix_timestamp(now()))," %Y")  AS age',
            // ' from_unixtime(unix_timestamp(now()))    AS age',  //2017
            // ' date_format(from_unixtime(c.birthday),"%Y")  AS age',  //1989
            'c.height',
            'c.weight'
        ],
        't_ball_team_member.ball_team_id':query.ball_team_id,
        'order':'b.is_get_card'
    };
    if( query.user_id ) queryParams['t_ball_team_member.uid'] = ['<>', query.user_id];
    queryParams['join']=[
        'left join t_ball_team_card b on(b.uid= t_ball_team_member.uid and b.competition_id= '+query.competition_id+')',
        'left join t_user c on(c.user_id= t_ball_team_member.uid)'
    ];
    if(!_.isNil(queryParams['limit'])){
        limit=queryParams['limit']|0;
        queryParams['limit']= undefined;
    }
    if(!_.isNil(queryParams['offset'])){
        offset=queryParams['offset']|0;
        queryParams['offset']= undefined;
    }
    if(limit){
        conditions['limit'] = offset + ','+ limit;
    }
 if(!_.isNil(queryParams['order'])){
        order= _.trim(queryParams['order']);
        queryParams['order']= undefined;
 }
 //注意这个地方引号一定要空格出来，要不然会报sql拼接错误
 conditions['order']= order + ' ' + sort;

async.auto({
    "total": function (callback) {
        self.count(queryParams,callback);
    },
    data: function (callback) {
        self.select(queryParams,conditions,callback);
    }
},function (err,result) {
    if(err)return callback(err);
    callback(null,result);
})

}


/*参赛证信息开始*/
card.prototype.getCompetitionCardInfo = function (query,callback) {
    this.table= 't_ball_team_member';
    var self= this;
    var conditions= {};
    var offset=0;
    var limit=5;
    var order= this.primary_key;
    var sort= 'desc';
    var queryParams={
        'field':[
            't_ball_team_member.clubnumber',
            'b.nickname',
            'c.name as teamName',
            'd.head_pic as avatar'
        ],
        't_ball_team_member.ball_team_id':query.ball_team_id,
        't_ball_team_member.uid':query.user_id,
        'd.competition_id':query.competition_id,
        'order':'t_ball_team_member.uid'
    };
    queryParams['join']= [
        'left join t_user b on(t_ball_team_member.uid= b.user_id)',
        'left join t_ball_team as c on t_ball_team_member.ball_team_id= c.ball_team_id',
        'left join t_ball_team_card as d on t_ball_team_member.uid= d.uid'
    ];
    if(!_.isNil(queryParams['limit'])){
        limit= queryParams['limit']|0;
        queryParams['limit']= undefined;
    };
    if(!_.isNil(queryParams['offset'])){
        offset= queryParams['offset']|0;
        queryParams['offset']= undefined;
    };
    if(!_.isNil(queryParams['order'])){
        order= _.trim(queryParams['order']);
        queryParams['order']= undefined;
    };
    if(!_.isNil(queryParams['sort'])){
        sort= _.trim(queryParams['sort']);
        queryParams['sort']= undefined;
    };
    conditions['order']= order+ ' '+ sort;
    if(limit){
        conditions['limit']= offset +','+ limit;
    };
    async.auto({
        'total': function (callback) {
            self.count(queryParams,callback)
        },
        'data':function (callback) {
            self.select(queryParams,conditions,callback)
        }
    },function (err,result) {
        if(err)return callback(err);
        callback(null,result);
    })

}


/*发送参赛证开始*/
card.prototype.sendCard= function (query,callback) {
    try {
        this.checkRequire(query);
        this.checkRule(query);
    } catch (err) {
        return callback(err);
    }

    this.addBallTeamCard(query,callback);
};
card.prototype.addBallTeamCard = function (query,callback) {
    var competition_id=query.competition_id;
    var ball_team_id= query.ball_team_id;
    var uids= query.uid.toString().split(',');
    var uids= query.uid;
    //单条数据的插入
    // var sql = 'insert into t_ball_team_card (competition_id, ball_team_id, uid, is_get_card) values ('+competition_id+','+ball_team_id+','+uids+',1)'
    //批量去重复数据的插入

    var sql = util.format('INSERT INTO t_ball_team_card (competition_id, ball_team_id, uid, is_get_card) select %s, %s, %s, 1 from DUAL where not EXISTS (SELECT * from t_ball_team_card WHERE competition_id=%s and ball_team_id=%s and uid=%s);',
        query.competition_id, query.ball_team_id, query.uid,
        query.competition_id, query.ball_team_id, query.uid
            );
    Mysql.master.getConnection(function (err,connection) {
    if(err)return callback(err);
    connection.query(sql,function (err, result) {
        console.log('this sql is:' + sql);
        connection.release();
        if(err)return callback(err);
        callback(null,result);
    })
})
};

/*重新写发送参赛证开始*/

card.prototype.send= function (query,callback) {
   function search(sql,callback) {
       Mysql.master.getConnection(function (err,connection) {
           if(err){
               callback(null,err)
           }else{
               connection.query(sql,function (err,result) {
                   connection.release();
                   if(err){
                       return callback(null,err)
                   }else{
                       callback(null,result)
                   }
               })
           }
       })
   };

    var competition_id=query.competition_id;
    var ball_team_id= query.ball_team_id;
    var uid= query.uid;

   //发送成功的状态
    var sql = util.format('INSERT INTO t_ball_team_card (competition_id, ball_team_id, uid, is_get_card) select %s, %s, %s, 1 from DUAL where not EXISTS (SELECT * from t_ball_team_card WHERE competition_id=%s and ball_team_id=%s and uid=%s);',
        query.competition_id, query.ball_team_id, query.uid,
        query.competition_id, query.ball_team_id, query.uid
    );

    //检查是否超过限制
    var sql2='select count(ball_team_id) as team_num ,b.ticket_card_num from t_ball_team_card as a  join t_competition as b on a.competition_id=b.competition_id where a.ball_team_id='+ball_team_id+' and a.competition_id='+competition_id+''
 console.log('sql2:'+ sql2)
 search(sql2,function (err,result) {
     if(err){
         res.json({
             code:'500',
             msg:'查询数目出错！'
         })
     }else{
         var team_num=JSON.parse(JSON.stringify(result))[0].team_num;
         var ticket_card_num=JSON.parse(JSON.stringify(result))[0].ticket_card_num;
         console.log('team_num:'+team_num);
         console.log('ticket_card_num:'+team_num);
         if(team_num>=ticket_card_num){
             callback(null,{
                 code:'500',
                 msg:'超过该球队所限制的参赛证数量'
             })
         }else{
             search(sql,function (err,result) {
                 if(err){
                     callback(null,{
                         code:'500',
                         msg:'插入错误！'
                     })
                 }else{
                     callback(null,{
                         code:'200',
                         msg:'发送成功',
                         data:result
                     })
                 }
             })
         }
     }
 })

};

/*重新写发送参赛证结束*/




/*撤回参赛证开始*/
card.prototype.deleteCard= function (query,callback) {
    var sql = util.format('delete from t_ball_team_card where competition_id= %s and ball_team_id=%s and uid=%s;',
        query.competition_id,query.ball_team_id,query.uid
    );
    Mysql.master.getConnection(function (err,connections) {
        if(err) return callback(err);
        connections.query(sql,function (err,result) {
            connections.release();
            if(err)return callback(err);
            callback(null,result);
        })
    })
};



/*上传参赛证头像开始*/

card.prototype.saveHeader = function (query,callback) {
    var url= query.url,
        competition_id= query.competition_id,
        ball_team_id= query.ball_team_id,
        uid= query.uid;
    var sql= 'update t_ball_team_card set head_pic="'+url+'"  where  competition_id='+competition_id+' and ball_team_id= '+ball_team_id+' and uid='+uid+' ';
    Mysql.master.getConnection(function (err,connections) {
        if(err) return callback(err);
        connections.query(sql,function (err,result) {
            connections.release();
            if(err)return  callback(err);
            callback(null,result)
        })
    })

};



module.exports=card;

function getAge(birthday) {
    var time = moment.unix(birthday|0);
    var year_dif = 0;
    if(moment().date()<time.date()){
        year_dif = 1;
    }else if (moment().date()>time.date()){
        year_dif = 0;
    }

    if(moment().month()<time.month()){
        year_dif = 1;
    }else if(moment().month()>time.month()){
        year_dif = 0;
    }

    var age = moment().year()-time.year() + year_dif;
    return age;
}