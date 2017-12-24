/**
 * Created by Administrator on 2017/5/31.
 */

$('.main-header ul li').click(function () {
    var a= $(this).attr('data-tab');
    $(this).addClass('main-header-on');
    $(this).siblings().removeClass('main-header-on')
var el= '.'+'con'+a;
    console.log(el)
    $(el).show();
    $(el).siblings().hide()
});


//team-detail 页面的底部菜单点击切换
$('.footer>ul>li').each(function (i) {
    $('.con').eq(0).show();
    $('.footer ul li').eq(0).find('.footer-icon').show();
    $('.footer ul li').eq(0).find('.footer-icon2').hide();
    $(this).click(function () {
        if(i===0){
            $('.con').eq(0).show();
            $('.con').removeClass('show')
            $('.footer ul li').eq(0).find('.footer-icon').show();
            $('.footer ul li').eq(0).find('.footer-icon2').hide();
            $('.footer ul li').eq(1).find('.footer-icon').hide();
            $('.footer ul li').eq(1).find('.footer-icon2').show();
            $('.footer ul li').eq(2).find('.footer-icon').hide();
            $('.footer ul li').eq(2).find('.footer-icon2').show();
        }else{
            $('.con').eq(0).hide();
            var $this= $(this);
            $('.con').removeClass('show');
            $('.con').eq(i).addClass('show');

            $('.footer ul li').eq(0).find('.footer-icon').hide();
            $('.footer ul li').eq(0).find('.footer-icon2').show();


            $('.footer ul li').find('.footer-icon').hide();
            $('.footer ul li').find('.footer-icon2').show();

            $('.footer ul li').eq(i).find('.footer-icon').show();
            $('.footer ul li').eq(i).find('.footer-icon2').hide();
        }
    });
});



//除去首页，其他顶部菜单的功能实现

$('.nav li').each(function (i) {
    $('.con').eq(0).show();
    $('.headers').hide();
     $(this).click(function (e) {
         var $this= $(this);
         // $this.addClass('on').siblings().removeClass('on');
         var x= $this.html();
         console.log(x)
         e.preventDefault();
         if(i == 0){
             $('.header').show();
             $('.headers').hide();
             $('.con').eq(0).show();
             $('.con').removeClass('show');
             $('body').css({
                 paddingTop:'0'
             });
         }else {
             $('body').css({
                 paddingTop:'26pt',
                 paddingBottom:'85pt'
             });
             $('.header').hide();
             $('.headers').show();
             //点击跳转之后给第二个headers的菜单赋值
             $('.headers ul li').eq(0).removeClass('on');
             $('.headers ul li').eq(i).addClass('on');
             $('.con').eq(0).hide();
             $('.con').removeClass('show');
             $('.con').eq(i).addClass('show');
         }
     })
});

$('.headers ul li').each(function (i) {
    $('.con').eq(0).show();
    $(this).click(function (e) {
        var $this= $(this);
        e.preventDefault();
        $this.addClass('on').siblings().removeClass('on');
        if(i == 0){
            $('.header').show();
            $('.headers').hide();
            $('.con').eq(0).show();
            $('.con').removeClass('show');
            $('body').css({
                paddingTop:'0',
                paddingBottom:'0'
            });
        }else if(i==3){
            $('body').css({
                paddingTop:'26pt'
            });
            $('.con').eq(0).hide();
            $('.con').removeClass('show');
            $('.con').eq(i).addClass('show');
            $('.dynamicDetail').hide();
            $('.dynamic').show();
        }
        else {
            $('body').css({
                paddingTop:'26pt'
            });
            $('.con').eq(0).hide();
            $('.con').removeClass('show');
            $('.con').eq(i).addClass('show');
            $('.dynamicDetail').hide();
            $('.dynamic').hide();
        }
    })
});


//积分榜底部实现

$('.score-footer ul li').each(function (i) {
    $('.s-con').eq(0).show();
    $('.score-footer ul li').eq(0).find('.footer-icon').show();
    $('.score-footer ul li').eq(0).find('.footer-icon2').hide();
      $(this).click(function () {
          if(i===0){
              $('.s-con').eq(0).show();
              $('.s-con').removeClass('show')
              $('.score-footer ul li').eq(0).find('.footer-icon').show();
              $('.score-footer ul li').eq(0).find('.footer-icon2').hide();
              $('.score-footer ul li').eq(1).find('.footer-icon').hide();
              $('.score-footer ul li').eq(1).find('.footer-icon2').show();
              $('.score-footer ul li').eq(2).find('.footer-icon').hide();
              $('.score-footer ul li').eq(2).find('.footer-icon2').show();
              $('.score-footer ul li').eq(3).find('.footer-icon').hide();
              $('.score-footer ul li').eq(3).find('.footer-icon2').show();
          }else {
              var $this=$(this);
              $('.s-con').eq(0).hide();
              $('.s-con').removeClass('show');
              $('.s-con').eq(i).addClass('show');
              $('.score-footer ul li').eq(0).find('.footer-icon').hide();
              $('.score-footer ul li').eq(0).find('.footer-icon2').show();


              $('.score-footer ul li').find('.footer-icon').hide();
              $('.score-footer ul li').find('.footer-icon2').show();

              $('.score-footer ul li').eq(i).find('.footer-icon').show();
              $('.score-footer ul li').eq(i).find('.footer-icon2').hide();
          }
      })
})

//动态页面的点击事件





/*公共函数开始*/

function tips(text,color) {
    var str='';
    str+='<div id="bigMask" class="common-div">' +
        '<div id="mask"></div>' +
        '<div id="win">' +
        '<h1 class="'+color+'">'+text+'</h1> ' +
        '<div id="confirm">' +
        '<a href="#" class="no">否</a>' +
        '<a href="#" class="yes">是</a>' +
        '</div>' +
        '</div>' +
        '</div>'
    $('#win').css({
        zIndex:'99999'
    });
    $('body').append(str);

    $('.yes').click(function () {
        $('#bigMask').remove();
    });
    $('.no').click(function () {
        $('#bigMask').remove();
    })
}


/*公共函数结束*/





//测试动态同一个页面开始
$(function () {
    $('.dynamic-ul li').click(function () {
        $('.dynamicDetail').show();
        $('.dynamic').hide();
    })
});

function transfer(obj) {
    // var post_id= $(obj).find('p').html();
    // var url=location.href;
    // var trans_url=url+'&posts_id='+post_id;
}

function com(obj) {
    var user_id=$(obj).next().text();
    var competition_id=$(obj).next().next().text();
    var posts_id=$(obj).next().next().next().text();
    var nickname=$('.input-nicknme').val();
    var txt=$('.common-text').val();
    if($.trim(nickname)==''){
        tips('请填写昵称再做评论！','red');
    };
    if($.trim(txt)==''){
        tips('你还没有写评论哦！','red');
    }
    if($.trim(nickname)=='' && $.trim(txt)==''){
        tips('请先填写昵称和评论');
        return false;
    }
    $.ajax({
        url:'http://127.0.0.1/competition/com',
        dataType:'json',
        data:{
            user_id:user_id,
            competition_id:competition_id,
            posts_id:posts_id,
            txt:txt,
            nickname:nickname
        },
        type:'post',
        success:function (res) {
            if(res.errCode && res.errCode==200){
                var str='';
                 var comment=$('.comment');
                str+='<p><span>'+nickname+'</span>: <span>'+txt+'</span></p>';
                comment.append(str);
                $('.common-text').val('');
                $('.input-nicknme').val('')
            }
        },
        error: function (err) {
            console.log(err)
        }
    });
}


//测试动态同一个页面结束







